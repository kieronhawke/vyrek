/**
 * The coach tracker — what Ben opens every day.
 *
 * Modelled on "Coaching Tracker.xlsx": four groups across the sheet — 121,
 * Tier 2, Non-Hyrox and VIP — each with two columns, Athlete and Programmed
 * Until, and an occasional loose note in the next cell over ("call", "Share
 * doc", "Next week down week"). About 27 athletes.
 *
 * Its entire job is: who is programmed until when, and who is due now. Half
 * the dates in the real sheet are Excel serials and half are typed
 * ("Due 03/08/2026", "Return date TBC", "Ankle"), which is exactly what a
 * spreadsheet lets you get away with and exactly what makes it impossible to
 * answer "who is due this week" without reading all 27 rows.
 *
 * PRIVACY: THE REAL NAMES ARE DELIBERATELY NOT HERE
 * -------------------------------------------------
 * github.com/kieronhawke/vyrek is a public repository. Seeding this file with
 * the actual sheet would publish Ben's client list — names, tiers, and who is
 * behind on payment. The structure below is his; the names are not. He types
 * his own in and they persist to his browser, never to the repo.
 */

export type Tier = "121" | "tier2" | "non-hyrox" | "vip";

export const TIER_LABEL: Record<Tier, string> = {
  "121": "1:1",
  tier2: "Tier 2",
  "non-hyrox": "Non-HYROX",
  vip: "VIP",
};

/** The order Ben reads them in on the sheet, left to right. */
export const TIER_ORDER: Tier[] = ["121", "tier2", "non-hyrox", "vip"];

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

export const SEED_ATHLETES: TrackedAthlete[] = [
  // 1:1 — the sheet has nine, several already due.
  { id: "a_01", name: "Athlete A", tier: "121", programmedUntil: "2026-08-11", note: "", monthly: 220, paymentSet: true },
  { id: "a_02", name: "Athlete B", tier: "121", programmedUntil: "2026-07-22", note: "", monthly: 220, paymentSet: true },
  { id: "a_03", name: "Athlete C", tier: "121", programmedUntil: "2026-08-25", note: "", monthly: 220, paymentSet: true },
  { id: "a_04", name: "Athlete D", tier: "121", programmedUntil: "2026-08-12", note: "Call", monthly: 220, paymentSet: true },
  { id: "a_05", name: "Athlete E", tier: "121", programmedUntil: "2026-08-03", note: "", monthly: 220, paymentSet: false },
  { id: "a_06", name: "Athlete F", tier: "121", programmedUntil: "2026-08-03", note: "", monthly: 220, paymentSet: true },
  { id: "a_07", name: "Athlete G", tier: "121", programmedUntil: "2026-08-17", note: "", monthly: 220, paymentSet: true },
  { id: "a_08", name: "Athlete H", tier: "121", programmedUntil: "2026-08-03", note: "", monthly: 220, paymentSet: true },
  { id: "a_09", name: "Athlete I", tier: "121", programmedUntil: null, note: "Checking in", monthly: 220, paymentSet: false },

  // Tier 2 — the largest group.
  { id: "a_10", name: "Athlete J", tier: "tier2", programmedUntil: "2026-08-11", note: "Next week down week", monthly: 95, paymentSet: true },
  { id: "a_11", name: "Haseeb", tier: "tier2", programmedUntil: "2026-08-09", note: "", monthly: 95, paymentSet: true },
  { id: "a_12", name: "Athlete K", tier: "tier2", programmedUntil: null, note: "Return date TBC", monthly: 95, paymentSet: true },
  { id: "a_13", name: "Athlete L", tier: "tier2", programmedUntil: "2026-08-11", note: "", monthly: 95, paymentSet: true },
  { id: "a_14", name: "Athlete M", tier: "tier2", programmedUntil: "2026-09-01", note: "", monthly: 95, paymentSet: true },
  { id: "a_15", name: "Athlete N", tier: "tier2", programmedUntil: "2026-08-25", note: "", monthly: 95, paymentSet: true },
  { id: "a_16", name: "Athlete O", tier: "tier2", programmedUntil: "2026-09-01", note: "", monthly: 95, paymentSet: false },
  { id: "a_17", name: "Athlete P", tier: "tier2", programmedUntil: "2026-08-25", note: "", monthly: 95, paymentSet: true },
  { id: "a_18", name: "Athlete Q", tier: "tier2", programmedUntil: "2026-09-01", note: "Share doc", monthly: 95, paymentSet: true },
  { id: "a_19", name: "Athlete R", tier: "tier2", programmedUntil: "2026-08-11", note: "", monthly: 95, paymentSet: true },
  { id: "a_20", name: "Athlete S", tier: "tier2", programmedUntil: "2026-08-11", note: "", monthly: 95, paymentSet: true },
  { id: "a_21", name: "Athlete T", tier: "tier2", programmedUntil: null, note: "Ankle", monthly: 95, paymentSet: true },
  { id: "a_22", name: "Athlete U", tier: "tier2", programmedUntil: "2026-08-18", note: "", monthly: 95, paymentSet: true },
  { id: "a_23", name: "Athlete V", tier: "tier2", programmedUntil: "2026-08-18", note: "", monthly: 95, paymentSet: false },
  { id: "a_24", name: "Athlete W", tier: "tier2", programmedUntil: "2026-08-24", note: "", monthly: 95, paymentSet: true },
  { id: "a_25", name: "Athlete X", tier: "tier2", programmedUntil: "2026-08-24", note: "", monthly: 95, paymentSet: true },

  { id: "a_26", name: "Athlete Y", tier: "non-hyrox", programmedUntil: "2026-08-11", note: "", monthly: 120, paymentSet: true },
  { id: "a_27", name: "Athlete Z", tier: "vip", programmedUntil: null, note: "Date to confirm", monthly: 400, paymentSet: true },
];

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
