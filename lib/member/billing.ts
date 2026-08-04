/**
 * WHAT A MEMBER IS PAYING, IN PLAIN WORDS.
 *
 * The account page had a button that opened Stripe and nothing else — so the
 * answer to "when does this next come out, and how much" was four taps away
 * on somebody else's website. That is the single most common reason anybody
 * opens a billing page, and it was the one thing the billing page would not
 * tell them.
 *
 * Now the facts are on the page and the portal is for changing them. Stripe's
 * Billing Portal cannot be embedded — it sends X-Frame-Options: DENY, and
 * that is not an oversight on their part, it is what stops a hostile page
 * framing somebody's card details. So "in-page" means the reading is here and
 * the writing is there, which is the closest thing to it that is not a
 * reimplementation of Stripe's own screens against their API.
 *
 * NOTHING HERE IS AUTHORED. Every number comes from the live subscription.
 * There is no fallback amount, no example price and no placeholder date: a
 * billing screen that guesses is worse than one that says it does not know,
 * because somebody will budget around it.
 *
 * This file is the shape and the formatting, kept out of the route so it can
 * be tested without a Stripe key.
 */

export type BillingSummary = {
  /** Stripe's own status string, passed through. */
  status: string;
  /** What it is called on the invoice. */
  planName: string | null;
  /** Minor units, as Stripe holds it. Null when there is no recurring price. */
  amount: number | null;
  currency: string | null;
  /** "month" | "year" | … straight from the price. */
  interval: string | null;
  intervalCount: number;
  /** ISO. When the current paid period ends. */
  periodEnd: string | null;
  /** ISO. Set while a trial is running. */
  trialEnd: string | null;
  /** True when it is set to stop at the end of the period. */
  endingAtPeriodEnd: boolean;
  card: { brand: string; last4: string; expMonth: number; expYear: number } | null;
  invoices: {
    id: string;
    date: string;
    amount: number;
    currency: string;
    paid: boolean;
    url: string | null;
  }[];
};

/**
 * "£8.99 a month", from minor units.
 *
 * Minor units because that is how Stripe holds money and converting early is
 * how a rounding error gets into somebody's bill. Zero-decimal currencies
 * (yen, won) do not have minor units at all, which is the case a naive
 * divide-by-100 gets wrong by a factor of a hundred.
 */
const ZERO_DECIMAL = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg",
  "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

export function formatMoney(minor: number, currency: string): string {
  const code = currency.toLowerCase();
  const zero = ZERO_DECIMAL.has(code);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: zero ? 0 : 2,
  }).format(zero ? minor : minor / 100);
}

/** "£8.99 a month", "£90 a year", "£18 every 3 months". */
export function formatRecurring(
  amount: number | null,
  currency: string | null,
  interval: string | null,
  intervalCount = 1,
): string | null {
  if (amount === null || !currency || !interval) return null;
  const money = formatMoney(amount, currency);
  if (intervalCount === 1) return `${money} a ${interval}`;
  return `${money} every ${intervalCount} ${interval}s`;
}

/**
 * The one line at the top of the panel.
 *
 * Deliberately blunt about the awkward states. "Active" over a subscription
 * that is set to stop next week is technically true and practically a lie,
 * and the person it misleads is the one who thought they had cancelled.
 */
export function billingHeadline(s: BillingSummary): string {
  if (s.status === "canceled") return "Cancelled";
  if (s.endingAtPeriodEnd) return "Ends at the end of this period";
  if (s.status === "trialing") return "Free trial";
  if (s.status === "past_due" || s.status === "unpaid") return "Payment failed";
  if (s.status === "incomplete" || s.status === "incomplete_expired") {
    return "Not finished setting up";
  }
  if (s.status === "paused") return "Paused";
  return "Active";
}

/** "5 August 2026". Null in, null out — never today as a stand-in. */
export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(d);
}

/**
 * What to call the next date, given the state.
 *
 * The same timestamp means three different things and the wrong label is the
 * difference between somebody expecting a charge and expecting an ending.
 */
export function nextEventLabel(s: BillingSummary): string {
  if (s.endingAtPeriodEnd || s.status === "canceled") return "Access until";
  if (s.status === "trialing") return "Trial ends";
  return "Next payment";
}

export function nextEventDate(s: BillingSummary): string | null {
  if (s.status === "trialing" && s.trialEnd) return s.trialEnd;
  return s.periodEnd;
}

/** "Visa ending 4242, expires 08/28". */
export function formatCard(card: BillingSummary["card"]): string | null {
  if (!card) return null;
  const brand = card.brand.charAt(0).toUpperCase() + card.brand.slice(1);
  const month = String(card.expMonth).padStart(2, "0");
  return `${brand} ending ${card.last4}, expires ${month}/${String(card.expYear).slice(-2)}`;
}
