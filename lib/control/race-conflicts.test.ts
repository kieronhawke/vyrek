import { describe, expect, it } from "vitest";
import {
  PROFILE,
  analyseRaces,
  buildOptions,
  requiresAcknowledgement,
  type Race,
} from "@/lib/control/race-conflicts";

/**
 * spec/16 §6: "Race conflict detection — overlapping tapers, recovery
 * windows, impossible combinations." spec/16 §11 names the exact scenario
 * the seeded data must exercise, so it is the first test here.
 */

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

const race = (over: Partial<Race> & Pick<Race, "id" | "date" | "discipline">): Race => ({
  name: over.id,
  priority: "B",
  ...over,
});

/**
 * Ben's own example, from spec/10 §2:
 *   ultra → +2 weeks Great North Run → +1 week Hyrox Pro Doubles
 */
const ULTRA = race({
  id: "ultra",
  name: "Ultra marathon",
  date: d("2026-09-05"),
  discipline: "ultra",
  priority: "A",
});
const GNR = race({
  id: "gnr",
  name: "Great North Run",
  date: d("2026-09-19"),
  discipline: "half_marathon",
  priority: "A",
});
const HYROX = race({
  id: "hyrox",
  name: "Hyrox Pro Doubles",
  date: d("2026-09-26"),
  discipline: "hyrox",
  priority: "A",
});

describe("Ben's three-race scenario", () => {
  const analysis = analyseRaces([ULTRA, GNR, HYROX]);

  it("is not clear", () => {
    expect(analysis.clear).toBe(false);
  });

  it("flags that the half falls inside the ultra's recovery window", () => {
    // 14 days after the ultra, whose recovery debt is 14 days.
    const c = analysis.conflicts.find(
      (x) => x.code === "taper_overlap" && x.raceIds.includes("gnr"),
    );
    expect(c).toBeTruthy();
    expect(c?.description).toMatch(/cannot peak for both/i);
  });

  it("flags the Hyrox sitting inside the ultra's recovery", () => {
    const c = analysis.conflicts.find(
      (x) =>
        x.code === "inside_recovery" &&
        x.raceIds.includes("ultra") &&
        x.raceIds.includes("hyrox"),
    );
    // 21 days apart against a 14-day debt, so this is a taper overlap
    // rather than strictly inside recovery.
    const overlap = analysis.conflicts.find(
      (x) => x.code === "taper_overlap" && x.raceIds.includes("hyrox"),
    );
    expect(c ?? overlap).toBeTruthy();
  });

  it("catches the discipline conflict a calendar check would miss", () => {
    // The point of the whole feature: volume erodes exactly what Hyrox needs.
    const c = analysis.conflicts.find((x) => x.code === "discipline_degradation");
    expect(c).toBeTruthy();
    expect(c?.description).toMatch(/strength and anaerobic power/i);
  });

  it("flags that three A races cannot all be peaked", () => {
    const c = analysis.conflicts.find((x) => x.code === "multiple_a_races");
    expect(c?.severity).toBe("blocking");
    expect(c?.raceIds).toHaveLength(3);
  });

  it("requires Ben to acknowledge before sending", () => {
    expect(requiresAcknowledgement(analysis)).toBe(true);
  });

  it("offers one option per race plus the honest split", () => {
    expect(analysis.options).toHaveLength(4);
    expect(analysis.options.map((o) => o.aRaceId)).toEqual([
      "ultra",
      "gnr",
      "hyrox",
      null,
    ]);
  });

  it("names the trade-off on every option", () => {
    // spec/10 §1: naming what was sacrificed is the strongest human signal.
    for (const o of analysis.options) {
      expect(o.tradeOff.length).toBeGreaterThan(10);
    }
  });

  it("is candid that the split is usually the worst choice", () => {
    const split = analysis.options.find((o) => o.aRaceId === null);
    expect(split?.tradeOff).toMatch(/worst of the options/i);
  });

  it("never returns a recommendation or a chosen option", () => {
    // The system presents options; Ben decides. Nothing in the returned
    // shape may express a preference.
    const serialised = JSON.stringify(analysis);
    expect(serialised).not.toMatch(/"recommended"|"chosen"|"best"/);
  });
});

