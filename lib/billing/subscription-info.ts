import "server-only";
import { subscriptionPeriodEndUnix } from "@/lib/billing/stripe-compat";

/**
 * Live billing facts for one subscription, read straight from Stripe at
 * render time. The DB mirror only carries status and period end; the rate,
 * pause state and payment method live in Stripe alone — showing them from
 * anywhere else would drift.
 *
 * Returns null rather than throwing: a Stripe outage should degrade the
 * admin page to its DB fields, not 500 it.
 */

export type SubscriptionBilling = {
  amountPence: number | null;
  productName: string | null;
  currency: string;
  interval: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  paused: boolean;
  pauseResumesISO: string | null;
  currentPeriodEndISO: string | null;
  paymentMethod: string | null;
};

export async function subscriptionBilling(
  stripeSubscriptionId: string,
): Promise<SubscriptionBilling | null> {
  try {
    const { stripe } = await import("@/lib/stripe");
    const s = stripe();
    const sub = await s.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ["default_payment_method", "items.data.price.product"],
    });
    const item = sub.items.data[0];
    const product = item?.price.product;
    const productName =
      product && typeof product === "object" && "name" in product
        ? // "Suth Performance — 1:1 Coaching" reads better without the brand
          // prefix on screens that are already inside the brand.
          product.name.replace(/^Suth Performance\s*[—·-]\s*/, "")
        : null;
    const pause = sub.pause_collection;
    const periodEnd = subscriptionPeriodEndUnix(sub);

    let paymentMethod: string | null = null;
    const pm = sub.default_payment_method;
    if (pm && typeof pm === "object") {
      if (pm.card) {
        paymentMethod = `${pm.card.brand} •••• ${pm.card.last4}`;
      } else if (pm.type === "bacs_debit" && pm.bacs_debit) {
        paymentMethod = `Direct Debit •••• ${pm.bacs_debit.last4}`;
      } else {
        paymentMethod = pm.type;
      }
    }

    return {
      amountPence: item?.price.unit_amount ?? null,
      productName,
      currency: item?.price.currency ?? "gbp",
      interval: item?.price.recurring?.interval ?? "month",
      status: sub.status,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      paused: Boolean(pause),
      pauseResumesISO: pause?.resumes_at
        ? new Date(pause.resumes_at * 1000).toISOString()
        : null,
      currentPeriodEndISO: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      paymentMethod,
    };
  } catch (e) {
    console.error("[stripe-info] subscription lookup failed", e);
    return null;
  }
}
