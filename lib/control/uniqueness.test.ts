import { describe, expect, it } from "vitest";
import {
  BENS_TAKE_MIN_WORDS,
  COUNTABLE_FIELDS,
  MINIMUM_SCORE,
  isPopulated,
  uniquenessReport,
  validateUniqueness,
  type LocationData,
} from "@/lib/control/uniqueness";

/**
 * spec/16 §6: "Uniqueness validator — every field combination at the
 * threshold boundary." This is the gate that makes programmatic scale safe,
 * so its boundaries matter more than most.
 */

const take = (n: number) => Array.from({ length: n }, () => "word").join(" ");
const GOOD_TAKE = take(BENS_TAKE_MIN_WORDS);

/** A page that just clears the gate: 5 fields, one gym, one results point. */
function minimalPass(): LocationData {
  return {
    affiliated_gyms: ["Gym"],
    local_athlete_count: 12,
    parkrun_locations: ["Parkrun"],
    run_clubs: ["Club"],
    bens_take: GOOD_TAKE,
  };
}

describe("field population rules", () => {
  it("needs three resolved stations for the equipment matrix", () => {
    expect(isPopulated("equipment_matrix", { equipment_matrix: { a: 1, b: 2 } })).toBe(
      false,
    );
    expect(
      isPopulated("equipment_matrix", { equipment_matrix: { a: 1, b: 2, c: 3 } }),
    ).toBe(true);
  });

  it("ignores blank entries when counting the matrix", () => {
    expect(
      isPopulated("equipment_matrix", { equipment_matrix: { a: 1, b: "", c: null } }),
    ).toBe(false);
  });

  it("needs both a distance and a travel time for the nearest race", () => {
    expect(isPopulated("nearest_race", { nearest_race: { distance_km: 12 } })).toBe(
      false,
    );
    expect(isPopulated("nearest_race", { nearest_race: { travel_minutes: 30 } })).toBe(
      false,
    );
    expect(
      isPopulated("nearest_race", {
        nearest_race: { distance_km: 12, travel_minutes: 30 },
      }),
    ).toBe(true);
  });

  it("needs two named running routes, not one", () => {
    expect(isPopulated("running_routes", { running_routes: ["a"] })).toBe(false);
    expect(isPopulated("running_routes", { running_routes: ["a", "b"] })).toBe(true);
  });

  it("treats a zero athlete count as empty", () => {
    expect(isPopulated("local_athlete_count", { local_athlete_count: 0 })).toBe(false);
    expect(isPopulated("local_athlete_count", { local_athlete_count: 1 })).toBe(true);
  });

  it("accepts a zero median time, which is a real value", () => {
    // Distinct from athlete count: 0 seconds is nonsense but 0 is a number,
    // so the rule is finiteness rather than truthiness. Guards against a
    // future real value being dropped for being falsy.
    expect(isPopulated("local_median_time", { local_median_time: 0 })).toBe(true);
    expect(isPopulated("local_median_time", { local_median_time: null })).toBe(false);
  });
});

describe("Ben's take", () => {
  it("needs at least the minimum word count", () => {
    expect(isPopulated("bens_take", { bens_take: take(BENS_TAKE_MIN_WORDS - 1) })).toBe(
      false,
    );
    expect(isPopulated("bens_take", { bens_take: take(BENS_TAKE_MIN_WORDS) })).toBe(
      true,
    );
  });

  it("does not count whitespace as words", () => {
    expect(isPopulated("bens_take", { bens_take: "   \n\t  " })).toBe(false);
  });

  it("keeps a page in draft when it is missing, even with a high score", () => {
    const data: LocationData = {
      affiliated_gyms: ["a"],
      equipped_gyms: ["b"],
      chain_locations: ["c"],
      race_history: ["d"],
      next_3_races: ["e"],
      parkrun_locations: ["f"],
      run_clubs: ["g"],
    };
    const r = validateUniqueness(data);
    expect(r.score).toBeGreaterThanOrEqual(MINIMUM_SCORE);
    expect(r.publishable).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/draft/i);
  });
});

