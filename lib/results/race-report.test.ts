import { describe, it, expect } from "vitest";
import {
  buildSegments, buildPotentialBands, projectPotentialFinish, assessRunning,
  buildPaceStory, benchmarkSplits, compareToPrevious, projectNextRace,
  buildRacePlan, BAND_ORDER,
} from "./race-report";
import { buildDistribution } from "./percentiles";
import { STATION_IDS, type StationId } from "./model";

/** A synthetic station distribution centred on `centre` with a given spread. */
function dist(centre: number, spread: number, n = 401) {
  const samples: number[] = [];
  for (let i = 0; i < n; i++) {
    samples.push(Math.round(centre + ((i - (n - 1) / 2) / ((n - 1) / 2)) * spread));
  }
  return buildDistribution(samples);
}

function stationMap(value: number): Record<StationId, number> {
  return Object.fromEntries(STATION_IDS.map((s) => [s, value])) as Record<StationId, number>;
}

const RUNS = [240, 250, 252, 248, 255, 253, 258, 270];
const AVG_RUNS = [250, 255, 255, 255, 255, 255, 255, 265];

describe("buildSegments", () => {
  const segments = buildSegments(
    RUNS, stationMap(200), 300, AVG_RUNS, stationMap(210), 320,
  );

  it("alternates run and station in race order, roxzone last", () => {
    expect(segments[0].label).toBe("Run 1");
    expect(segments[1].kind).toBe("station");
    expect(segments[segments.length - 1].key).toBe("roxzone");
  });

  it("carries 17 segments: eight runs, eight stations, one roxzone", () => {
    expect(segments).toHaveLength(17);
  });
});

describe("buildPotentialBands", () => {
  const distributions = Object.fromEntries(
    STATION_IDS.map((s) => [s, dist(200, 60)]),
  ) as Record<StationId, ReturnType<typeof dist>>;

  it("orders the band edges fastest to slowest", () => {
    const [band] = buildPotentialBands(stationMap(200), distributions, 50);
    for (let i = 1; i < band.edges.length; i++) {
      expect(band.edges[i]).toBeGreaterThanOrEqual(band.edges[i - 1]);
    }
  });

  it("puts an athlete matching their own standard in the expected band", () => {
    // 50th-percentile athlete posting the 50th-percentile station time.
    const [band] = buildPotentialBands(stationMap(200), distributions, 50);
    expect(band.band).toBe("expected");
  });

  it("reads a split well ahead of the athlete's standard as excellent", () => {
    const [band] = buildPotentialBands(stationMap(150), distributions, 50);
    expect(band.band).toBe("excellent");
  });

  it("reads a split well behind the athlete's standard as an off day", () => {
    const [band] = buildPotentialBands(stationMap(255), distributions, 50);
    expect(band.band).toBe("poor");
  });

  it("does not ask for a percentile above 99 for an elite athlete", () => {
    // 95 + 18 would be the 113th percentile; it must clamp rather than break.
    const [band] = buildPotentialBands(stationMap(150), distributions, 95);
    expect(band.edges.every((e) => Number.isFinite(e))).toBe(true);
  });

  it("skips stations with no distribution rather than inventing edges", () => {
    const bands = buildPotentialBands(stationMap(200), { "ski-erg": dist(200, 60) }, 50);
    expect(bands).toHaveLength(1);
  });

  it("skips a station the athlete has no time for", () => {
    expect(buildPotentialBands(stationMap(0), distributions, 50)).toHaveLength(0);
  });
});

describe("projectPotentialFinish", () => {
  const distributions = Object.fromEntries(
    STATION_IDS.map((s) => [s, dist(200, 60)]),
  ) as Record<StationId, ReturnType<typeof dist>>;

  it("measures every station against the athlete's own best, not perfection", () => {
    const stations = stationMap(200);
    stations["ski-erg"] = 160; // one strong station sets the ceiling
    const bands = buildPotentialBands(stations, distributions, 50);
    const potential = projectPotentialFinish(bands, distributions, 5400)!;

    expect(potential.ceilingStation).toBe("SkiErg");
    expect(potential.potentialSeconds).toBeLessThan(5400);
    // The ceiling station itself contributes nothing to find.
    expect(potential.gaps.some((g) => g.station === "ski-erg")).toBe(false);
  });

  it("finds nothing when every station already sits at the same level", () => {
    const bands = buildPotentialBands(stationMap(200), distributions, 50);
    const potential = projectPotentialFinish(bands, distributions, 5400)!;
    expect(potential.secondsAvailable).toBe(0);
    expect(potential.potentialSeconds).toBe(5400);
  });

  it("returns null with nothing to analyse", () => {
    expect(projectPotentialFinish([], {}, 5400)).toBeNull();
  });
});

