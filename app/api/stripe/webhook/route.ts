import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  stripe,
  getStripeWebhookSecret,
} from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  adminRecipient,
  sendPaymentReceived,
  sendWelcomeEmail,
} from "@/lib/email/send";
import {
  tierForActiveCount,
  isInClawbackWindow,
} from "@/lib/partners/commission";
import { creditCommissionForInvoice } from "@/lib/billing/commission";
import { logEvent } from "@/lib/admin/events";
import {
  subscriptionPeriodEndUnix,
  invoiceSubscriptionId,
} from "@/lib/billing/stripe-compat";
import { activateFromSession } from "@/lib/onboarding/activation";
import { commsFor, type LifecycleEvent } from "@/lib/billing/lifecycle";
import {
  sendCustomerLifecycleEmail,
  sendAdminLifecycleAlert,
} from "@/lib/billing/comms";

/**
 * Who to write to about a subscription, from our own records. Null when
 * the sub was never mirrored (nothing to send is safer than guessing).
 */
async function lifecycleRecipient(
  admin: ReturnType<typeof supabaseAdmin>,
  stripeSubscriptionId: string,
): Promise<{
  email: string;
  firstName: string | null;
  customerRowId: string | null;
} | null> {
  const { data: subRow } = await admin
    .from("subscriptions")
    .select("customer_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();
  if (!subRow?.customer_id) return null;
  const { data: customer } = await admin
    .from("customers")
    .select("id, email, auth_user_id")
    .eq("id", subRow.customer_id)
    .maybeSingle();
  if (!customer?.email) return null;
  let firstName: string | null = null;
  if (customer.auth_user_id) {
    try {
      const { data } = await admin.auth.admin.getUserById(
        customer.auth_user_id as string,
      );
      const full = data?.user?.user_metadata?.full_name;
      if (typeof full === "string" && full.trim()) {
        firstName = full.trim().split(/\s+/)[0];
      }
    } catch {
      /* Name is a nicety. */
    }
  }
  return {
    email: customer.email as string,
    firstName,
    customerRowId: customer.id as string,
  };
}

/** Run the lifecycle engine for one event and send what it decides. */
async function dispatchLifecycle(
  admin: ReturnType<typeof supabaseAdmin>,
  event: LifecycleEvent,
  ctx: {
    stripeSubscriptionId: string;
    periodEndISO?: string | null;
    resumeISO?: string | null;
    attemptCount?: number;
  },
): Promise<void> {
  const comms = commsFor(event);
  if (comms.length === 0) return;
  const recipient = await lifecycleRecipient(admin, ctx.stripeSubscriptionId);
  await Promise.all(
    comms.map((c) => {
      if (c.channel === "customer_email") {
        if (!recipient) return Promise.resolve();
        return sendCustomerLifecycleEmail({
          kind: c.kind,
          to: recipient.email,
          firstName: recipient.firstName,
          periodEndISO: ctx.periodEndISO,
          resumeISO: ctx.resumeISO,
        }).catch((e) =>
          console.error(`[stripe/webhook] ${c.kind} email failed`, e),
        );
      }
      return sendAdminLifecycleAlert({
        kind: c.kind,
        clientEmail: recipient?.email ?? ctx.stripeSubscriptionId,
        clientName: recipient?.firstName,
        customerRowId: recipient?.customerRowId,
        stripeSubscriptionId: ctx.stripeSubscriptionId,
        periodEndISO: ctx.periodEndISO,
        attemptCount: ctx.attemptCount,
      }).catch((e) =>
        console.error(`[stripe/webhook] ${c.kind} admin alert failed`, e),
      );
    }),
  );
}

/**
 * Stripe webhook receiver. The request body MUST be read as raw text for
 * signature verification. Next.js App Router gives us that via req.text(),
 * we just need to avoid touching req.json() upstream.
 *
 * Events handled:
 *   - checkout.session.completed → create subscription row, mark abandoned
 *     plan recovered, send welcome email
 *   - customer.subscription.updated → mirror status + period end
 *   - customer.subscription.deleted → mark canceled, send cancellation email
 *   - customer.subscription.trial_will_end → (logged; emails scheduled at trial start)
 *   - invoice.payment_succeeded → log; first paid invoice is the trial-to-paid moment
 *   - invoice.payment_failed → send payment-failed email
 *
 * A handler failure releases the idempotency claim and returns 500 so
 * Stripe retries with backoff; signature failures return 400 and are never
 * retried.
 */

export const runtime = "nodejs";

export async function POST(req: Request) {
  let secret: string;
  try {
    secret = getStripeWebhookSecret();
  } catch (err) {
    console.error("[stripe/webhook] secret missing", err);
    return NextResponse.json(
      { error: "WEBHOOK_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { error: "NO_SIGNATURE" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
     
    console.error("[stripe/webhook] signature verification failed", err);
    return NextResponse.json(
      { error: "INVALID_SIGNATURE" },
      { status: 400 },
    );
  }

  const admin = supabaseAdmin();

  // Idempotency: claim the event id before processing; a duplicate claim
  // (Stripe retry, dashboard replay) acks the delivery and skips side
  // effects. Pre-fix, `invoice.payment_succeeded` would double-credit the
  // partner ledger on every retry. The claim is RELEASED if the handler
  // throws, so a genuinely failed delivery can be retried rather than
  // being permanently marked as processed by a row written up front.
  let claimed = false;
  {
    const { data: dedup, error: dedupErr } = await admin
      .from("stripe_events")
      .insert({ event_id: event.id, event_type: event.type })
      .select("event_id")
      .maybeSingle();
    if (dedupErr) {
      const code = (dedupErr as { code?: string }).code;
      if (code === "23505") {
        console.info(
          `[stripe/webhook] duplicate event ${event.id} (${event.type}), skipping`,
        );
        return NextResponse.json({ received: true, deduped: true });
      }
      // If the dedupe table is missing (migration not applied), don't
      // block the funnel; log and continue. The webhook handler is still
      // safer than no-handler.
      if (code === "42P01") {
        console.warn(
          "[stripe/webhook] stripe_events table missing; idempotency disabled until 0006 is applied",
        );
      } else {
        console.error("[stripe/webhook] dedupe insert failed", dedupErr);
      }
    } else {
      claimed = true;
    }
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.client_reference_id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription: session.subscription?.id;

        // Invite-funnel sessions carry no client_reference_id — the person
        // has no customers row yet, creating it IS the job. Activation is
        // idempotent with the welcome page's own call, so whichever fires
        // second finds the work already done. This is the path that saves
        // the client who pays and then closes the tab on Stripe's receipt
        // page: before it, they had paid and no account existed.
        //
        // Activation also notifies: notifyAdminNewSubscription emails every
        // admin, texts Ben and writes the activity feed, only when it really
        // inserted the row. origin/main added a second notifier here
        // (notifyClientStarted) for the same moment; it is deliberately NOT
        // called, because two "new client" emails for one client is a worse
        // failure than the none it was written to fix.
        if (!customerId && session.metadata?.flow === "invite") {
          const full = await stripe().checkout.sessions.retrieve(session.id, {
            expand: ["subscription", "customer"],
          });
          const outcome = await activateFromSession(full);
          if (!outcome.ok) {
            // The client's card was charged. Throwing releases the
            // idempotency claim and returns 500 so Stripe redelivers and a
            // later attempt completes the account, instead of ACKing a
            // paid-but-empty state that never retries.
            throw new Error(
              `invite activation failed: ${outcome.error ?? "unknown"}`,
            );
          }
          break;
        }

        if (!customerId || !subscriptionId) break;

        const sub = await stripe().subscriptions.retrieve(subscriptionId);

        const status = sub.status;
        const trialEndUnix = sub.trial_end;
        const periodEndUnix = subscriptionPeriodEndUnix(sub);

        // subscriptions.id is a uuid with no default. The Stripe sub id
        // ("sub_...") is not a uuid — writing it there made Postgres
        // reject the row and the error was swallowed, so self-serve
        // subscriptions silently never persisted. Look up, then
        // insert-with-minted-uuid or update.
        const { data: existingSub } = await admin
          .from("subscriptions")
          .select("id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();
        const subRowValues = {
          customer_id: customerId,
          status,
          trial_end: trialEndUnix
            ? new Date(trialEndUnix * 1000).toISOString(): null,
          current_period_end: periodEndUnix
            ? new Date(periodEndUnix * 1000).toISOString(): null,
        };
        if (existingSub?.id) {
          const { error: updErr } = await admin
            .from("subscriptions")
            .update(subRowValues)
            .eq("id", existingSub.id);
          // A dropped mirror write means the DB and Stripe disagree about a
          // live subscription. Throw so the retry reconciles it.
          if (updErr) throw new Error(`sub mirror update failed: ${updErr.message}`);
        } else {
          const { error: insErr } = await admin.from("subscriptions").insert({
            id: randomUUID(),
            stripe_subscription_id: subscriptionId,
            ...subRowValues,
          });
          if (insErr) throw new Error(`sub mirror insert failed: ${insErr.message}`);
          {
            // New money via the website funnel — same admin alert the
            // invite funnel sends, deduped by the insert itself.
            const { data: cust } = await admin
              .from("customers")
              .select("email")
              .eq("id", customerId)
              .maybeSingle();
            const { notifyAdminNewSubscription } = await import(
              "@/lib/billing/notify"
            );
            void notifyAdminNewSubscription({
              clientName: String(session.metadata?.client_name ?? ""),
              email: cust?.email ?? "",
              customerRowId: customerId,
              stripeSubscriptionId: subscriptionId,
              amountPence: sub.items?.data?.[0]?.price?.unit_amount ?? null,
              planName: null,
              source: "website sign-up",
            }).catch(() => {});
          }
        }

        // Mark any open abandoned-plan record recovered.
        await admin.from("abandoned_plans").update({ recovered_at: new Date().toISOString() }).eq("customer_id", customerId).is("recovered_at", null);

        await logEvent({
          actor: "system",
          action: "subscription.trial_started",
          targetKind: "subscription",
          targetId: subscriptionId,
          metadata: { customerId, status },
        });

        // Send welcome email
        const { data: customer } = await admin.from("customers").select("email").eq("id", customerId).maybeSingle();
        if (customer?.email) {
          await sendWelcomeEmail({
            to: customer.email,
            trialEndsAt: trialEndUnix ? new Date(trialEndUnix * 1000): null,
            // The template reads "your {programmeName} programme" — an empty
            // or "your" fallback produced "your your programme". "training"
            // reads correctly: "your training programme".
            programmeName:
              (session.metadata?.programme as string | undefined)?.trim() ||
              "training",
          }).catch((err) => {
             
            console.error("[stripe/webhook] welcome email failed", err);
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const periodEndUnix = subscriptionPeriodEndUnix(sub);
        const periodEndISO = periodEndUnix
          ? new Date(periodEndUnix * 1000).toISOString()
          : null;
        await admin.from("subscriptions").update({
            status: sub.status,
            current_period_end: periodEndISO,
            trial_end: sub.trial_end
              ? new Date(sub.trial_end * 1000).toISOString(): null,
          }).eq("stripe_subscription_id", sub.id);

        // Stripe's previous_attributes carries exactly the fields that
        // changed, which is what tells a cancellation-being-scheduled
        // apart from a routine renewal touching the same object.
        const prevAttrs =
          (event.data as { previous_attributes?: Record<string, unknown> })
            .previous_attributes ?? {};
        const lifecycleEvent: LifecycleEvent = {
          type: "subscription.updated",
          prevCancelAtPeriodEnd:
            "cancel_at_period_end" in prevAttrs
              ? Boolean(prevAttrs.cancel_at_period_end)
              : undefined,
          prevPaused:
            "pause_collection" in prevAttrs
              ? Boolean(prevAttrs.pause_collection)
              : undefined,
          next: {
            status: sub.status,
            cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
            paused: Boolean(sub.pause_collection),
          },
        };
        await dispatchLifecycle(admin, lifecycleEvent, {
          stripeSubscriptionId: sub.id,
          periodEndISO,
          resumeISO: sub.pause_collection?.resumes_at
            ? new Date(sub.pause_collection.resumes_at * 1000).toISOString()
            : null,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await admin.from("subscriptions").update({
            status: "canceled",
            cancelled_at: new Date().toISOString(),
          }).eq("stripe_subscription_id", sub.id);

        // The goodbye note to the customer, plus the admin's heads-up,
        // both decided by the lifecycle engine.
        await dispatchLifecycle(
          admin,
          { type: "subscription.deleted" },
          { stripeSubscriptionId: sub.id },
        );

        const { data: subRow } = await admin.from("subscriptions").select("customer_id").eq("stripe_subscription_id", sub.id).maybeSingle();
        if (subRow?.customer_id) {
          await logEvent({
            actor: "system",
            action: "subscription.cancelled",
            targetKind: "subscription",
            targetId: sub.id,
            metadata: { customerId: subRow.customer_id, source: "stripe" },
          });

          // Partner attribution: flip referral to cancelled. If inside the
          // 30-day clawback window, reverse the accrued commission.
          const { data: ref } = await admin
            .from("partner_referrals")
            .select(
              "id, partner_id, status, first_paid_at, recurring_earnings_pence",
            )
            .eq("customer_id", subRow.customer_id)
            .maybeSingle();
          // Already processed (a redelivered cancellation): the referral is in
          // a terminal state, so there's nothing to flip or claw back. Skipping
          // keeps it idempotent and stops a retry downgrading clawed_back to
          // cancelled.
          const alreadyTerminal =
            ref?.status === "cancelled" || ref?.status === "clawed_back";
          if (ref && !alreadyTerminal) {
            // Only a still-"paid" referral can be clawed back. Gating on this
            // makes a redelivered cancellation idempotent: once the status has
            // moved to clawed_back/cancelled, a retry computes clawback 0 and
            // can't subtract the commission from the partner a second time.
            const wasActive = ref.status === "paid";
            const clawback =
              wasActive && isInClawbackWindow(ref.first_paid_at)
                ? ref.recurring_earnings_pence ?? 0
                : 0;
            const newStatus = clawback > 0 ? "clawed_back" : "cancelled";

            await admin
              .from("partner_referrals")
              .update({
                status: newStatus,
                cancelled_at: new Date().toISOString(),
              })
              .eq("id", ref.id);

            if (ref.partner_id) {
              const { data: partner } = await admin
                .from("partners")
                .select(
                  "id, active_subscribers, pending_payout_pence, lifetime_earnings_pence",
                )
                .eq("id", ref.partner_id)
                .maybeSingle();
              if (partner) {
                const newActive = Math.max(
                  0,
                  (partner.active_subscribers ?? 0) - (wasActive ? 1 : 0),
                );
                await admin
                  .from("partners")
                  .update({
                    tier: tierForActiveCount(newActive),
                    active_subscribers: newActive,
                    pending_payout_pence: Math.max(
                      0,
                      (partner.pending_payout_pence ?? 0) - clawback,
                    ),
                    lifetime_earnings_pence: Math.max(
                      0,
                      (partner.lifetime_earnings_pence ?? 0) - clawback,
                    ),
                  })
                  .eq("id", partner.id);
              }
            }
          }
        }
        break;
      }

      case "customer.subscription.trial_will_end": {
        // Stripe fires 3 days before trial end. Our day-5 / day-6 reminder
        // emails are scheduled at trial start instead; this case is here for
        // observability only.
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoiceSubscriptionId(invoice);
        const amountPence = invoice.amount_paid ?? 0;
        if (!subscriptionId || amountPence <= 0) break;

        /*
         * The receipt, before the partner accounting.
         *
         * The commission handling below exits early for anybody not referred
         * by a partner — which is most people. So a payment from an ordinary
         * client used to pass through this handler and produce nothing at all.
         * Notifying first means the common case is the one that works.
         */
        await notifyPaymentReceived(invoice).catch((err) => {
          console.error("[stripe/webhook] payment email failed", err);
        });

        // A success on a retry closes the loop the failure email opened.
        await dispatchLifecycle(
          admin,
          {
            type: "invoice.payment_succeeded",
            attemptCount: invoice.attempt_count ?? 1,
          },
          { stripeSubscriptionId: subscriptionId },
        );

        // Partner commission — one shared, idempotent path (also used by the
        // reconciliation cron). credited/skip/log all live in the helper.
        const result = await creditCommissionForInvoice(admin, invoice);
        if (!result.credited && result.reason === "rpc-missing") {
          // Migration 0121 not applied yet: don't wedge the funnel (the same
          // tolerance stripe_events gets); reconciliation backfills later.
          console.error("[stripe/webhook] credit_partner_commission missing — apply 0121");
          void import("@/lib/observability").then(({ reportError }) =>
            reportError(new Error("commission RPC missing (0121)"), {
              where: "stripe/webhook",
            }),
          );
        }
        // Any real DB error throws inside the helper → outer catch → Stripe
        // retries rather than losing the commission silently.

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoiceSubscriptionId(invoice);
        if (!subscriptionId) break;
        const { data: sub } = await admin.from("subscriptions").select("customer_id, created_at").eq("stripe_subscription_id", subscriptionId).maybeSingle();
        if (!sub) break;

        // Customer gets the fix-it note, admin gets the who-to-watch note.
        await dispatchLifecycle(
          admin,
          {
            type: "invoice.payment_failed",
            attemptCount: invoice.attempt_count ?? 1,
            hasNextAttempt: Boolean(invoice.next_payment_attempt),
          },
          {
            stripeSubscriptionId: subscriptionId,
            attemptCount: invoice.attempt_count ?? 1,
          },
        );

        // Stage 12 (PART 11.10) — Manual review queue trigger.
        //
        // If the payment fails within 7 days of the subscription being
        // created, this is a high-risk signal: stolen card, payment-method
        // fraud, or a partner-referral abuse pattern (sign up with bad card,
        // claim commission, intentionally fail first invoice). Log a
        // high-priority admin event for human review.
        try {
          const createdAtRaw = (sub as unknown as { created_at?: string })
            .created_at;
          if (createdAtRaw) {
            const ageMs = Date.now() - new Date(createdAtRaw).getTime();
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
            if (ageMs <= sevenDaysMs) {
              const { logEvent } = await import("@/lib/admin/events");
              await logEvent({
                actor: "stripe-webhook",
                action: "subscription.early_payment_failure",
                targetKind: "subscription",
                targetId: subscriptionId,
                metadata: {
                  severity: "high",
                  needs_review: true,
                  customer_id: sub.customer_id,
                  age_hours: Math.round(ageMs / 3_600_000),
                  invoice_id: invoice.id,
                  amount_due: invoice.amount_due,
                  attempt_count: invoice.attempt_count ?? 1,
                },
              }).catch(() => {});
            }
          }
        } catch (err) {
          console.error(
            "[stripe/webhook] manual-review queue insert failed",
            err,
          );
        }
        break;
      }

      case "refund.updated":
      case "refund.failed": {
        // A refund can bounce days after Stripe accepted it (closed account,
        // expired card). The client was already told money is coming back,
        // so a silent failure here is the worst outcome — the admin must
        // hear about it and retry from Stripe.
        const refund = event.data.object as Stripe.Refund;
        if (refund.status !== "failed") break;
        const subscriptionId = refund.metadata?.stripe_subscription_id ?? null;
        let clientEmail = "unknown client";
        let clientName: string | null = null;
        let customerRowId: string | null = null;
        if (subscriptionId) {
          const { data: subRow } = await admin
            .from("subscriptions")
            .select("customer_id")
            .eq("stripe_subscription_id", subscriptionId)
            .maybeSingle();
          if (subRow?.customer_id) {
            const { data: customer } = await admin
              .from("customers")
              .select("id, email, full_name")
              .eq("id", subRow.customer_id)
              .maybeSingle();
            if (customer) {
              customerRowId = customer.id;
              clientEmail = customer.email ?? clientEmail;
              clientName =
                (customer as { full_name?: string | null }).full_name ?? null;
            }
          }
        }
        const { sendAdminLifecycleAlert } = await import("@/lib/billing/comms");
        await sendAdminLifecycleAlert({
          kind: "refund_failed",
          clientEmail,
          clientName,
          customerRowId,
          stripeSubscriptionId: subscriptionId,
        });
        const { logEvent } = await import("@/lib/admin/events");
        await logEvent({
          actor: "stripe-webhook",
          action: "subscription.cancelled",
          targetKind: "subscription",
          targetId: subscriptionId ?? refund.id,
          metadata: {
            event: "refund_failed",
            refundId: refund.id,
            amount_pence: refund.amount,
            failure_reason:
              (refund as { failure_reason?: string }).failure_reason ?? null,
          },
        }).catch(() => {});
        break;
      }
    }
  } catch (err) {
    console.error("[stripe/webhook] handler error", err);
    // A paid event we failed to process. Stripe will retry, but someone
    // should know it happened rather than finding out from the client.
    void import("@/lib/observability").then(({ reportError }) =>
      reportError(err, { where: "stripe/webhook", eventType: event.type, eventId: event.id }),
    );
    // Release the idempotency claim so Stripe's retry gets a clean run —
    // a claim written up front and kept on failure would dedupe the retry
    // away and the event would be lost for good.
    if (claimed) {
      await admin
        .from("stripe_events")
        .delete()
        .eq("event_id", event.id)
        .then(undefined, () => {});
    }
    // Non-200 so Stripe retries with backoff; transient DB blips recover
    // on a later attempt instead of being swallowed.
    return NextResponse.json({ error: "HANDLER_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/* ── Telling Ben ─────────────────────────────────────────────────────────
   Both of these read only what Stripe sent, so neither depends on a database
   row existing. That is deliberate: the flow Ben uses most — his own setup
   link — has no Supabase session to attach at checkout, and a notification
   that only fires for the self-serve funnel is a notification that misses the
   clients he actually onboards.

   Both swallow their own failures at the call site. An email that will not
   send must never make Stripe retry a webhook it already delivered. */

/** "£150", "£149.50", or null. Never "£0.00" standing in for "unknown". */
function money(minor: number | null | undefined, currency: string | null | undefined): string | null {
  if (minor === null || minor === undefined || !Number.isFinite(minor)) return null;
  if (minor <= 0) return null;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: (currency ?? "gbp").toUpperCase(),
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

function onDate(unix: number | null | undefined): string {
  const d = unix ? new Date(unix * 1000) : new Date();
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(d);
}

async function notifyPaymentReceived(invoice: Stripe.Invoice) {
  const to = adminRecipient();
  if (!to) return;

  const line = invoice.lines?.data?.[0];
  /* `subscription_details.metadata` carries what the subscription was created
     with, and it moved between SDK versions — read defensively rather than
     losing the client name every time the pin moves. */
  const subMeta =
    (invoice as unknown as { subscription_details?: { metadata?: Record<string, string> } })
      .subscription_details?.metadata ?? {};
  const meta = { ...subMeta, ...(invoice.metadata ?? {}) };

  await sendPaymentReceived({
    to,
    name:
      (meta.client_name as string | undefined)?.trim() ||
      invoice.customer_name?.trim() ||
      invoice.customer_email?.trim() ||
      "A client",
    amount: money(invoice.amount_paid, invoice.currency),
    planName: line?.description ?? (meta.plan as string | undefined) ?? null,
    agreed: Boolean(meta.agreed_price_pence),
    paidOn: onDate(invoice.created),
    invoiceUrl: invoice.hosted_invoice_url ?? null,
    /* billing_reason distinguishes the first invoice from every renewal, and
       the first one is the only one worth reading twice. */
    first: invoice.billing_reason === "subscription_create",
  });
}
