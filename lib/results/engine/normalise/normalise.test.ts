/**
 * Normalisation, identity, validation, and timezone-correct arming.
 * Brief §14's identity-resolution, timezone-arming, validation and
 * safety-floor lines.
 */

import { describe, expect, it } from "vitest";
import { formatMs, parseRank, parseTimeToMs } from "./time";
import { decideIdentity, scoreMatch, type ExistingAthlete } from "./identity";
import {
  divisionKeyFor,
  normaliseAgeGroup,
  normaliseNationality,
  normaliseSex,
  normaliseStatus,
  parseGroupLabel,
  eventSlugFor,
  seasonKeyFor,
} from "./normaliser";
import { validateRow } from "../validate/validate";
import {
  IntervalBelowFloorError,
  MIN_LIVE_INTERVAL_SECONDS,
  assertLiveInterval,
  clampLiveInterval,
  localStartLabel,
  shouldArmLive,
  shouldDisarmLive,
} from "../sync/live";
import type { EngineEvent } from "../types";

describe("time parsing", () => {
  it("parses the formats the source actually prints", () => {
    expect(parseTimeToMs("01:02:41")).toBe(3_761_000);
    expect(parseTimeToMs("59:59")).toBe(3_599_000);
    expect(parseTimeToMs("1:02:41")).toBe(3_761_000);
    expect(parseTimeToMs("04:12.5")).toBe(252_500);
  });

  it("returns null rather than NaN or zero for a non-time", () => {
    // A zero finish time sorts to the top of a leaderboard and reads as a
    // world record, so this is the important half of the function.
    for (const value of ["DNF", "–", "-", "", "  ", "n/a", null, undefined, "banana"]) {
      expect(parseTimeToMs(value)).toBeNull();
    }
    expect(parseTimeToMs("00:00:00")).toBeNull();
    expect(parseTimeToMs("01:99:00")).toBeNull();
  });

  it("formats for the console", () => {
    expect(formatMs(3_761_000)).toBe("1:02:41");
    expect(formatMs(252_000)).toBe("04:12");
    expect(formatMs(null)).toBe("—");
  });

  it("parses ranks and refuses nonsense", () => {
    expect(parseRank("12")).toBe(12);
    expect(parseRank("—")).toBeNull();
    expect(parseRank("0")).toBeNull();
  });
});

describe("field normalisation", () => {
  it("maps sex and division codes onto our keys", () => {
    expect(normaliseSex("M")).toBe("men");
    expect(normaliseSex("W")).toBe("women");
    expect(normaliseSex("banana")).toBeNull();
    expect(divisionKeyFor("HPRO", "women")).toBe("pro-women");
    expect(divisionKeyFor("HDP", "men")).toBe("pro-doubles-men");
  });

  it("drops nationalities and age groups it cannot verify, rather than guessing", () => {
    expect(normaliseNationality("gbr")).toBe("GBR");
    expect(normaliseNationality("Great Britain")).toBeNull();
    expect(normaliseAgeGroup("30-34")).toBe("30-34");
    expect(normaliseAgeGroup("U24")).toBe("U24");
    expect(normaliseAgeGroup("veteran")).toBeNull();
  });

  it("reads DNF and DQ off the status column", () => {
    expect(normaliseStatus("DNF")).toBe("dnf");
    expect(normaliseStatus("disqualified")).toBe("dq");
    expect(normaliseStatus("")).toBe("finished");
  });

  it("builds slugs from the source's own labels", () => {
    expect(parseGroupLabel("2026 Chiba")).toEqual({ year: 2026, city: "Chiba" });
    expect(seasonKeyFor("season-9")).toBe("s9");
    expect(eventSlugFor("s9", 2026, "Hong Kong")).toBe("s9-2026-hong-kong");
  });
});

describe("athlete identity (§13)", () => {
  const base: ExistingAthlete = {
    id: "ath_1",
    slug: "james-smith",
    name: "James Smith",
    nationality: "GBR",
    gender: "men",
    sourceAthleteId: null,
    claimedByUserId: null,
    isDemo: false,
    isAnonymised: false,
    identityConfidence: 1,
    needsIdentityReview: false,
  };

  it("resolves the same athlete across two events on a stable source id", () => {
    const existing = { ...base, sourceAthleteId: "SRC-99" };
    const decision = decideIdentity(
      { name: "J. Smith", sourceAthleteId: "SRC-99" },
      [existing],
    );
    expect(decision.action).toBe("match");
    expect(decision.action === "match" && decision.athleteId).toBe("ath_1");
  });

  it("treats a conflicting source id as evidence of two different people", () => {
    const { confidence } = scoreMatch(
      { name: "James Smith", sourceAthleteId: "SRC-1" },
      { ...base, sourceAthleteId: "SRC-2" },
    );
    expect(confidence).toBe(0);
  });

  it("never merges two people who merely share a name", () => {
    // Same name, same nationality, same age group: on the available evidence
    // these are indistinguishable, and there are a lot of James Smiths.
    const decision = decideIdentity(
      { name: "James Smith", nationality: "GBR", ageGroup: "30-34" },
      [{ ...base, ageGroup: "30-34" }],
    );
    expect(decision.action).toBe("review");
    expect(decision.action === "review" && decision.athleteId).toBe("ath_1");
  });

  it("keeps different nationalities apart", () => {
    const decision = decideIdentity(
      { name: "James Smith", nationality: "AUS" },
      [base],
    );
    expect(decision.action).toBe("create");
  });

  it("creates when there is nobody to match against", () => {
    expect(decideIdentity({ name: "Alaric Fenwick" }, []).action).toBe("create");
  });
});

