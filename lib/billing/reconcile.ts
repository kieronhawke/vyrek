import "server-only";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { subscriptionPeriodEndUnix } from "@/lib/billing/stripe-compat";
import { creditCommissionForInvoice } from "@/lib/billing/commission";

/**
 * THE SAFETY NET UNDER STRIPE'S RETRIES.
 *
 * The webhook is the primary path, but Stripe only retries a failing event for
 * about three days. After that a permanently-failed event is gone, and the
 * subscriptions mirror + partner ledger drift from Stripe with nothing to heal
 * them. This sweep re-derives both from Stripe on a schedule:
 *
 *   1. Subscription status: for every subscription Stripe knows about, make our
 *      mirror row's status + period-end match. This is what the cancellation /
 *      renewal webhooks write; if one was missed, this repairs it.
 *   2. Commission backfill: re-run the idempotent commission credit over recent
 *      paid invoices. Already-credited invoices are no-ops (keyed on invoice
 *      id), so this only ever fills gaps a missed webhook left.
 *
 * Everything is best-effort and bounded; a Stripe or DB blip on one item is
 * logged and the sweep carries on.
 */

export type ReconcileResult = {
  ok: boolean;
  subscriptionsChecked: number;
  subscriptionsUpdated: number;
  invoicesChecked: number;
  commissionsBackfilled: number;
  errors: number;
};

const MIRRORABLE = new Set([
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
  "incomplete",
  "incomplete_expired",
]);

export async function reconcileBilling(): Promise<ReconcileResult> {
  const res: ReconcileResult = {
    ok: true,
    subscriptionsChecked: 0,
    subscriptionsUpdated: 0,
    invoicesChecked: 0,
    commissionsBackfilled: 0,
    errors: 0,
  };

  const { stripe } = await import("@/lib/stripe");
  const s = stripe();
  const admin = supabaseAdmin();

  /* 1 — subscription status mirror */
  try {
    let startingAfter: string | undefined;
    for (let page = 0; page < 20; page++) {
      const subs = await s.subscriptions.list({
        status: "all",
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const sub of subs.data) {
        res.subscriptionsChecked++;
        try {
          if (await reconcileOneSubscription(admin, sub)) res.subscriptionsUpdated++;
        } catch (e) {
          res.errors++;
          console.error("[reconcile] subscription failed", sub.id, e);
        }
      }
      if (!subs.has_more) break;
      startingAfter = subs.data[subs.data.length - 1]?.id;
    }
  } catch (e) {
    res.ok = false;
    res.errors++;
    console.error("[reconcile] subscription sweep failed", e);
  }

  /* 2 — commission backfill over the last ~40 days of paid invoices */
  try {
    const since = Math.floor(Date.now() / 1000) - 40 * 24 * 60 * 60;
    let startingAfter: string | undefined;
    for (let page = 0; page < 20; page++) {
      const invoices = await s.invoices.list({
        status: "paid",
        created: { gte: since },
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const inv of invoices.data) {
        res.invoicesChecked++;
        try {
          const r = await creditCommissionForInvoice(admin, inv);
          if (r.credited) res.commissionsBackfilled++;
        } catch (e) {
          res.errors++;
          console.error("[reconcile] commission backfill failed", inv.id, e);
        }
      }
      if (!invoices.has_more) break;
      startingAfter = invoices.data[invoices.data.length - 1]?.id;
    }
  } catch (e) {
    res.ok = false;
    res.errors++;
    console.error("[reconcile] invoice sweep failed", e);
  }

  return res;
}

/** Update the mirror row for one subscription if Stripe's state has drifted. */
async function reconcileOneSubscription(
  admin: ReturnType<typeof supabaseAdmin>,
  sub: Stripe.Subscription,
): Promise<boolean> {
  const status = sub.status;
  if (!MIRRORABLE.has(status)) return false;

  const { data: row } = await admin
    .from("subscriptions")
    .select("id, status, current_period_end")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  // Only reconcile rows we already know about; the webhook/activation own
  // creation, and inventing rows here could resurrect a deliberately removed one.
  if (!row) return false;

  const endUnix = subscriptionPeriodEndUnix(
    sub as Parameters<typeof subscriptionPeriodEndUnix>[0],
  );
  const periodEndISO = endUnix ? new Date(endUnix * 1000).toISOString() : null;

  const patch: Record<string, unknown> = {};
  if (row.status !== status) patch.status = status;
  if (
    endUnix &&
    periodEndISO &&
    (!row.current_period_end ||
      new Date(row.current_period_end).getTime() !== endUnix * 1000)
  ) {
    patch.current_period_end = periodEndISO;
  }
  if (Object.keys(patch).length === 0) return false;

  const { error } = await admin
    .from("subscriptions")
    .update(patch)
    .eq("stripe_subscription_id", sub.id);
  if (error) throw error;
  return true;
}
