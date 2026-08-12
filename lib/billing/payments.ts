import "server-only";
import type Stripe from "stripe";
import {
  invoiceSubscriptionId,
  subscriptionPeriodEndUnix,
} from "@/lib/billing/stripe-compat";

/**
 * Payment visibility, read straight from Stripe. The DB mirrors
 * subscription STATE; the money itself — invoices, charges, failures —
 * lives in Stripe alone, and a payments page fed from anywhere else
 * would drift from the truth Ben reconciles against.
 *
 * Every reader degrades to empty rather than throwing: a Stripe outage
 * turns the payments page into "couldn't reach Stripe", not a 500.
 */

export type PaymentRow = {
  id: string;
  createdISO: string;
  amountPence: number;
  status: string; // draft | open | paid | uncollectible | void
  paid: boolean;
  attempted: boolean;
  attemptCount: number;
  nextAttemptISO: string | null;
  customerEmail: string | null;
  customerName: string | null;
  stripeCustomerId: string | null;
  subscriptionId: string | null;
  hostedInvoiceUrl: string | null;
  /** Stripe's PDF receipt for a paid invoice. */
  invoicePdf: string | null;
  /** Pence refunded against this invoice's payment, 0 when none. */
  refundedPence: number;
  /** True while any of that money is still pending on Stripe's side. */
  refundPending: boolean;
  description: string | null;
};

function toRow(inv: Stripe.Invoice): PaymentRow {
  const customer = inv.customer;
  return {
    id: inv.id ?? "",
    createdISO: new Date(inv.created * 1000).toISOString(),
    amountPence: inv.amount_due ?? 0,
    status: inv.status ?? "open",
    paid: Boolean(inv.status === "paid"),
    attempted: Boolean(inv.attempted),
    attemptCount: inv.attempt_count ?? 0,
    nextAttemptISO: inv.next_payment_attempt
      ? new Date(inv.next_payment_attempt * 1000).toISOString()
      : null,
    customerEmail:
      inv.customer_email ??
      (customer && typeof customer === "object" && "email" in customer
        ? (customer.email ?? null)
        : null),
    customerName:
      inv.customer_name ??
      (customer && typeof customer === "object" && "name" in customer
        ? (customer.name ?? null)
        : null),
    stripeCustomerId:
      typeof customer === "string" ? customer : (customer?.id ?? null),
    subscriptionId: invoiceSubscriptionId(inv),
    hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
    invoicePdf: inv.invoice_pdf ?? null,
    refundedPence: 0,
    refundPending: false,
    description: inv.lines?.data?.[0]?.description ?? null,
  };
}

/**
 * True when an invoice belongs to a customer who has since been deleted in
 * Stripe. Such invoices are orphaned history — they should not show in the
 * live payments view or count toward current totals. (A deleted Stripe
 * customer comes back from the expand as `{ deleted: true }`.)
 */
function invoiceCustomerDeleted(inv: Stripe.Invoice): boolean {
  const c = inv.customer;
  return Boolean(c && typeof c === "object" && "deleted" in c && c.deleted);
}

/** Newest invoices across the whole account, for the payments page. */
export async function recentPayments(limit = 60): Promise<PaymentRow[] | null> {
  try {
    const { stripe } = await import("@/lib/stripe");
    const invoices = await stripe().invoices.list({
      limit,
      expand: ["data.customer"],
    });
    return invoices.data
      .filter((inv) => !invoiceCustomerDeleted(inv))
      .map(toRow);
  } catch (e) {
    console.error("[payments] invoice list failed", e);
    return null;
  }
}

/**
 * Every invoice raised in one calendar month, for browsing back through
 * the payments page. Month-scoped at the Stripe API (created gte/lt), so
 * a busy month is complete rather than clipped by a global limit.
 */