describe("row validation (§9)", () => {
  const ok = {
    sourceResultId: "r1",
    finishTimeMs: 3_761_000,
    roxzoneTimeMs: 374_000,
    splits: { runs: [], stations: [] },
    status: "finished",
    rankOverall: 1,
    name: "Alaric Fenwick",
  };

  it("accepts a plausible row", () => {
    expect(validateRow(ok).ok).toBe(true);
  });

  it("rejects a race nobody could have run", () => {
    const twelveSeconds = validateRow({ ...ok, finishTimeMs: 12_000 });
    expect(twelveSeconds.ok).toBe(false);
    expect(twelveSeconds.ok === false && twelveSeconds.failures[0].reason).toBe(
      "finish_time_out_of_range",
    );
  });

  it("rejects splits that cannot sum to the finish", () => {
    const runs = Array.from({ length: 8 }, (_, i) => ({ key: `run-${i + 1}`, timeMs: 260_000 }));
    const stations = Array.from({ length: 8 }, (_, i) => ({ key: `s${i}`, timeMs: 260_000 }));
    const verdict = validateRow({ ...ok, splits: { runs, stations, roxzoneMs: 300_000 } });
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.failures.some((f) => f.reason === "splits_do_not_sum")).toBe(true);
  });

  it("does not quarantine a partial live board", () => {
    // Three of eight stations done mid-race is normal, not corrupt.
    const stations = Array.from({ length: 3 }, (_, i) => ({ key: `s${i}`, timeMs: 260_000 }));
    expect(validateRow({ ...ok, splits: { runs: [], stations } }).ok).toBe(true);
  });

  it("allows a DNF to have no time", () => {
    expect(validateRow({ ...ok, status: "dnf", finishTimeMs: null }).ok).toBe(true);
  });
});

describe("timezone-aware live arming (§13)", () => {
  const sydney: EngineEvent = {
    id: "evt_syd",
    slug: "s9-2026-sydney",
    name: "HYROX Sydney 2026",
    city: "Sydney",
    country: "Australia",
    countryIso: "AU",
    region: "Oceania",
    season: "s9",
    year: 2026,
    status: "upcoming",
    // 08:00 on 4 August, Sydney time (UTC+10) — which is 22:00 UTC on the 3rd.
    startDatetime: "2026-08-03T22:00:00.000Z",
    endDatetime: "2026-08-04T07:00:00.000Z",
    tzOffsetMinutes: 600,
    startDate: "2026-08-04",
    endDate: "2026-08-04",
    athleteCount: 0,
    isDemo: false,
  };

  it("arms at the local start, not on the UTC calendar date", () => {
    // 21:30 UTC on 3 August: still the 3rd in UTC, and the event's own date
    // says the 4th. A naive "is it today?" check arms this fourteen hours late.
    expect(shouldArmLive(sydney, new Date("2026-08-03T21:30:00.000Z"))).toBe(true);
    // A full day before, it must stay disarmed.
    expect(shouldArmLive(sydney, new Date("2026-08-02T22:00:00.000Z"))).toBe(false);
  });

  it("keeps polling through the race and stops after the tail", () => {
    expect(shouldArmLive(sydney, new Date("2026-08-04T03:00:00.000Z"))).toBe(true);
    expect(shouldArmLive(sydney, new Date("2026-08-04T09:00:00.000Z"))).toBe(true);
    expect(shouldArmLive(sydney, new Date("2026-08-04T20:00:00.000Z"))).toBe(false);
    expect(shouldDisarmLive(sydney, new Date("2026-08-04T20:00:00.000Z"))).toBe(true);
  });

  it("prints the local wall clock for the console", () => {
    expect(localStartLabel(sydney)).toBe("2026-08-04 08:00");
  });

  it("never arms an event that has finalised", () => {
    expect(
      shouldArmLive({ ...sydney, status: "final" }, new Date("2026-08-04T03:00:00.000Z")),
    ).toBe(false);
  });
});

describe("live interval safety floor (§12, §14)", () => {
  it("rejects an interval below the floor server-side", () => {
    expect(() => assertLiveInterval(5)).toThrow(IntervalBelowFloorError);
    expect(() => assertLiveInterval(14)).toThrow(/safety floor/);
  });

  it("accepts anything at or above the floor", () => {
    expect(assertLiveInterval(MIN_LIVE_INTERVAL_SECONDS)).toBe(15);
    expect(assertLiveInterval(60)).toBe(60);
  });

  it("clamps rather than trusts a stored value", () => {
    // Defence in depth: even a row written straight into the database by hand
    // cannot make the poller aggressive.
    expect(clampLiveInterval(1)).toBe(15);
    expect(clampLiveInterval(Number.NaN)).toBe(20);
  });
});
