import { describe, it, expect } from "vitest";
import {
  median, courseBaseline, rateCourses, describeRating, type EditionSample,
} from "./course-index";

/**
 * A field of roughly `n` finishers whose median is exactly `centre` and whose
 * fastest is exactly `winner`.
 *
 * The count is forced odd so the median is a real member of the set rather
 * than the mean of the middle pair — otherwise the fixture lands a second off
 * `centre` and the assertions have to be approximate for no good reason.
 */
function field(n: number, centre: number, winner: number): number[] {
  const half = Math.max(1, Math.floor((n - 1) / 2));
  const times = [centre];
  for (let i = 1; i <= half; i++) times.push(centre - i, centre + i);
  // The winner replaces the fastest of the symmetric spread, keeping the count
  // odd and leaving the median untouched.
  times[times.indexOf(centre - half)] = winner;
  return times;
}

function sample(over: Partial<EditionSample> & { finishTimes: number[] }): EditionSample {
  return {
    eventSlug: "s8-2025-london", eventName: "HYROX London 2025", city: "London",
    citySlug: "london", country: "United Kingdom", countryIso: "gb",
    venue: "ExCeL", season: "S8", year: 2025,
    ...over,
  };
}

describe("median", () => {
  it("returns 0 for an empty array rather than NaN", () => {
    expect(median([])).toBe(0);
  });

  it("averages the middle pair on an even count", () => {
    expect(median([10, 20, 30, 40])).toBe(25);
  });

  it("does not mutate its input", () => {
    const input = [3, 1, 2];
    median(input);
    expect(input).toEqual([3, 1, 2]);
  });
});

describe("courseBaseline", () => {
  it("weights every edition equally, not every finisher", () => {
    // One enormous fast race and two small slow ones. Pooling all finishers
    // would let the big race define "normal"; a median of medians must not.
    const samples = [
      sample({ finishTimes: field(5000, 4800, 3600) }),
      sample({ finishTimes: field(200, 6000, 4200) }),
      sample({ finishTimes: field(200, 6200, 4300) }),
    ];
    const baseline = courseBaseline(samples);
    expect(baseline.medianSeconds).toBe(6000);
    expect(baseline.editions).toBe(3);
  });

  it("excludes fields too small to have a stable median", () => {
    const samples = [
      sample({ finishTimes: field(300, 5400, 3900) }),
      sample({ finishTimes: field(4, 9000, 8000) }),
    ];
    expect(courseBaseline(samples).editions).toBe(1);
  });
});

describe("rateCourses", () => {
  const baseline = { medianSeconds: 5400, winnerSeconds: 3600, editions: 10 };

  it("reads agreement between the front and the middle as a course signal", () => {
    // Both the median and the winner ran ~5% slow: the pattern a hard venue
    // makes, because the winner is the part least sensitive to who entered.
    const [rating] = rateCourses(
      [sample({ finishTimes: field(400, 5670, 3780) })],
      baseline,
    );
    expect(rating.medianIndex).toBeCloseTo(5, 0);
    expect(rating.winnerIndex).toBeCloseTo(5, 0);
    expect(rating.signal).toBe("course");
  });

  it("reads a slow median with a normal winner as a field signal", () => {
    const [rating] = rateCourses(
      [sample({ finishTimes: field(400, 5940, 3600) })],
      baseline,
    );
    expect(rating.medianIndex).toBeCloseTo(10, 0);
    expect(rating.winnerIndex).toBe(0);
    expect(rating.signal).toBe("field");
  });

  it("calls a race within the noise floor par rather than ranking it", () => {
    const [rating] = rateCourses(
      [sample({ finishTimes: field(400, 5410, 3605) })],
      baseline,
    );
    expect(rating.signal).toBe("par");
  });

  it("does not require the two columns to move together in opposite directions", () => {
    // Median slow, winner fast — that is not a course effect, and treating it
    // as one would be the easy bug: both are above the threshold.
    const [rating] = rateCourses(
      [sample({ finishTimes: field(400, 5700, 3400) })],
      baseline,
    );
    expect(rating.signal).not.toBe("course");
  });

  it("drops fields below the sample threshold entirely", () => {
    expect(rateCourses([sample({ finishTimes: field(20, 5400, 3600) })], baseline))
      .toHaveLength(0);
  });

  it("ranks the slowest race first, because that is the question asked", () => {
    const ratings = rateCourses(
      [
        sample({ eventSlug: "fast", finishTimes: field(400, 5100, 3500) }),
        sample({ eventSlug: "slow", finishTimes: field(400, 5900, 3900) }),
      ],
      baseline,
    );
    expect(ratings.map((r) => r.eventSlug)).toEqual(["slow", "fast"]);
  });

  it("survives a zero baseline instead of emitting Infinity", () => {
    const [rating] = rateCourses(
      [sample({ finishTimes: field(400, 5400, 3600) })],
      { medianSeconds: 0, winnerSeconds: 0, editions: 0 },
    );
    expect(rating.medianIndex).toBe(0);
    expect(rating.winnerIndex).toBe(0);
  });
});

describe("describeRating", () => {
  const baseline = { medianSeconds: 5400, winnerSeconds: 3600, editions: 10 };

  it("attributes an agreeing pair to the venue", () => {
    const [rating] = rateCourses(
      [sample({ finishTimes: field(400, 5670, 3780) })],
      baseline,
    );
    expect(describeRating(rating)).toContain("venue is the likelier explanation");
  });

  it("attributes a lone median move to the entry list", () => {
    const [rating] = rateCourses(
      [sample({ finishTimes: field(400, 5940, 3600) })],
      baseline,
    );
    expect(describeRating(rating)).toContain("who entered");
  });
});
