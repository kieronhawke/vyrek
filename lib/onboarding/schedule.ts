import { displayPrice, parsePrice } from "./model";
import {
  billingAnchorUnix,
  formatStartDate,
  formatStartDateShort,
} from "./start-date";

/**
 * WHAT THE CARD IS CHARGED, AND WHEN.
 *
 * An existing client's arrangement with Ben has two numbers in it, not one:
 * what they owe him TODAY — a month in arrears, a block he coached before the
 * card existed — and what they pay from now on. The invite used to carry only
 * the second. This module puts both on one line and works out, from the pair
 * plus the start date, exactly what the checkout takes and what every screen,
 * email and text should say about it.
 *
 * ── THE THREE SHAPES, MEASURED AGAINST STRIPE ────────────────────────────
 * Stripe Checkout will not combine a one-off amount with a future
 * `billing_cycle_anchor` and no proration: "You cannot set proration_behavior
 * to none in a Checkout Session with one-time prices." Measured on the test
 * API on 5 September 2026, not read in the docs. So the checkout route picks a
 * shape from the schedule rather than one call with optional fields:
 *
 *   subscription               nothing owed today. The existing path: one
 *                              recurring line, anchored to the date if there
 *                              is one. Unchanged.
 *
 *   subscription-with-balance  owed today AND billing starts today. One
 *                              subscription checkout with the balance as a
 *                              second, one-off line. Stripe raises a single
 *                              invoice for balance + first month and the
 *                              monthly cycle runs from now. Measured: £100 +
 *                              £60 → £160 paid, £60 next month.
 *
 *   balance-then-subscription  owed today AND billing starts later. A
 *                              PAYMENT checkout takes the balance now and
 *                              saves the card; when it completes, the server
 *                              creates the subscription itself with the
 *                              anchor and `proration_behavior: "none"`, which
 *                              the Subscriptions API does allow. Measured:
 *                              £100 paid, no invoice today, £60 on the date.
 *
 * Every shape is one card entry for the client. None of them says "trial".
 *
 * ── ONE PLACE FOR THE SENTENCES ─────────────────────────────────────────
 * The pay screen, the welcome page, the invite email, the text message, the
 * "you're in" email and Ben's review panel all describe the same schedule.
 * They used to each assemble it from `amount` and `startsOn`, which is how the
 * welcome page came to say "nothing has been taken" to somebody who had just
 * paid £100. The words are built here, once, from the same numbers the
 * checkout charges.
 */

/**
 * The band for a balance owed today, in pence.
 *
 * Wider than the monthly rate's ceiling, because arrears can span months.
 * £1 to £10,000: a guard against the extra digit, not a policy.
 */
export const DUE_TODAY_MIN_PENCE = 100;
export const DUE_TODAY_MAX_PENCE = 1_000_000;

/**
 * Read a balance Ben typed. Blank, "0" and "£0" mean nothing is owed and
 * return 0; a figure returns pence; anything unreadable or out of band
 * returns null so the form can say so rather than quietly dropping it.
 */
export function parseDueToday(input: string): number | null {
  const text = (input ?? "").trim().replace(/[£\s,]/g, "");
  if (!text) return 0;
  if (/^0+(\.0{1,2})?$/.test(text)) return 0;
  // parsePrice enforces the MONTHLY band; the balance has its own.
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const pence = Math.round(Number(text) * 100);
  if (!Number.isFinite(pence)) return null;
  if (pence < DUE_TODAY_MIN_PENCE || pence > DUE_TODAY_MAX_PENCE) return null;
  return pence;
}

/**
 * A balance that could plausibly be real: whole pence inside the band. Zero
 * is NOT valid here — "nothing owed" is expressed by the field being absent,
 * so a link that carries no balance is exactly the length it was before.
 */
export function validDueTodayPence(value: unknown): boolean {
  const n = Number(value);
  return (
    Number.isInteger(n) && n >= DUE_TODAY_MIN_PENCE && n <= DUE_TODAY_MAX_PENCE
  );
}

export type CheckoutShape =
  | "subscription"
  | "subscription-with-balance"
  | "balance-then-subscription";

export type ScheduleInput = {
  /** The monthly rate, in pence. */
  amountPence: number;
  /** The balance owed today, in pence. Absent or 0 for none. */
  dueTodayPence?: number | null;
  /** The first monthly collection, as a day number. Absent for today. */
  startDay?: number | null;
};

export type PaymentSchedule = {
  monthlyPence: number;
  /** 0 when nothing is owed. */
  dueTodayPence: number;
  /** True when the first monthly collection is on a future date. */
  deferred: boolean;
  /** That date, when deferred. Null means the monthly cycle starts today. */
  startDay: number | null;
  /** What the card is actually charged at checkout. */
  todayPence: number;
  shape: CheckoutShape;
};

/**
 * Resolve an invite's numbers into one schedule, as of `now`.
 *
 * `now` matters: a start date the link was built with can pass while the
 * text sits unopened, and the honest schedule then charges the first month
 * today rather than promising a date that has gone. The same rule as
 * `billingAnchorUnix`, because it IS `billingAnchorUnix`.
 */
