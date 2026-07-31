import { describe, expect, it } from "vitest";
import {
  listCoachClients,
  listLeads,
  sortForToday,
  todayCounts,
  type CoachClient,
} from "@/lib/control/fixtures";

/**
 * The accessors decide what Ben sees first on the only screen he opens every
 * day, so the ordering and the counts are worth pinning down before they get
 * swapped for real queries in Phase A.
 */

const client = (over: Partial<CoachClient>): CoachClient => ({
  id: "x",
  name: "X",
  programmedUntilDays: 20,
  programmingStatus: "current",
  payment: "paid",
  paymentLabel: "1 Sep",
  billingInDays: 25,
  flags: [],
  tier: "programming",
  ...over,
});

describe("today counts", () => {
  it("counts plans due as both due-soon and overdue", () => {
    const c = todayCounts([
      client({ programmingStatus: "due_soon" }),
      client({ programmingStatus: "overdue" }),
      client({ programmingStatus: "current" }),
    ]);
    expect(c.plansDue).toBe(2);
  });

  it("counts a failed card as a late payment", () => {
    const c = todayCounts([
      client({ payment: "late" }),
      client({ payment: "failed" }),
      client({ payment: "paid" }),
      client({ payment: "due" }),
    ]);
    expect(c.paymentsLate).toBe(2);
  });

  it("counts races inside fourteen days, inclusive", () => {
    const c = todayCounts([
      client({ nextRace: { name: "a", inDays: 14, priority: "A" } }),
      client({ nextRace: { name: "b", inDays: 15, priority: "A" } }),
      client({}),
    ]);
    expect(c.racesSoon).toBe(1);
  });

  it("returns zeroes for an empty list rather than throwing", () => {
    expect(todayCounts([])).toEqual({ plansDue: 0, paymentsLate: 0, racesSoon: 0 });
  });
});

describe("today ordering", () => {
  it("puts overdue programming above everything", () => {
    const sorted = sortForToday([
      client({ id: "paid-fine" }),
      client({ id: "late", payment: "late" }),
      client({ id: "overdue", programmingStatus: "overdue" }),
    ]);
    expect(sorted[0].id).toBe("overdue");
    expect(sorted[1].id).toBe("late");
  });

  it("ranks a near race above a plan merely due soon", () => {
    const sorted = sortForToday([
      client({ id: "due-soon", programmingStatus: "due_soon" }),
      client({ id: "racing", nextRace: { name: "r", inDays: 5, priority: "A" } }),
    ]);
    expect(sorted[0].id).toBe("racing");
  });

  it("breaks ties on who runs out first", () => {
    const sorted = sortForToday([
      client({ id: "later", programmingStatus: "due_soon", programmedUntilDays: 6 }),
      client({ id: "sooner", programmingStatus: "due_soon", programmedUntilDays: 1 }),
    ]);
    expect(sorted.map((c) => c.id)).toEqual(["sooner", "later"]);
  });

  it("does not mutate the input", () => {
    const input = [client({ id: "a" }), client({ id: "b", programmingStatus: "overdue" })];
    const before = input.map((c) => c.id);
    sortForToday(input);
    expect(input.map((c) => c.id)).toEqual(before);
  });

  it("handles an empty list", () => {
    expect(sortForToday([])).toEqual([]);
  });
});

describe("the seeded set", () => {
  it("covers every programming state, so the UI is exercised", () => {
    const states = new Set(listCoachClients().map((c) => c.programmingStatus));
    expect(states).toContain("overdue");
    expect(states).toContain("due_soon");
    expect(states).toContain("awaiting_race_debrief");
    expect(states).toContain("current");
  });

  it("includes a late payment and a failed card", () => {
    const payments = new Set(listCoachClients().map((c) => c.payment));
    expect(payments).toContain("late");
    expect(payments).toContain("failed");
  });

  it("never presents a fixture as a real person", () => {
    // HARD-RULES §1. These names must stay obviously placeholder.
    for (const c of listCoachClients()) expect(c.name).toMatch(/^Sample /);
    for (const l of listLeads()) expect(l.name).toMatch(/^Sample /);
  });
});
