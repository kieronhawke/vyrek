import { describe, expect, it } from "vitest";
import { listCoachClients } from "./fixtures";
import { TIER_LABEL, clientLenses, humanDate, isLens, matchesLens, nextDeadline, paymentTone } from "./client-hub";
import type { CoachClient } from "./fixtures";

const base = (over: Partial<CoachClient> = {}): CoachClient => ({
  id: "x", name: "Test Person", programmedUntilDays: 20,
  programmingStatus: "current", payment: "paid", paymentLabel: "1 Sep",
  billingInDays: 20, flags: [], tier: "coaching", ...over,
});

describe("client hub", () => {
  it("the needs-a-plan lens is the old tracker page", () => {
    // The tracker existed to answer "who is due". If this drifts, merging the
    // two screens quietly lost the thing the second one was for.
    const clients = listCoachClients();
    const viaLens = clients.filter((c) => matchesLens(c, "needs_plan")).map((c) => c.id).sort();
    const viaStatus = clients
      .filter((c) => c.programmingStatus === "overdue" || c.programmingStatus === "due_soon")
      .map((c) => c.id).sort();
    expect(viaLens).toEqual(viaStatus);
    expect(viaLens.length).toBeGreaterThan(0);
  });

  it("puts what is urgent before the tiers, and hides empty chips", () => {
    const chips = clientLenses(listCoachClients());
    expect(chips[0].key).toBe("all");
    expect(chips.map((c) => c.key)).toContain("needs_plan");
    for (const c of chips) {
      if (c.key !== "all") expect(c.count, `${c.key} rendered as an empty chip`).toBeGreaterThan(0);
    }
  });

  it("always offers Everyone, even with nobody in the list", () => {
    const chips = clientLenses([]);
    expect(chips).toHaveLength(1);
    expect(chips[0]).toMatchObject({ key: "all", count: 0 });
  });

  it("leads with the deadline that actually decides the day", () => {
    expect(nextDeadline(base({ programmedUntilDays: -3 }))).toEqual({
      label: "Plan ran out 3d ago", urgent: true,
    });
    expect(nextDeadline(base({ programmedUntilDays: 0 })).urgent).toBe(true);
    expect(nextDeadline(base({ programmedUntilDays: 7 })).urgent).toBe(true);
    expect(nextDeadline(base({ programmedUntilDays: 8 })).urgent).toBe(false);
    // A written debrief outranks the day count.
    expect(nextDeadline(base({ programmingStatus: "awaiting_race_debrief" })).label)
      .toMatch(/debrief/);
  });

  it("labels the elite tier as what it is sold as", () => {
    expect(TIER_LABEL.elite).toBe("1-to-1 VIP");
  });

  it("treats a due payment as a warning and a failure as a problem", () => {
    expect(paymentTone("paid")).toBe("ok");
    expect(paymentTone("due")).toBe("warn");
    expect(paymentTone("late")).toBe("danger");
    expect(paymentTone("failed")).toBe("danger");
  });

  it("only counts a race as soon if it has not already happened", () => {
    expect(matchesLens(base({ nextRace: { name: "X", inDays: 30, priority: "A" } }), "racing")).toBe(true);
    expect(matchesLens(base({ nextRace: { name: "X", inDays: -2, priority: "A" } }), "racing")).toBe(false);
    expect(matchesLens(base({ nextRace: { name: "X", inDays: 90, priority: "A" } }), "racing")).toBe(false);
  });
});

describe("humanDate", () => {
  /**
   * It renders next to prose on a British coach's screen, so 6 Aug, never
   * Aug 6 and never 2026-08-06. Pinned to en-GB and UTC in the formatter so it
   * cannot drift with the machine it runs on, which is also what keeps the
   * server's markup and the browser's hydration identical.
   */
  it("reads the way a person writes a date", () => {
    expect(humanDate("2026-08-06")).toBe("6 Aug");
    expect(humanDate("2026-08-06", true)).toBe("6 Aug 2026");
    expect(humanDate("2025-02-10", true)).toBe("10 Feb 2025");
  });

  /* Never invent a date. An unparseable value is shown as given so the bad
     data is visible rather than silently rendered as today. */
  it("passes rubbish through rather than guessing", () => {
    expect(humanDate("")).toBe("\u2014");
    expect(humanDate("not a date")).toBe("not a date");
  });
});

describe("isLens", () => {
  /**
   * The lens is read off the URL, which anyone can type into. A mistyped link
   * must show Ben his clients, not an empty screen — so an unknown value is
   * rejected here and the page falls back to "everyone".
   */
  it("accepts the lenses that exist and rejects anything else", () => {
    for (const good of ["all", "needs_plan", "payment", "racing", "elite", "coaching", "programming", "hub"]) {
      expect(isLens(good), good).toBe(true);
    }
    for (const bad of ["", "ALL", "needsplan", "vip", "121", undefined, null, 3, {}]) {
      expect(isLens(bad), String(bad)).toBe(false);
    }
  });
});
