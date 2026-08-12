import type Stripe from "stripe";

/**
 * Stripe moved several fields in the 2025-03-31 "Basil" API release and the
 * SDK in this repo (v22, API 2026-04-22) ships the new shapes:
 *
 *   - `Subscription.current_period_end` now lives per-item at
 *     `subscription.items.data[n].current_period_end`
 *   - `Invoice.subscription` now lives at
 *     `invoice.parent.subscription_details.subscription`
 *   - `Invoice.charge` / `Invoice.payment_intent` now live under
 *     `invoice.payments.data[n].payment`
 *
 * Webhook payloads follow the API version configured on the webhook
 * endpoint, which may be older than the SDK's — so every reader here
 * accepts BOTH shapes rather than assuming one. Before these helpers the
 * code force-cast the old field names and silently read `undefined`:
 * period ends were written as null, partner commissions never credited,
 * and payment-failed emails never sent.
 */

export function subscriptionPeriodEndUnix(
  sub: Stripe.Subscription,
): number | null {
  const legacy = (sub as unknown as { current_period_end?: number })
    .current_period_end;
  if (typeof legacy === "number") return legacy;
  const ends = (sub.items?.data ?? [])
    .map(
      (item) =>
        (item as unknown as { current_period_end?: number })
          .current_period_end,
    )
    .filter((n): n is number => typeof n === "number");
  return ends.length ? Math.max(...ends) : null;
}

function idOf(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (
    value &&
    typeof value === "object" &&
    typeof (value as { id?: unknown }).id === "string"
  ) {
    return (value as { id: string }).id;
  }
  return null;
}

export function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacy = idOf(
    (invoice as unknown as { subscription?: unknown }).subscription,
  );
  if (legacy) return legacy;
  const parent = (
    invoice as unknown as {
      parent?: { subscription_details?: { subscription?: unknown } };
    }
  ).parent;
  return idOf(parent?.subscription_details?.subscription);
}

/**
 * The payment intent behind an invoice. On the new API this needs the
 * invoice retrieved with `expand: ["payments"]`; on the old API it reads
 * the flat field. Returns null when the invoice has not been paid.
 */
export function invoicePaymentIntentId(invoice: Stripe.Invoice): string | null {
  const legacy = idOf(
    (invoice as unknown as { payment_intent?: unknown }).payment_intent,
  );
  if (legacy) return legacy;
  const payments = (
    invoice as unknown as {
      payments?: {
        data?: Array<{
          payment?: { payment_intent?: unknown; charge?: unknown };
          status?: string;
        }>;
      };
    }
  ).payments;
  for (const p of payments?.data ?? []) {
    const pi = idOf(p.payment?.payment_intent);
    if (pi) return pi;
  }
  return null;
}

/** Legacy charge id, if the API version still carries one. */
export function invoiceChargeId(invoice: Stripe.Invoice): string | null {
  const legacy = idOf((invoice as unknown as { charge?: unknown }).charge);
  if (legacy) return legacy;
  const payments = (
    invoice as unknown as {
      payments?: {
        data?: Array<{ payment?: { charge?: unknown } }>;
      };
    }
  ).payments;
  for (const p of payments?.data ?? []) {
    const ch = idOf(p.payment?.charge);
    if (ch) return ch;
  }
  return null;
}
