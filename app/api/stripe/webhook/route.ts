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
 * All errors that originate from our own DB logic are swallowed and logged
 * so Stripe doesn't retry endlessly; failures get re-emitted as 500 only when
 * signature verification fails.
 */

export const runtime = "nodejs";

export async function POST(req: Request) {
  let secret: string;
  try {
    secret = getStripeWebhookSecret();
  } catch (err) {
    return NextResponse.json(
      { error: "WEBHOOK_NOT_CONFIGURED", detail: String(err) },
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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.client_reference_id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription: session.subscription?.id;

        if (!customerId || !subscriptionId) break;

        const sub = await stripe().subscriptions.retrieve(subscriptionId);

        // The Stripe sub object's properties have shifted across SDK
        // versions. Read what we need defensively.
        const status = sub.status;
        const trialEndUnix = sub.trial_end;
        const periodEndUnix =
          (sub as unknown as { current_period_end?: number }).current_period_end ?? null;

        await admin.from("subscriptions").upsert(
            {
              id: subscriptionId,
              customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              status,
              trial_end: trialEndUnix
                ? new Date(trialEndUnix * 1000).toISOString(): null,
              current_period_end: periodEndUnix
                ? new Date(periodEndUnix * 1000).toISOString(): null,
            },
            { onConflict: "stripe_subscription_id" },
          );

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
        const periodEndUnix =
          (sub as unknown as { current_period_end?: number }).current_period_end ?? null;
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
        const subscriptionId =
          (invoice as unknown as { subscription?: string }).subscription ??
          null;
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
        const subscriptionId =
          (invoice as unknown as { subscription?: string }).subscription ??
          null;
        if (!subscriptionId) break;
        const { data: sub } = await admin.from("subscriptions").select("customer_id").eq("stripe_subscription_id", subscriptionId).maybeSingle();
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
        break;
      }
    }
  } catch (err) {
    // Log and 200, we don't want Stripe retrying past a transient DB blip.
     
    console.error("[stripe/webhook] handler error", err);
  }

  return NextResponse.json({ received: true });
}
