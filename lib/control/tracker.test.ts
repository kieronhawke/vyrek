import { describe, expect, it } from "vitest";
import {
  SEED_ATHLETES,
  TIER_ORDER,
  daysLeft,
  monthlyRevenue,
  needsProgramming,
  sortByUrgency,
  urgency,
  type TrackedAthlete,
} from "./tracker";

/** A fixed "today" so none of this drifts with the clock. */
const NOW = new Date("2026-08-10T09:00:00Z");

function athlete(patch: Partial<TrackedAthlete>): TrackedAthlete {
  return {
    id: "x",
    name: "X",
    tier: "121",
    programmedUntil: null,
    note: "",
    monthly: 100,
    paymentSet: true,
    ...patch,
  };
}

describe("programmed-until", () => {
  it("counts whole days, and goes negative once it has run out", () => {
    expect(daysLeft(athlete({ programmedUntil: "2026-08-17" }), NOW)).toBe(7);
    expect(daysLeft(athlete({ programmedUntil: "2026-08-10" }), NOW)).toBe(0);
    expect(daysLeft(athlete({ programmedUntil: "2026-08-03" }), NOW)).toBe(-7);
  });

  it("returns null rather than guessing when no date is set", () => {
    expect(daysLeft(athlete({ programmedUntil: null }), NOW)).toBeNull();
    expect(urgency(athlete({ programmedUntil: null }), NOW)).toBe("unknown");
  });
});

describe("urgency", () => {
  /**
   * Ben writes a week at a time, so "due" has to fire before the plan runs
   * out — not on the day it expires, by which point the athlete has already
   * had a week with nothing to do.
   */
  it("flags a week ahead, not on the day", () => {
    expect(urgency(athlete({ programmedUntil: "2026-08-16" }), NOW)).toBe("soon");
    expect(urgency(athlete({ programmedUntil: "2026-08-11" }), NOW)).toBe("due");
    expect(urgency(athlete({ programmedUntil: "2026-08-09" }), NOW)).toBe("overdue");
    expect(urgency(athlete({ programmedUntil: "2026-09-30" }), NOW)).toBe("ok");
  });
});

describe("the work queue", () => {
  const list = [
    athlete({ id: "ok", programmedUntil: "2026-09-30" }),
    athlete({ id: "overdue", programmedUntil: "2026-08-01" }),
    athlete({ id: "unknown", programmedUntil: null }),
    athlete({ id: "soon", programmedUntil: "2026-08-15" }),
    athlete({ id: "due", programmedUntil: "2026-08-11" }),
  ];

  it("puts the most urgent first", () => {
    expect(sortByUrgency(list, NOW).map((a) => a.id)).toEqual([
      "overdue",
      "due",
      "soon",
      "unknown",
      "ok",
    ]);
  });

  it("only asks for work that is actually due inside the week", () => {
    expect(needsProgramming(list, NOW).map((a) => a.id)).toEqual([
      "overdue",
      "due",
      "soon",
    ]);
  });

  it("does not chase someone with no date — that is a question, not a plan", () => {
    expect(needsProgramming(list, NOW).map((a) => a.id)).not.toContain("unknown");
  });
});

describe("the seeded tracker", () => {
  it("carries the four groups from the real sheet", () => {
    expect(TIER_ORDER).toEqual(["121", "tier2", "non-hyrox", "vip"]);
    for (const tier of TIER_ORDER) {
      expect(SEED_ATHLETES.some((a) => a.tier === tier)).toBe(true);
    }
  });

  it("is about the size of the real one", () => {
    expect(SEED_ATHLETES.length).toBeGreaterThanOrEqual(25);
  });

  /**
   * The repository is public. Seeding the real sheet would publish Ben's
   * client list — names, tiers and who is behind on payment.
   */
  it("contains no real client names beyond the one already public", () => {
    const realNames = [
      "Sally", "Sean", "Lauren", "Nicole", "Perinetti", "Maria", "Colacurico",
      "Brandon", "Ricardo", "Louis", "Ansh", "Danny", "Vanessa", "Rubio",
      "Karan", "Vasco", "Garcez", "Matteo", "Oris", "Riley", "Becca",
      "Saskiano", "Advit", "Yash", "Akshay", "Sonali",
    ];
    const seeded = SEED_ATHLETES.map((a) => a.name).join(" ");
    for (const n of realNames) expect(seeded).not.toContain(n);
  });

  it("keeps the sheet's mix of set and unset dates", () => {
    expect(SEED_ATHLETES.some((a) => a.programmedUntil === null)).toBe(true);
    expect(SEED_ATHLETES.some((a) => a.programmedUntil !== null)).toBe(true);
  });

  it("totals what the book is worth a month", () => {
    expect(monthlyRevenue(SEED_ATHLETES)).toBeGreaterThan(0);
    expect(monthlyRevenue([])).toBe(0);
  });
});