describe("the threshold boundary", () => {
  it("publishes at exactly the minimum score", () => {
    const r = validateUniqueness(minimalPass());
    expect(r.score).toBe(MINIMUM_SCORE);
    expect(r.publishable).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("blocks one field below the minimum", () => {
    const data = minimalPass();
    delete data.run_clubs;
    const r = validateUniqueness(data);
    expect(r.score).toBe(MINIMUM_SCORE - 1);
    expect(r.publishable).toBe(false);
  });
});

describe("the mandatory categories override the count", () => {
  it("blocks a high score with no gym", () => {
    const r = validateUniqueness({
      race_history: ["a"],
      next_3_races: ["b"],
      local_athlete_count: 5,
      parkrun_locations: ["c"],
      run_clubs: ["d"],
      running_routes: ["e", "f"],
      bens_take: GOOD_TAKE,
    });
    expect(r.score).toBeGreaterThan(MINIMUM_SCORE);
    expect(r.publishable).toBe(false);
    expect(r.missingMandatory).toContain("gym");
  });

  it("blocks a high score with no results data", () => {
    const r = validateUniqueness({
      affiliated_gyms: ["a"],
      equipped_gyms: ["b"],
      chain_locations: ["c"],
      equipment_gaps: ["d"],
      parkrun_locations: ["e"],
      run_clubs: ["f"],
      bens_take: GOOD_TAKE,
    });
    expect(r.score).toBeGreaterThan(MINIMUM_SCORE);
    expect(r.publishable).toBe(false);
    expect(r.missingMandatory).toContain("results");
  });

  it("names both when both are missing", () => {
    const r = validateUniqueness({ bens_take: GOOD_TAKE });
    expect(r.missingMandatory).toEqual(["gym", "results"]);
  });

  it("accepts any one of the gym fields", () => {
    for (const f of ["affiliated_gyms", "equipped_gyms", "chain_locations"] as const) {
      const data: LocationData = { local_athlete_count: 3, bens_take: GOOD_TAKE };
      data[f] = ["x"];
      expect(validateUniqueness(data).missingMandatory).not.toContain("gym");
    }
  });

  it("accepts any one of the results fields", () => {
    const fields = [
      "race_history",
      "notable_local_athletes",
    ] as const;
    for (const f of fields) {
      const data: LocationData = { affiliated_gyms: ["g"], bens_take: GOOD_TAKE };
      data[f] = ["x"];
      expect(validateUniqueness(data).missingMandatory).not.toContain("results");
    }
    expect(
      validateUniqueness({
        affiliated_gyms: ["g"],
        local_fastest_time: 3600,
        bens_take: GOOD_TAKE,
      }).missingMandatory,
    ).not.toContain("results");
  });
});

describe("no bypass exists — HARD-RULES §7", () => {
  it("takes exactly one argument, so there is nowhere to pass an override", () => {
    expect(validateUniqueness.length).toBe(1);
  });

  it("cannot be talked into publishing an empty page by extra properties", () => {
    const sneaky = {
      force: true,
      skipValidation: true,
      published: true,
    } as unknown as LocationData;
    expect(validateUniqueness(sneaky).publishable).toBe(false);
  });
});

describe("the build report", () => {
  it("separates publishable from blocked and explains each block", () => {
    const report = uniquenessReport([
      { slug: "leeds", data: minimalPass() },
      { slug: "hull", data: { bens_take: GOOD_TAKE } },
    ]);
    expect(report.publishable).toEqual(["leeds"]);
    expect(report.blocked).toHaveLength(1);
    expect(report.blocked[0].slug).toBe("hull");
    expect(report.blocked[0].reasons.length).toBeGreaterThan(0);
    expect(report.blocked[0].empty.length).toBeGreaterThan(0);
  });

  it("handles an empty input", () => {
    expect(uniquenessReport([])).toEqual({ publishable: [], blocked: [] });
  });
});

describe("the field list", () => {
  it("covers all 16 countable fields from the spec", () => {
    expect(COUNTABLE_FIELDS).toHaveLength(16);
    expect(new Set(COUNTABLE_FIELDS).size).toBe(16);
  });
});
