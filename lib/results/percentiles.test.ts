import { describe, it, expect } from "vitest";
import {
  buildDistribution,
  percentileOf,
  timeAtPercentile,
  rankBand,
} from "./percentiles";

/** 1..100 seconds — makes percentile arithmetic checkable by hand. */
const linear = Array.from({ length: 100 }, (_, i) => i + 1);

describe("buildDistribution", () => {
  it("summarises a known set", () => {
    const d = buildDistribution(linear);
    expect(d.count).toBe(100);
    expect(d.min).toBe(1);
    expect(d.max).toBe(100);
    expect(d.mean).toBeCloseTo(50.5, 6);
    expect(d.samples[0]).toBe(1);
  });

  it("sorts unsorted input", () => {
    const d = buildDistribution([30, 10, 20]);
    expect(d.samples).toEqual([10, 20, 30]);
  });

  it("drops non-finite and non-positive values", () => {
    const d = buildDistribution([10, NaN, -5, 0, 20, Infinity]);
    expect(d.samples).toEqual([10, 20]);
  });

  it("survives an empty set without throwing", () => {
    const d = buildDistribution([]);
    expect(d.count).toBe(0);
    expect(percentileOf(d, 60)).toBe(0);
  });

  it("buckets every sample into the histogram exactly once", () => {
    const d = buildDistribution(linear, 10);
    const total = d.histogram.reduce((sum, b) => sum + b.count, 0);
    expect(total).toBe(100);
    expect(d.histogram).toHaveLength(10);
  });
});

describe("percentileOf", () => {
  it("puts the fastest time at the top of the field", () => {
    const d = buildDistribution(linear);
    // Beats 99 of 100, ties with itself (counted as half): 99.5
    expect(percentileOf(d, 1)).toBeCloseTo(99.5, 6);
  });

  it("puts the slowest time at the bottom", () => {
    const d = buildDistribution(linear);
    expect(percentileOf(d, 100)).toBeCloseTo(0.5, 6);
  });

  it("puts the median in the middle", () => {
    const d = buildDistribution(linear);
    expect(percentileOf(d, 50)).toBeCloseTo(50.5, 6);
  });

  it("is lower-is-better: a faster time always scores higher", () => {
    const d = buildDistribution(linear);
    expect(percentileOf(d, 20)).toBeGreaterThan(percentileOf(d, 80));
  });

  it("gives tied times the same percentile", () => {
    const d = buildDistribution([10, 20, 20, 20, 30]);
    expect(percentileOf(d, 20)).toBeCloseTo(percentileOf(d, 20), 10);
    // 1 slower, 3 equal -> (1 + 1.5) / 5 = 50%
    expect(percentileOf(d, 20)).toBeCloseTo(50, 6);
  });

  it("handles a time outside the observed range", () => {
    const d = buildDistribution(linear);
    expect(percentileOf(d, 0.5)).toBe(100);
    expect(percentileOf(d, 500)).toBe(0);
  });
});

describe("timeAtPercentile", () => {
  it("round-trips against percentileOf", () => {
    const d = buildDistribution(linear);
    for (const p of [10, 25, 50, 75, 90]) {
      const t = timeAtPercentile(d.samples, p);
      expect(percentileOf(d, t)).toBeCloseTo(p, 0);
    }
  });

  it("returns the fastest time at the 100th percentile", () => {
    expect(timeAtPercentile(linear, 100)).toBe(1);
  });

  it("returns the slowest time at the 0th percentile", () => {
    expect(timeAtPercentile(linear, 0)).toBe(100);
  });

  it("clamps out-of-range percentiles", () => {
    expect(timeAtPercentile(linear, 150)).toBe(1);
    expect(timeAtPercentile(linear, -20)).toBe(100);
  });
});

describe("rankBand", () => {
  it("bands by position in the field", () => {
    expect(rankBand(1, 1000)).toBe("top-1");
    expect(rankBand(30, 1000)).toBe("top-5");
    expect(rankBand(80, 1000)).toBe("top-10");
    expect(rankBand(200, 1000)).toBe("top-25");
    expect(rankBand(400, 1000)).toBe("top-50");
    expect(rankBand(900, 1000)).toBe("field");
  });

  it("treats the winner of a small field as top-1", () => {
    expect(rankBand(1, 20)).toBe("top-1");
  });

  it("degrades safely on nonsense input", () => {
    expect(rankBand(0, 0)).toBe("field");
    expect(rankBand(-1, 100)).toBe("field");
  });
});
