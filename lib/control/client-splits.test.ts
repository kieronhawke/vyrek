import { describe, expect, it } from "vitest";
import {
  emptySplits,
  formatTime,
  improvingCount,
  parseTime,
  recordedCount,
  splitsFor,
  trendOf,
  type ClientSplit,
} from "./client-splits";

const split = (over: Partial<ClientSplit> = {}): ClientSplit => ({
  station: "ski-erg",
  seconds: 252,
  previousSeconds: 260,
  ...over,
});

describe("reading a time somebody typed", () => {
  it("takes the forms a coach actually types", () => {
    expect(parseTime("4:12")).toBe(252);
    expect(parseTime("72")).toBe(72);
    expect(parseTime("1:02:03")).toBe(3723);
    expect(parseTime(" 4:12 ")).toBe(252);
  });

  /**
   * The one that matters. "4:75" is somebody typing over the top of "4:15",
   * and reading it as five and a quarter minutes puts a number on an
   * athlete's progress screen that nobody meant and nobody can spot.
   */
  it("refuses minutes and seconds past 59", () => {
    expect(parseTime("4:75")).toBeNull();
    expect(parseTime("1:75:00")).toBeNull();
  });

  /* Null, never NaN. NaN propagates silently through the arithmetic and
     surfaces as a blank with nothing to explain it. */
  it("returns null for anything it cannot read", () => {
    for (const bad of ["", "   ", "abc", "4:1a", "-30", "4::12", "0", "0:00"]) {
      expect(parseTime(bad), bad).toBeNull();
    }
  });

  /* Catches a digit typed twice without rejecting a real finish time from
     a caller that shares the parser. */
  it("refuses a time no race could take", () => {
    expect(parseTime("11:00:00")).toBeNull();
    expect(parseTime("1:12:40")).toBe(4360);
  });
});

describe("writing one back out", () => {
  it("round-trips what it parsed", () => {
    for (const text of ["4:12", "0:45", "12:00"]) {
      expect(formatTime(parseTime(text))).toBe(text);
    }
  });

  it("grows an hours field only when it needs one", () => {
    expect(formatTime(3723)).toBe("1:02:03");
    expect(formatTime(252)).toBe("4:12");
  });

  it("has nothing to say about nothing", () => {
    expect(formatTime(null)).toBe("");
    expect(formatTime(0)).toBe("");
  });
});

describe("the trend", () => {
  /* Derived, not typed. A hand-entered delta drifts from the two times it
     claims to describe the moment either one is edited. */
  it("is the subtraction, in the athlete's words", () => {
    expect(trendOf(split())).toMatchObject({
      deltaSeconds: -8,
      text: "8s faster",
      direction: "faster",
    });
    expect(trendOf(split({ seconds: 264 }))).toMatchObject({
      text: "4s slower",
      direction: "slower",
    });
  });

  it("says level rather than 0s faster", () => {
    expect(trendOf(split({ seconds: 260 })).text).toBe("level");
  });

  /* No claim without both ends. "Faster" measured against nothing is the
     kind of confident wrong statement a reader cannot catch. */
  it("makes no claim when either end is missing", () => {
    expect(trendOf(split({ previousSeconds: null })).direction).toBe("unknown");
    expect(trendOf(split({ seconds: null })).text).toBeNull();
  });
});

describe("counting", () => {
  const base = emptySplits("a1", "2026-08-04");

  it("counts only what has been recorded", () => {
    expect(recordedCount(base)).toBe(0);
    const one = {
      ...base,
      splits: base.splits.map((s, i) => (i === 0 ? { ...s, seconds: 252 } : s)),
    };
    expect(recordedCount(one)).toBe(1);
  });

  /**
   * "6 of 8 stations are faster" counts over comparable stations only.
   * Counting a station with no previous time as "not faster" quietly punishes
   * an athlete for a gap in Ben's data entry.
   */
  it("does not hold missing history against the athlete", () => {
    const s = {
      ...base,
      splits: base.splits.map((x, i) =>
        i < 3
          ? { ...x, seconds: 250 + i, previousSeconds: 260 }
          : { ...x, seconds: 250, previousSeconds: null },
      ),
    };
    expect(improvingCount(s)).toEqual({ faster: 3, of: 3 });
  });

  it("counts nothing when nothing is recorded", () => {
    expect(improvingCount(base)).toEqual({ faster: 0, of: 0 });
  });
});

describe("looking a client up", () => {
  it("returns a blank set rather than undefined", () => {
    const blank = splitsFor([], "a1", "2026-08-04");
    expect(blank.id).toBe("a1");
    expect(blank.splits).toHaveLength(8);
    expect(recordedCount(blank)).toBe(0);
  });

  it("returns the stored one when there is one", () => {
    const stored = { ...emptySplits("a1", "2026-01-01"), updated: "2026-07-01" };
    expect(splitsFor([stored], "a1", "2026-08-04").updated).toBe("2026-07-01");
  });
});