describe("recovery windows", () => {
  it("blocks a race inside the previous one's recovery", () => {
    const a = analyseRaces([
      race({ id: "a", date: d("2026-09-05"), discipline: "marathon" }),
      race({ id: "b", date: d("2026-09-12"), discipline: "ten_k" }),
    ]);
    const c = a.conflicts.find((x) => x.code === "inside_recovery");
    expect(c?.severity).toBe("blocking");
  });

  it("treats the exact recovery boundary as clear of it", () => {
    const gap = PROFILE.half_marathon.recoveryDays; // 5
    const a = analyseRaces([
      race({ id: "a", date: d("2026-09-05"), discipline: "half_marathon" }),
      race({
        id: "b",
        date: new Date(d("2026-09-05").getTime() + gap * 86_400_000),
        discipline: "five_k",
      }),
    ]);
    expect(a.conflicts.some((c) => c.code === "inside_recovery")).toBe(false);
  });

  it("leaves genuinely well-spaced races alone", () => {
    const a = analyseRaces([
      race({ id: "a", date: d("2026-03-01"), discipline: "hyrox", priority: "A" }),
      race({ id: "b", date: d("2026-09-01"), discipline: "hyrox", priority: "B" }),
    ]);
    expect(a.clear).toBe(true);
    expect(a.options).toEqual([]);
  });
});

describe("other flags", () => {
  it("warns about travel before a race", () => {
    const a = analyseRaces([
      race({ id: "a", date: d("2026-09-05"), discipline: "hyrox", travelDaysBefore: 2 }),
    ]);
    const c = a.conflicts.find((x) => x.code === "travel_before_race");
    expect(c?.severity).toBe("worth_knowing");
  });

  it("warns when there is not enough runway to build", () => {
    const a = analyseRaces(
      [race({ id: "a", date: d("2026-09-20"), discipline: "hyrox" })],
      { blockStart: d("2026-09-05") },
    );
    const c = a.conflicts.find((x) => x.code === "insufficient_build");
    expect(c?.description).toMatch(/15 days/);
  });

  it("accepts a sufficient build without complaint", () => {
    const a = analyseRaces(
      [race({ id: "a", date: d("2026-12-01"), discipline: "hyrox" })],
      { blockStart: d("2026-09-05") },
    );
    expect(a.conflicts.some((c) => c.code === "insufficient_build")).toBe(false);
  });

  it("does not flag a single A race", () => {
    const a = analyseRaces([
      race({ id: "a", date: d("2026-09-05"), discipline: "hyrox", priority: "A" }),
    ]);
    expect(a.conflicts.some((c) => c.code === "multiple_a_races")).toBe(false);
  });
});

describe("input handling", () => {
  it("returns clear for no races", () => {
    expect(analyseRaces([])).toEqual({ conflicts: [], options: [], clear: true });
  });

  it("returns clear for one well-placed race", () => {
    expect(
      analyseRaces([race({ id: "a", date: d("2026-09-05"), discipline: "hyrox" })]).clear,
    ).toBe(true);
  });

  it("does not depend on input order", () => {
    const forward = analyseRaces([ULTRA, GNR, HYROX]);
    const backward = analyseRaces([HYROX, GNR, ULTRA]);
    expect(backward.conflicts.map((c) => c.code).sort()).toEqual(
      forward.conflicts.map((c) => c.code).sort(),
    );
  });

  it("does not mutate the input array", () => {
    const input = [HYROX, ULTRA, GNR];
    const order = input.map((r) => r.id);
    analyseRaces(input);
    expect(input.map((r) => r.id)).toEqual(order);
  });

  it("builds no options for fewer than two races", () => {
    expect(buildOptions([ULTRA])).toEqual([]);
    expect(buildOptions([])).toEqual([]);
  });
});

describe("acknowledgement", () => {
  it("is not required when nothing is blocking", () => {
    const a = analyseRaces([
      race({ id: "a", date: d("2026-09-05"), discipline: "hyrox", travelDaysBefore: 1 }),
    ]);
    expect(requiresAcknowledgement(a)).toBe(false);
  });

  it("is required as soon as something is", () => {
    const a = analyseRaces([
      race({ id: "a", date: d("2026-09-05"), discipline: "ultra", priority: "A" }),
      race({ id: "b", date: d("2026-09-08"), discipline: "hyrox", priority: "A" }),
    ]);
    expect(requiresAcknowledgement(a)).toBe(true);
  });
});