export function paymentSchedule(
  input: ScheduleInput,
  now = Date.now(),
): PaymentSchedule {
  const monthlyPence = input.amountPence;
  const dueTodayPence = validDueTodayPence(input.dueTodayPence)
    ? Number(input.dueTodayPence)
    : 0;
  const deferred = billingAnchorUnix(input.startDay ?? null, now) !== null;
  const startDay = deferred ? (input.startDay as number) : null;
  const todayPence = dueTodayPence + (deferred ? 0 : monthlyPence);
  const shape: CheckoutShape =
    dueTodayPence === 0
      ? "subscription"
      : deferred
        ? "balance-then-subscription"
        : "subscription-with-balance";
  return { monthlyPence, dueTodayPence, deferred, startDay, todayPence, shape };
}

/**
 * Two sentences: what happens today, and what happens after.
 *
 * Written for the person paying, in the second person. Every screen that
 * mentions money renders both; the email panel renders `scheduleRows`.
 */
export function scheduleLines(s: PaymentSchedule): { today: string; monthly: string } {
  const monthly = displayPrice(s.monthlyPence);
  const from = s.startDay !== null ? formatStartDate(s.startDay) : null;

  if (s.dueTodayPence > 0 && s.deferred) {
    return {
      today: `${displayPrice(s.dueTodayPence)} today, for your outstanding balance.`,
      monthly: `Then ${monthly} a month from ${from}, on the same day each month.`,
    };
  }
  if (s.dueTodayPence > 0) {
    return {
      today: `${displayPrice(s.todayPence)} today: ${displayPrice(
        s.dueTodayPence,
      )} outstanding balance plus ${monthly} for your first month.`,
      monthly: `Then ${monthly} a month, on the same day each month.`,
    };
  }
  if (s.deferred) {
    return {
      today: "Nothing today.",
      monthly: `Your first payment of ${monthly} is on ${from}, then the same day each month.`,
    };
  }
  return {
    today: `${monthly} today.`,
    monthly: `Then ${monthly} a month, on the same day each month.`,
  };
}

/** The same schedule as label/value rows for an email panel or a review table. */
export function scheduleRows(s: PaymentSchedule): { label: string; value: string }[] {
  const monthly = `${displayPrice(s.monthlyPence)} a month`;
  const rows: { label: string; value: string }[] = [];
  if (s.dueTodayPence > 0 && s.deferred) {
    rows.push({ label: "Today", value: `${displayPrice(s.dueTodayPence)} (outstanding balance)` });
    rows.push({ label: `From ${formatStartDate(s.startDay!)}`, value: monthly });
  } else if (s.dueTodayPence > 0) {
    rows.push({
      label: "Today",
      value: `${displayPrice(s.todayPence)} (${displayPrice(
        s.dueTodayPence,
      )} outstanding balance + first month)`,
    });
    rows.push({ label: "Then", value: monthly });
  } else if (s.deferred) {
    rows.push({ label: "Today", value: "Nothing" });
    rows.push({ label: `From ${formatStartDate(s.startDay!)}`, value: monthly });
  } else {
    rows.push({ label: "Today", value: displayPrice(s.monthlyPence) });
    rows.push({ label: "Then", value: monthly });
  }
  return rows;
}

/**
 * The schedule for a text message, where every character is billed.
 *
 * "£100 today, then £60/mo from 1 Oct". Plain GSM-7 — no curly quotes, no
 * dashes that are not hyphens — so a segment stays 160 characters.
 * lib/onboarding/invite-cost.test.ts holds the one-segment line.
 */
export function scheduleSms(s: PaymentSchedule): string {
  const monthly = `${displayPrice(s.monthlyPence)}/mo`;
  const from = s.startDay !== null ? ` from ${formatStartDateShort(s.startDay)}` : "";
  if (s.dueTodayPence > 0 && s.deferred) {
    return `${displayPrice(s.dueTodayPence)} today, then ${monthly}${from}`;
  }
  if (s.dueTodayPence > 0) {
    return `${displayPrice(s.todayPence)} today (incl ${displayPrice(
      s.dueTodayPence,
    )} owed), then ${monthly}`;
  }
  return `${monthly}${from}`;
}

/**
 * The same two sentences AFTER the card has gone through.
 *
 * Tense is the whole point. The welcome page and the "you're in" email are
 * read by somebody who has just paid, and "£100 today" on that screen reads
 * as a demand for a second £100. Past tense for what happened, future for
 * what is scheduled — and never "nothing has been taken" when something has.
 */
export function scheduleAfterLines(s: PaymentSchedule): { today: string; monthly: string } {
  const monthly = displayPrice(s.monthlyPence);
  const from = s.startDay !== null ? formatStartDate(s.startDay) : null;

  if (s.dueTodayPence > 0 && s.deferred) {
    return {
      today: `${displayPrice(s.dueTodayPence)} has been taken today for your outstanding balance, and your card is saved.`,
      monthly: `${monthly} a month comes out from ${from}, on the same day each month.`,
    };
  }
  if (s.dueTodayPence > 0) {
    return {
      today: `${displayPrice(s.todayPence)} has been taken today: ${displayPrice(
        s.dueTodayPence,
      )} outstanding balance plus ${monthly} for your first month.`,
      monthly: `Then ${monthly} a month, on the same day each month.`,
    };
  }
  if (s.deferred) {
    return {
      today: "Your card is saved and nothing has been taken yet.",
      monthly: `Your first payment of ${monthly} is on ${from}, then the same day each month.`,
    };
  }
  return {
    today: `${monthly} has been taken today.`,
    monthly: `Then ${monthly} a month, on the same day each month.`,
  };
}

/** Re-exported so callers that only need the parser import one module. */
export { parsePrice };
