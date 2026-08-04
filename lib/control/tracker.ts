/**
 * The coach tracker — what Ben opens every day.
 *
 * Modelled on "Coaching Tracker.xlsx": groups across the sheet, each with two
 * columns, Athlete and Programmed Until, and an occasional loose note in the
 * next cell over ("call", "Share doc", "Next week down week").
 *
 * Its entire job is: who is programmed until when, and who is due now. Half
 * the dates in the real sheet are Excel serials and half are typed
 * ("Due 03/08/2026", "Return date TBC", "Ankle"), which is exactly what a
 * spreadsheet lets you get away with and exactly what makes it impossible to
 * answer "who is due this week" without reading every row.
 *
 * PRIVACY: THE REAL NAMES ARE DELIBERATELY NOT HERE
 * -------------------------------------------------
 * github.com/kieronhawke/vyrek is a public repository. Seeding this file with
 * the actual sheet would publish Ben's client list — names, tiers, and who is
 * behind on payment. The structure below is his; the names are not. He types
 * his own in and they persist to his browser, never to the repo.
 *
 * ONE ROSTER, NOT TWO
 * -------------------
 * This file used to carry its own seed — twenty-seven rows named "Athlete A"
 * through "Athlete Z" with ids `a_01`… — while `fixtures.CLIENTS` carried a
 * second roster of the same people under ids `c_01`…. Two lists of the same
 * clients is why nobody could say what the difference between the tracker and
 * the clients page was: there wasn't one, except that the ids disagreed, so a
 * card on one screen linked to a profile of nobody on the other.
 *
 * So the seed is now derived from `CLIENTS`. Same people, same ids, same
 * names, same tier vocabulary. The tracker is a view of the client list, which
 * is what it always was.
 */

import { CLIENTS, type CoachClient } from "@/lib/control/fixtures";
import { TIER_LABEL, TIER_ORDER } from "@/lib/control/client-hub";

/**
 * The sheet's four columns were 121 / Tier 2 / Non-HYROX / VIP; the product
 * sells Hub / Programming / Coaching / 1-to-1 VIP. Two vocabularies for one
 * thing, so the one the business actually sells wins and the sheet's wording
 * is retired.
 */
export type Tier = CoachClient["tier"];

export { TIER_LABEL, TIER_ORDER };

export type TrackedAthlete = {
  id: string;
  name: string;
  tier: Tier;
  /**
   * ISO date, or null when it genuinely is not known.
   *
   * The sheet mixes dates with prose. A date field that accepts "Ankle" cannot
   * be sorted or counted, so the prose moves to `note` where it belongs and a
   * null date means "not set" rather than being hidden inside a string.
   */
  programmedUntil: string | null;
  /** "Return date TBC", "Ankle", "Next week down week", "Share doc". */
  note: string;
  /** What they pay a month, in pounds. Ben asked to see this per athlete. */
  monthly: number;
  /** Whether a card is on file. Real status arrives with Stripe. */
  paymentSet: boolean;
};

/**
 * What each tier bills a month, in pounds. The Hub figure is the real Club
 * subscription (lib/pricing.ts); the coached tiers are the sheet's numbers.
 */
const MONTHLY: Record<Tier, number> = {
  elite: 400,
  coaching: 220,
  programming: 95,
  hub: 8.99,
};

/** UTC midnight today, as the anchor the seed's dates are measured from. */
function todayUTC(): number {
  const n = new Date();
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
}

/**
 * `CLIENTS` stores "programmed until" as days from today, not as a date, so
 * the demo never goes stale the way a hardcoded 2026-08-11 does. The tracker
 * needs a real date to sort and count on, so it is resolved here.
 *
 * `awaiting_race_debrief` resolves to null: that client genuinely has no end
 * date set, which is the sheet's "Return date TBC" case and the reason the
 * field is nullable at all.
 */
function untilFrom(c: CoachClient): string | null {
  if (c.programmingStatus === "awaiting_race_debrief") return null;
  return new Date(todayUTC() + c.programmedUntilDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/**
 * The store key.
 *
 * Bumped to v2 when the seed stopped being its own roster of `a_01`… and
 * became a view of `CLIENTS`. Anyone who had already opened the tracker has
 * twenty-seven "Athlete A" rows saved in their browser, and those rows would
 * have outlived the change and shadowed the real names forever. A new key
 * retires them.
 */
export const TRACKER_KEY = "tracker.v2";

/**
 * The seed, derived rather than duplicated.
 *
 * `flags` is the client list's plain-English column and `note` is the sheet's
 * loose cell next to a name. Same thing, so the first flag becomes the note
 * instead of inventing a second one that would immediately disagree with it.
 */
export const SEED_ATHLETES: TrackedAthlete[] = CLIENTS.map((c) => ({
  id: c.id,
  name: c.name,
  tier: c.tier,
  programmedUntil: untilFrom(c),
  note: c.flags[0] ?? "",
  monthly: MONTHLY[c.tier],
  // A declined card is technically on file and cannot be charged, and this
  // field renders as "On file" in green. Showing that against somebody whose
  // payment just bounced is the wrong signal on a screen built to prompt
  // action, so a failed card reads as not set.
  paymentSet: c.payment !== "failed",
}));

/** Whole days from `now` until a plan runs out. Null when it is not set. */
export function daysLeft(a: TrackedAthlete, now: Date = new Date()): number | null {
  if (!a.programmedUntil) return null;
  const end = new Date(`${a.programmedUntil}T00:00:00Z`).getTime();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((end - today) / 86_400_000);
}

export type Urgency = "overdue" | "due" | "soon" | "ok" | "unknown";

/**
 * Ben's actual decision, encoded once.
 *
 * He writes a week at a time, so "due" is anything running out inside seven
 * days — not the day it expires, by which point the athlete has already had a
 * week with nothing to do.
 */
export function urgency(a: TrackedAthlete, now?: Date): Urgency {
  const d = daysLeft(a, now);
  if (d === null) return "unknown";
  if (d < 0) return "overdue";
  if (d <= 2) return "due";
  if (d <= 7) return "soon";
  return "ok";
}

export const URGENCY_LABEL: Record<Urgency, string> = {
  overdue: "Overdue",
  due: "Due now",
  soon: "Due this week",
  ok: "Programmed",
  unknown: "No date",
};

export const URGENCY_TONE: Record<Urgency, string> = {
  overdue: "var(--danger)",
  due: "var(--danger)",
  soon: "var(--warn)",
  ok: "var(--text-muted)",
  unknown: "var(--text-faint)",
};

const RANK: Record<Urgency, number> = {
  overdue: 0,
  due: 1,
  soon: 2,
  unknown: 3,
  ok: 4,
};

/** Most urgent first, then soonest to run out. */
export function sortByUrgency(
  list: TrackedAthlete[],
  now?: Date,
): TrackedAthlete[] {
  return [...list].sort((a, b) => {
    const r = RANK[urgency(a, now)] - RANK[urgency(b, now)];
    if (r !== 0) return r;
    const da = daysLeft(a, now);
    const db = daysLeft(b, now);
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });
}

/** Everyone who needs a plan written inside the week. */
export function needsProgramming(
  list: TrackedAthlete[],
  now?: Date,
): TrackedAthlete[] {
  return sortByUrgency(
    list.filter((a) => ["overdue", "due", "soon"].includes(urgency(a, now))),
    now,
  );
}

export function monthlyRevenue(list: TrackedAthlete[]): number {
  return list.reduce((n, a) => n + a.monthly, 0);
}
