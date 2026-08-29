import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { BillingSummary } from "@/lib/member/billing";

/**
 * WHAT THE SIGNED-IN MEMBER IS PAYING.
 *
 * Read-only. Every write — changing a card, cancelling, updating an address —
 * goes through the Billing Portal, which is Stripe's own screen, kept in step
 * with their rules and their compliance obligations rather than ours. This
 * exists so the answer to "when does this next come out, and how much" is on
 * the page instead of four taps away on somebody else's website.
 *
 * IT ONLY EVER READS THE CALLER'S OWN SUBSCRIPTION. The customer id comes
 * from the session, never from the request, so there is no id to tamper with.
 *
 * EVERY FIELD IS NULLABLE AND MEANS IT. A missing amount renders as nothing,
 * not as a plausible one. A billing screen that guesses is worse than one
 * that admits it does not know, because somebody will budget around it.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const { data: customer } = await admin
    .from("customers")
    .select("stripe_customer_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!customer?.stripe_customer_id) {
    /* Not an error. Plenty of accounts exist before a card does, and the
       panel has an honest empty state for exactly this. */
    return NextResponse.json({ subscription: null, reason: "NO_STRIPE_CUSTOMER" });
  }

  try {
    const client = stripe();
    const subs = await client.subscriptions.list({
      customer: customer.stripe_customer_id,
      status: "all",
      limit: 10,
      expand: ["data.default_payment_method"],
    });

    /* The one that matters, when there is more than one. A cancelled
       subscription alongside a live one must never be the one on screen. */
    const sub = pickCurrent(subs.data);
    if (!sub) {
      return NextResponse.json({ subscription: null, reason: "NO_SUBSCRIPTION" });
    }

    const item = sub.items.data[0];
    const price = item?.price;
    const card = cardFrom(sub.default_payment_method);

    const invoices = await client.invoices.list({
      customer: customer.stripe_customer_id,
      limit: 6,
    });

    const summary: BillingSummary = {
      status: sub.status,
      planName: nameOf(price),
      amount: price?.unit_amount ?? null,
      currency: price?.currency ?? null,
      interval: price?.recurring?.interval ?? null,
      intervalCount: price?.recurring?.interval_count ?? 1,
      periodEnd: toIso(currentPeriodEnd(sub)),
      trialEnd: toIso(sub.trial_end),
      endingAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      card,
      invoices: invoices.data.map((inv) => ({
        id: inv.id ?? "",
        date: toIso(inv.created) ?? "",
        amount: inv.amount_paid ?? inv.amount_due ?? 0,
        currency: inv.currency,
        paid: inv.status === "paid",
        /* Stripe's own hosted receipt. Rendering an invoice ourselves would
           mean reproducing tax lines and credit notes, and getting either
           wrong on a document somebody files is worse than a link out. */
        url: inv.hosted_invoice_url ?? null,
      })),
    };

    return NextResponse.json({ subscription: summary });
  } catch (err) {
    /* Never surface a raw Stripe error: they carry account internals, and
       the member can do nothing with one. */
    console.error("[stripe/subscription] failed", err);
    return NextResponse.json({ error: "BILLING_UNAVAILABLE" }, { status: 502 });
  }
}

/**
 * Which subscription to show.
 *
 * A live one always wins. Somebody who cancelled a plan in March and started
 * another in June has two on the account, and showing the dead one tells them
 * their membership has ended when it has not.
 */
function pickCurrent(subs: Stripe.Subscription[]): Stripe.Subscription | null {
  const live = subs.find((s) =>
    ["active", "trialing", "past_due", "unpaid", "paused"].includes(s.status),
  );
  if (live) return live;
  /* Otherwise the most recent, so a cancelled account still shows when it
     ended rather than showing nothing at all. */
  return [...subs].sort((a, b) => b.created - a.created)[0] ?? null;
}

function nameOf(price: Stripe.Price | undefined): string | null {
  if (!price) return null;
  if (price.nickname) return price.nickname;
  const product = price.product;
  if (typeof product === "object" && product && !("deleted" in product && product.deleted)) {
    return (product as Stripe.Product).name ?? null;
  }
  return null;
}

/**
 * Stripe moved `current_period_end` onto the subscription item, and older API
 * versions have it on the subscription. Reading both means this does not
 * silently start showing "no date" the next time the pinned version moves.
 */
function currentPeriodEnd(sub: Stripe.Subscription): number | null {
  const onItem = sub.items?.data?.[0] as { current_period_end?: number } | undefined;
  const onSub = sub as unknown as { current_period_end?: number };
  return onItem?.current_period_end ?? onSub.current_period_end ?? null;
}

function cardFrom(pm: Stripe.Subscription["default_payment_method"]): BillingSummary["card"] {
  if (!pm || typeof pm === "string") return null;
  const card = pm.card;
  if (!card) return null;
  return {
    brand: card.brand,
    last4: card.last4,
    expMonth: card.exp_month,
    expYear: card.exp_year,
  };
}

/** Stripe deals in seconds. */
function toIso(unix: number | null | undefined): string | null {
  return unix ? new Date(unix * 1000).toISOString() : null;
}