describe("assessRunning", () => {
  it("excludes runs 1 and 8 from the variation", () => {
    // Runs 1 and 8 are wild; 2-7 are metronomic. Variation must be near zero.
    const assessment = assessRunning([100, 250, 250, 250, 250, 250, 250, 400])!;
    expect(assessment.variationPercent).toBe(0);
    expect(assessment.band).toBe("excellent");
    expect(assessment.countedIndexes).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("bands a ragged set of runs as poor", () => {
    const assessment = assessRunning([240, 200, 300, 210, 320, 205, 310, 260])!;
    expect(assessment.variationPercent).toBeGreaterThan(8);
    expect(assessment.band).toBe("poor");
  });

  it("measures the fade across the two halves", () => {
    const assessment = assessRunning([240, 240, 240, 240, 260, 260, 260, 260])!;
    expect(assessment.fadeSeconds).toBe(80);
  });

  it("names the fastest and slowest runs by index", () => {
    const assessment = assessRunning([250, 240, 260, 250, 250, 250, 250, 250])!;
    expect(assessment.fastestIndex).toBe(1);
    expect(assessment.slowestIndex).toBe(2);
  });

  it("returns null when the runs are not a full set", () => {
    expect(assessRunning([240, 250])).toBeNull();
  });
});

describe("buildPaceStory", () => {
  const segments = buildSegments(
    RUNS, stationMap(200), 300, AVG_RUNS, stationMap(210), 320,
  );

  it("omits the roxzone, which is a total rather than a moment", () => {
    const story = buildPaceStory(segments);
    expect(story.some((c) => c.label === "Roxzone")).toBe(false);
    expect(story).toHaveLength(16);
  });

  it("accumulates elapsed time in race order", () => {
    const story = buildPaceStory(segments);
    expect(story[0].elapsedSeconds).toBe(RUNS[0] + Math.round(300 / 16));
    for (let i = 1; i < story.length; i++) {
      expect(story[i].elapsedSeconds).toBeGreaterThan(story[i - 1].elapsedSeconds);
    }
  });

  it("projects a falling line when the athlete keeps beating the average", () => {
    // Every segment 10% faster than the division: the projection should improve.
    const fast = buildSegments(
      AVG_RUNS.map((s) => s * 0.9), stationMap(189), 288,
      AVG_RUNS, stationMap(210), 320,
    );
    const story = buildPaceStory(fast);
    expect(story[story.length - 1].projectedFinishSeconds)
      .toBeLessThan(story[0].projectedFinishSeconds);
  });

  it("ends on the athlete's real elapsed time, not an estimate", () => {
    const story = buildPaceStory(segments);
    const last = story[story.length - 1];
    // Nothing remains to project at the final segment.
    expect(last.projectedFinishSeconds).toBe(last.elapsedSeconds);
  });
});

describe("benchmarkSplits", () => {
  const segments = buildSegments(
    RUNS, stationMap(200), 300, AVG_RUNS, stationMap(210), 320,
  );

  it("measures against both the fastest split and the winner", () => {
    const marks = benchmarkSplits(
      segments, { "run-1": 220, "ski-erg": 180 }, { "run-1": 230, "ski-erg": 190 },
    );
    const run1 = marks.find((m) => m.label === "Run 1")!;
    expect(run1.deltaToFastest).toBe(20);
    expect(run1.deltaToWinner).toBe(10);
  });

  it("reports zero rather than a nonsense delta when a benchmark is missing", () => {
    const marks = benchmarkSplits(segments, {}, {});
    expect(marks.every((m) => m.deltaToFastest === 0)).toBe(true);
  });
});

describe("compareToPrevious", () => {
  const current = buildSegments(RUNS, stationMap(200), 300, AVG_RUNS, stationMap(210), 320);
  const previous = buildSegments(RUNS, stationMap(220), 340, AVG_RUNS, stationMap(210), 320);

  it("nets the difference across every matched segment", () => {
    const cmp = compareToPrevious(current, previous)!;
    // Eight stations 20s faster each, plus 40s off the roxzone.
    expect(cmp.netSeconds).toBe(-200);
    expect(cmp.improved).toBe(9);
    expect(cmp.regressed).toBe(0);
  });

  it("names the biggest gain and loss", () => {
    const worse = buildSegments(RUNS, stationMap(200), 200, AVG_RUNS, stationMap(210), 320);
    const cmp = compareToPrevious(current, worse)!;
    expect(cmp.biggestLoss?.label).toBe("Roxzone");
    expect(cmp.biggestGain).toBeNull();
  });

  it("returns null when there is no previous race", () => {
    expect(compareToPrevious(current, [])).toBeNull();
  });

  it("ignores segments missing from either race rather than treating them as zero", () => {
    const partial = [{ ...current[0], seconds: 0 }];
    expect(compareToPrevious(current, partial)).toBeNull();
  });
});

describe("projectNextRace", () => {
  it("says so plainly when there is only one race", () => {
    const p = projectNextRace([5400], 600)!;
    expect(p.basis).toBe("single-race");
    expect(p.note).toContain("one race");
    expect(p.bands.find((b) => b.name === "expected")!.seconds).toBe(5400);
  });

  it("fits a trend once there are three races and extrapolates forward", () => {
    const p = projectNextRace([5700, 5550, 5400], 600)!;
    expect(p.basis).toBe("history");
    expect(p.trendPerRace).toBe(-150);
    // Next race projected beyond the last one along the same line.
    expect(p.bands.find((b) => b.name === "expected")!.seconds).toBe(5250);
    expect(p.note).toContain("faster");
  });

  it("gives a consistent athlete a tighter range than a streaky one", () => {
    const steady = projectNextRace([5400, 5400, 5400, 5400], 600)!;
    const streaky = projectNextRace([5400, 6000, 5100, 5700], 600)!;
    const width = (p: typeof steady) =>
      p.bands[p.bands.length - 1].seconds - p.bands[0].seconds;
    expect(width(steady)).toBeLessThan(width(streaky));
  });

  it("orders the bands fastest to slowest", () => {
    const p = projectNextRace([5700, 5550, 5400], 600)!;
    expect(p.bands.map((b) => b.name)).toEqual(BAND_ORDER);
    for (let i = 1; i < p.bands.length; i++) {
      expect(p.bands[i].seconds).toBeGreaterThan(p.bands[i - 1].seconds);
    }
  });

  it("returns null with no finish times at all", () => {
    expect(projectNextRace([], 600)).toBeNull();
  });
});

describe("buildRacePlan", () => {
  const segments = buildSegments(RUNS, stationMap(200), 300, AVG_RUNS, stationMap(210), 320);
  const total = segments.reduce((s, x) => s + x.seconds, 0);

  it("hits the goal time", () => {
    const room = Object.fromEntries(segments.map((s) => [s.key, 30]));
    const plan = buildRacePlan(segments, total - 120, room);
    expect(plan[plan.length - 1].cumulativeSeconds).toBeCloseTo(total - 120, -1);
  });

  it("takes more from the segments with the most room", () => {
    const room = Object.fromEntries(segments.map((s) => [s.key, 0]));
    room["ski-erg"] = 100;
    const plan = buildRacePlan(segments, total - 60, room);
    const ski = plan.find((p) => p.label === "SkiErg")!;
    const run1 = plan.find((p) => p.label === "Run 1")!;
    expect(ski.deltaSeconds).toBeLessThan(-50);
    expect(run1.deltaSeconds).toBe(0);
  });

  it("holds every split when there is no room anywhere", () => {
    const plan = buildRacePlan(segments, total - 300, Object.fromEntries(
      segments.map((s) => [s.key, 0]),
    ));
    expect(plan.every((p) => p.deltaSeconds === 0)).toBe(true);
  });

  it("never targets a negative or zero split", () => {
    const room = Object.fromEntries(segments.map((s) => [s.key, 10_000]));
    const plan = buildRacePlan(segments, 1, room);
    expect(plan.every((p) => p.targetSeconds >= 1)).toBe(true);
  });
});