export async function paymentsForMonth(
  year: number,
  monthIndex: number,
): Promise<PaymentRow[] | null> {
  try {
    const { stripe } = await import("@/lib/stripe");
    const s = stripe();
    const start = Math.floor(new Date(year, monthIndex, 1).getTime() / 1000);
    const end = Math.floor(new Date(year, monthIndex + 1, 1).getTime() / 1000);
    const rows: PaymentRow[] = [];
    let startingAfter: string | undefined;
    // Five pages of 100 is far beyond any month Ben will have.
    for (let page = 0; page < 5; page++) {
      const invoices = await s.invoices.list({
        limit: 100,
        created: { gte: start, lt: end },
        expand: ["data.customer"],
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      rows.push(
        ...invoices.data
          .filter((inv) => !invoiceCustomerDeleted(inv))
          .map(toRow),
      );
      if (!invoices.has_more) break;
      startingAfter = invoices.data[invoices.data.length - 1]?.id;
    }
    return rows;
  } catch (e) {
    console.error("[payments] month invoice list failed", e);
    return null;
  }
}

/** One client's payment history, for the customer detail page. */
export async function paymentsForCustomer(
  stripeCustomerId: string,
  limit = 24,
): Promise<PaymentRow[] | null> {
  try {
    const { stripe } = await import("@/lib/stripe");
    const s = stripe();
    const [invoices, refunds] = await Promise.all([
      s.invoices.list({
        customer: stripeCustomerId,
        limit,
        expand: ["data.payments"],
      }),
      // Refunds don't live on the invoice, so a refunded payment showed as
      // plain "paid" and the admin couldn't see money had gone back.
      s.refunds.list({ limit: 100 }).catch(() => ({ data: [] })),
    ]);
    const refundedByPi = new Map<string, number>();
    const pendingByPi = new Set<string>();
    for (const r of refunds.data) {
      const pi = typeof r.payment_intent === "string" ? r.payment_intent : r.payment_intent?.id;
      if (pi && r.status !== "failed" && r.status !== "canceled") {
        refundedByPi.set(pi, (refundedByPi.get(pi) ?? 0) + r.amount);
        if (r.status === "pending" || r.status === "requires_action") {
          pendingByPi.add(pi);
        }
      }
    }
    return invoices.data.map((inv) => {
      const row = toRow(inv);
      const pi = invoicePaymentIntentIdOf(inv);
      if (pi) {
        row.refundedPence = refundedByPi.get(pi) ?? 0;
        row.refundPending = pendingByPi.has(pi);
      }
      return row;
    });
  } catch (e) {
    console.error("[payments] customer invoice list failed", e);
    return null;
  }
}

function invoicePaymentIntentIdOf(inv: Stripe.Invoice): string | null {
  const legacy = (inv as unknown as { payment_intent?: string | { id?: string } }).payment_intent;
  if (typeof legacy === "string") return legacy;
  if (legacy && typeof legacy === "object" && typeof legacy.id === "string") return legacy.id;
  const payments = (
    inv as unknown as {
      payments?: { data?: Array<{ payment?: { payment_intent?: string | { id?: string } } }> };
    }
  ).payments;
  for (const p of payments?.data ?? []) {
    const pi = p.payment?.payment_intent;
    if (typeof pi === "string") return pi;
    if (pi && typeof pi === "object" && typeof pi.id === "string") return pi.id;
  }
  return null;
}

/**
 * What this calendar month should finish on: everything already
 * collected plus every active subscription whose next renewal lands
 * before the month ends. An honest forecast, not a hope.
 */
export async function forecastThisMonthPence(
  collectedPence: number,
): Promise<number | null> {
  try {
    const { stripe } = await import("@/lib/stripe");
    const s = stripe();
    const now = new Date();
    const monthEnd =
      new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() / 1000;
    let upcoming = 0;
    const subs = await s.subscriptions.list({ status: "active", limit: 100 });
    for (const sub of subs.data) {
      const end = subscriptionPeriodEndUnix(
        sub as Parameters<typeof subscriptionPeriodEndUnix>[0],
      );
      if (end && end < monthEnd) {
        for (const item of sub.items.data) {
          upcoming += (item.price.unit_amount ?? 0) * (item.quantity ?? 1);
        }
      }
    }
    return collectedPence + upcoming;
  } catch (e) {
    console.error("[payments] forecast failed", e);
    return null;
  }
}

/**
 * Real MRR: the sum of what active and trialing subscriptions actually
 * charge each month. Replaces the hardcoded `paid × £8.99`, which was
 * wrong for every client on £220, £80, or a grandfathered rate.
 */
export async function liveMrrPence(): Promise<number | null> {
  try {
    const { stripe } = await import("@/lib/stripe");
    const s = stripe();
    // The two statuses are independent lists — fetch them concurrently.
    const totals = await Promise.all(
      (["active", "trialing"] as const).map(async (status) => {
        let total = 0;
        let startingAfter: string | undefined;
        // Paginate defensively; at Ben's scale this is one page.
        for (let page = 0; page < 10; page++) {
          const subs = await s.subscriptions.list({
            status,
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {}),
          });
          for (const sub of subs.data) {
            for (const item of sub.items.data) {
              const amount = item.price.unit_amount ?? 0;
              const interval = item.price.recurring?.interval;
              const count = item.price.recurring?.interval_count ?? 1;
              const qty = item.quantity ?? 1;
              if (interval === "month") total += (amount * qty) / count;
              else if (interval === "year") total += (amount * qty) / (12 * count);
              else if (interval === "week") total += (amount * qty * 52) / (12 * count);
            }
          }
          if (!subs.has_more) break;
          startingAfter = subs.data[subs.data.length - 1]?.id;
        }
        return total;
      }),
    );
    return Math.round(totals.reduce((sum, t) => sum + t, 0));
  } catch (e) {
    console.error("[payments] MRR calc failed", e);
    return null;
  }
}
