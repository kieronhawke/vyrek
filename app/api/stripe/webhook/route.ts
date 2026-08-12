import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  stripe,
  getStripeWebhookSecret,
} from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  sendCancellationEmail,
  sendWelcomeEmail,
} from "@/lib/email/send";
import {
  commissionPence,
  tierForActiveCount,
  isInClawbackWindow,
  type Tier,
} from "@/lib/partners/commission";
import { logEvent } from "@/lib/admin/events";
import {
  subscriptionPeriodEndUnix,
  invoiceSubscriptionId,
} from "@/lib/billing/stripe-compat";
import { activateFromSession } from "@/lib/onboarding/activation";

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
        if (!customerId && session.metadata?.flow === "invite") {
          const full = await stripe().checkout.sessions.retrieve(session.id, {
            expand: ["subscription", "customer"],
          });
          const outcome = await activateFromSession(full);
          if (!outcome.ok) {
            console.error(
              `[stripe/webhook] invite activation failed: ${outcome.error}`,
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
          await admin
            .from("subscriptions")
            .update(subRowValues)
            .eq("id", existingSub.id);
        } else {
          const { error: insErr } = await admin.from("subscriptions").insert({
            id: randomUUID(),
            stripe_subscription_id: subscriptionId,
            ...subRowValues,
          });
          if (!insErr) {
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
            programmeName:
              (session.metadata?.programme as string | undefined) ??
              "your",
          }).catch((err) => {
             
            console.error("[stripe/webhook] welcome email failed", err);
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const periodEndUnix = subscriptionPeriodEndUnix(sub);
        await admin.from("subscriptions").update({
            status: sub.status,
            current_period_end: periodEndUnix
              ? new Date(periodEndUnix * 1000).toISOString(): null,
            trial_end: sub.trial_end
              ? new Date(sub.trial_end * 1000).toISOString(): null,
          }).eq("stripe_subscription_id", sub.id);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await admin.from("subscriptions").update({
            status: "canceled",
            cancelled_at: new Date().toISOString(),
          }).eq("stripe_subscription_id", sub.id);

        // Look up the cancelled customer and send a confirmation email.
        const { data: subRow } = await admin.from("subscriptions").select("customer_id").eq("stripe_subscription_id", sub.id).maybeSingle();
        if (subRow?.customer_id) {
          const { data: customer } = await admin.from("customers").select("email").eq("id", subRow.customer_id).maybeSingle();
          if (customer?.email) {
            await sendCancellationEmail({ to: customer.email }).catch(
              (err) => {

                console.error(
                  "[stripe/webhook] cancellation email failed",
                  err,
                );
              },
            );
          }

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
          if (ref) {
            const wasActive = ref.status === "paid";
            const clawback = isInClawbackWindow(ref.first_paid_at)
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

        // Resolve our customer id from the subscription.
        const { data: subRow } = await admin
          .from("subscriptions")
          .select("customer_id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();
        if (!subRow?.customer_id) break;

        // Is this customer referred by a partner?
        const { data: ref } = await admin
          .from("partner_referrals")
          .select(
            "id, partner_id, status, first_paid_at, recurring_earnings_pence",
          )
          .eq("customer_id", subRow.customer_id)
          .maybeSingle();
        if (!ref) break;

        // Pull the partner so we can credit the right tier.
        const { data: partner } = await admin
          .from("partners")
          .select(
            "id, tier, active_subscribers, pending_payout_pence, lifetime_earnings_pence, total_referrals",
          )
          .eq("id", ref.partner_id)
          .maybeSingle();
        if (!partner) break;

        const tier = (partner.tier ?? "starter") as Tier;
        const commission = commissionPence({
          invoiceAmountPence: amountPence,
          tier,
        });

        const isFirstPaid = !ref.first_paid_at;
        const newActive =
          (partner.active_subscribers ?? 0) + (isFirstPaid ? 1 : 0);
        const newTotal =
          (partner.total_referrals ?? 0) + (isFirstPaid ? 1 : 0);
        const promotedTier = tierForActiveCount(newActive);

        await admin
          .from("partner_referrals")
          .update({
            status: "paid",
            first_paid_at: isFirstPaid
              ? new Date().toISOString()
              : ref.first_paid_at,
            recurring_earnings_pence:
              (ref.recurring_earnings_pence ?? 0) + commission,
          })
          .eq("id", ref.id);

        await admin
          .from("partners")
          .update({
            tier: promotedTier,
            active_subscribers: newActive,
            total_referrals: newTotal,
            pending_payout_pence:
              (partner.pending_payout_pence ?? 0) + commission,
            lifetime_earnings_pence:
              (partner.lifetime_earnings_pence ?? 0) + commission,
          })
          .eq("id", partner.id);

        await logEvent({
          actor: "system",
          action: isFirstPaid
            ? "partner.referral.activated"
            : "subscription.activated",
          targetKind: isFirstPaid ? "partner_referral" : "subscription",
          targetId: isFirstPaid ? ref.id : subscriptionId,
          metadata: {
            partnerId: partner.id,
            commission_pence: commission,
            tier: promotedTier,
          },
        });

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoiceSubscriptionId(invoice);
        if (!subscriptionId) break;
        const { data: sub } = await admin.from("subscriptions").select("customer_id, created_at").eq("stripe_subscription_id", subscriptionId).maybeSingle();
        if (!sub) break;
        const { data: customer } = await admin.from("customers").select("email").eq("id", sub.customer_id).maybeSingle();
        if (customer?.email) {
          const { sendPaymentFailedEmail } = await import("@/lib/email/send");
          await sendPaymentFailedEmail({ to: customer.email }).catch((err) => {
            console.error(
              "[stripe/webhook] payment-failed email send failed",
              err,
            );
          });
        }

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
    }
  } catch (err) {
    console.error("[stripe/webhook] handler error", err);
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
