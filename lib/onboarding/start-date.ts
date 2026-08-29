/**
 * WHEN THE FIRST PAYMENT COMES OUT.
 *
 * Ben sets somebody up mid-month having agreed they start on the 1st. Until
 * now the only answer was "it charges when they tap pay", so either he waited
 * to send the link or the client paid for days they had not agreed to. Both
 * of those are him doing arithmetic on somebody else's money.
 *
 * So the invite carries a date, and checkout tells Stripe to start the billing
 * cycle then.
 *
 * ── WHY billing_cycle_anchor AND NOT A TRIAL ──────────────────────────────
 * Stripe offers two ways to delay a first charge, and they are not equivalent
 * here. Both were measured against the live test API rather than assumed:
 *
 *   trial_end             £0 today, full amount on the date. BUT Checkout
 *                         refuses any trial_end less than 48 HOURS away, and
 *                         Stripe then describes the subscription as being in
 *                         a free trial — on the checkout page, in its own
 *                         emails, and in the dashboard.
 *
 *   billing_cycle_anchor  £0 today — no invoice is raised at all — full amount
 *                         on the date, monthly from then. Works for any future
 *                         instant, including tomorrow. Nothing anywhere calls
 *                         it a trial.
 *
 * These are existing clients moving an agreed arrangement onto a card. They
 * are not on a free trial and telling them they are would be a lie printed at
 * the exact moment they hand over card details. So: the anchor.
 *
 * Its one cost is the ceiling. Stripe rejects an anchor "later than next
 * natural billing date", which for a monthly price is about a month —
 * empirically +31 days passes and +32 days does not. That is why
 * MAX_START_DAYS_AHEAD exists and why Ben's date picker stops there rather
 * than letting him choose a date Stripe will refuse at the moment a client is
 * trying to pay.
 *
 * ── WHY A DAY NUMBER AND NOT A TIMESTAMP ──────────────────────────────────
 * "The 1st" is a calendar date, not an instant. Stored as days since the epoch
 * it is five characters in a link that goes out by SMS, and it cannot drift
 * across a timezone. The instant is computed once, at checkout, in London.
 */

/** The clock Ben and his clients live on. */
export const TZ = "Europe/London";

/**
 * The hour the first payment is taken, London time.
 *
 * Not midnight. A charge at 00:00 lands on a date boundary, which is exactly
 * where a British Summer Time bug hides: computed in UTC, "1 September" at
 * midnight is 31 August at 23:00 in London, and the client is charged on the
 * wrong day and rings up about it. Nine in the morning is far from any
 * boundary in either direction, and a payment notification at a civilised
 * hour is its own small kindness.
 */
export const CHARGE_HOUR = 9;

/**
 * How far ahead a start date may be set.
 *
 * Stripe's limit, not a policy: `billing_cycle_anchor` cannot be later than
 * the next natural billing date. Measured against the test API — +31 days is
 * accepted, +32 days returns "The `billing_cycle_anchor` cannot be later than
 * next natural billing date."
 */
export const MAX_START_DAYS_AHEAD = 31;

const DAY_MS = 86_400_000;

/** Days since the epoch for a calendar date, from its parts. */
function dayFromParts(year: number, month: number, day: number): number {
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

/** Today's date in London, as a day number. */
export function todayDay(now = Date.now()): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
  const [y, m, d] = parts.split("-").map(Number);
  return dayFromParts(y, m, d);
}

/** "2026-09-01" → a day number, or null if it is not a real date. */
export function parseStartDate(input: string): number | null {
  const text = (input ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!m) return null;
  const [, ys, ms, ds] = m;
  const y = Number(ys);
  const mo = Number(ms);
  const d = Number(ds);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const day = dayFromParts(y, mo, d);
  // Round-trip: catches 31 February, which Date.UTC silently rolls forward.
  const back = new Date(day * DAY_MS);
  if (
    back.getUTCFullYear() !== y ||
    back.getUTCMonth() + 1 !== mo ||
    back.getUTCDate() !== d
  ) {
    return null;
  }
  return day;
}

/** A day number back to "2026-09-01", for a date input's value. */
export function startDateISO(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Why this date cannot be used, or nothing.
 *
 * A message rather than a boolean, because a disabled Send button with no
 * explanation is how Ben ends up ringing Kieron.
 */
export function startDateBlocker(day: number, now = Date.now()): string | null {
  const today = todayDay(now);
  if (day < today) return "That date has already passed.";
  if (day > today + MAX_START_DAYS_AHEAD) {
    return `Stripe will not schedule a first payment more than ${MAX_START_DAYS_AHEAD} days ahead. Pick a date within the next month.`;
  }
  return null;
}

/**
 * The instant Stripe should anchor the billing cycle to, or null to charge now.
 *
 * Null for today and for anything already past — which is deliberate and is
 * the case that actually happens. Ben sends a link on the 28th saying billing
 * starts on the 1st; the client opens it on the 4th. The date they agreed has
 * gone, so the right thing is to collect now and run monthly from there, not
 * to refuse the payment or to give away three free days.
 *
 * Computed from the calendar date at CHARGE_HOUR London time, never by adding
 * hours to a UTC midnight.
 */
export function billingAnchorUnix(
  day: number | undefined | null,
  now = Date.now(),
): number | null {
  if (day == null) return null;

  /* Today means today. If Ben picked today's date, the client is charged at
     checkout, not at nine o'clock this morning — otherwise somebody paying at
     08:00 gets a £0 checkout and an hour of limbo, which is a strange thing to
     show a person who has just agreed to start today. */
  if (day <= todayDay(now)) return null;

  const iso = startDateISO(day);
  const [y, m, d] = iso.split("-").map(Number);

  // Start from the naive UTC instant and correct it by however far London
  // actually was from UTC at that moment. Two passes settle the clock-change
  // weekends, where the first correction moves the instant across the change.
  let ts = Date.UTC(y, m - 1, d, CHARGE_HOUR, 0, 0);
  const want = ts;
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date(ts));
    const get = (k: string) => Number(parts.find((p) => p.type === k)?.value);
    // Intl renders midnight as "24" in some ICU versions; normalise it.
    const hour = get("hour") % 24;
    const asLondon = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      hour,
      get("minute"),
      get("second"),
    );
    const drift = want - asLondon;
    if (drift === 0) break;
    ts += drift;
  }

  // Already gone, or so close that the anchor would land behind the Stripe
  // call itself. Charge at checkout instead.
  if (ts <= now) return null;
  return Math.floor(ts / 1000);
}

/** "Tuesday 1 September" — how somebody says a date they are being charged on. */
export function formatStartDate(day: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(day * DAY_MS));
}

/** "1 Sep" — for a text message, where characters are billed. */
export function formatStartDateShort(day: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(new Date(day * DAY_MS));
}

/**
 * What the client is told about their first payment, in one sentence.
 *
 * Takes the day the LINK was built with and the moment they are reading it,
 * because those can be weeks apart and the honest sentence differs: a date
 * that has since passed must not still be promised.
 */
export function firstPaymentLine(
  day: number | undefined | null,
  now = Date.now(),
): string {
  if (day == null) return "Your first payment is taken today.";
  if (billingAnchorUnix(day, now) === null) {
    return "Your first payment is taken today.";
  }
  return `Nothing today. Your first payment is on ${formatStartDate(day)}.`;
}
