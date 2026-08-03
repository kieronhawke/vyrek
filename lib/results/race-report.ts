/**
 * The race report.
 *
 * The paid equivalent in this market costs $24.99 and is built on what it calls
 * a "machine learning simulation engine" — a black box. Nothing here is a black
 * box. Every figure is derived from published results by a method stated on the
 * page, because a number an athlete cannot interrogate is a number they cannot
 * train against, and because we cannot honestly claim a model we have not built.
 *
 * The anchor idea, used by most of this module:
 *
 *   **An athlete's overall percentile is their standard. A segment where they
 *   sit above that standard is a strength; below it, a weakness.**
 *
 * That is one sentence, it is checkable, and it is what makes the report
 * actionable — "you are a 78th-percentile athlete running a 41st-percentile
 * sled push" tells you where the next minute lives. A raw split does not.
 *
 * Everything is pure. Fetching lives in the page.
 */

import { STATION_IDS, STATION_LABEL, type StationId } from "./model";
import type { Distribution } from "./percentiles";
import { percentileOf, timeAtPercentile } from "./percentiles";

/* ── Segment model ──────────────────────────────────────────────────── */

export type SegmentKind = "run" | "station" | "roxzone";

export type Segment = {
  key: string;
  label: string;
  kind: SegmentKind;
  station?: StationId;
  seconds: number;
  /** The division's average for this segment at this event. */
  averageSeconds: number;
  /**
   * True when the organiser never published this split.
   *
   * ⚠️ THIS EXISTS BECAUSE MISSING DATA USED TO READ AS A WORLD-CLASS TIME.
   *
   * Splits arrived as `stations[station] ?? 0`, so a station the organiser
   * never published became a **zero-second** split. Zero is not a neutral
   * value here — it is the fastest possible one. A missing SkiErg was scored
   * 3:40 faster than the division average, banded "Excellent", drawn at the
   * 100th percentile on the radar, and reported back to the athlete as their
   * strongest station. On a page whose entire promise is "every figure states
   * its own derivation", silently inventing a personal best is the worst thing
   * it could do.
   *
   * `seconds` stays 0 so layout maths and totals do not have to handle null
   * everywhere. Anything that *ranks, bands, or compares* must skip these —
   * that is what this flag is for.
   */
  missing?: boolean;
};

/** Race order: run 1, station 1, run 2, station 2 … then roxzone as a total. */
export function buildSegments(
  runs: number[],
  stations: Record<StationId, number>,
  roxzoneSeconds: number,
  averageRuns: number[],
  averageStations: Record<StationId, number>,
  averageRoxzone: number,
): Segment[] {
  const segments: Segment[] = [];
  // A split is "missing" when it is absent, null, or non-positive. Zero is
  // treated as absent rather than as a time, because no segment of a HYROX
  // takes zero seconds — a 0 in the feed always means "not recorded".
  const absent = (v: number | undefined | null): boolean =>
    v === undefined || v === null || !Number.isFinite(v) || v <= 0;

  STATION_IDS.forEach((station, i) => {
    segments.push({
      key: `run-${i + 1}`, label: `Run ${i + 1}`, kind: "run",
      seconds: absent(runs[i]) ? 0 : runs[i],
      averageSeconds: averageRuns[i] ?? 0,
      missing: absent(runs[i]),
    });
    segments.push({
      key: station, label: STATION_LABEL[station], kind: "station", station,
      seconds: absent(stations[station]) ? 0 : stations[station],
      averageSeconds: averageStations[station] ?? 0,
      missing: absent(stations[station]),
    });
  });
  segments.push({
    key: "roxzone", label: "Roxzone", kind: "roxzone",
    seconds: absent(roxzoneSeconds) ? 0 : roxzoneSeconds,
    averageSeconds: averageRoxzone,
    missing: absent(roxzoneSeconds),
  });
  return segments;
}

/* ── Performance against your own standard ──────────────────────────── */

export type BandName = "excellent" | "great" | "expected" | "subpar" | "poor";

/** Fast → slow. Mirrors the industry's five-band language so it reads familiar. */
export const BAND_ORDER: BandName[] = ["excellent", "great", "expected", "subpar", "poor"];

export const BAND_LABEL: Record<BandName, string> = {
  excellent: "Excellent",
  great: "Great",
  expected: "Expected",
  subpar: "Below par",
  poor: "Off day",
};

export type PotentialBand = {
  station: StationId;
  label: string;
  actualSeconds: number;
  /** Where this split sits in the division, 0–100, higher is faster. */
  percentile: number;
  /** Band edges fast→slow, five entries, in seconds. */
  edges: number[];
  band: BandName;
  /** Seconds against the "expected" edge. Negative means faster. */
  deltaToExpected: number;
};

/**
 * How the band edges are chosen.
 *
 * `overallPercentile` is the athlete's standing in the division for the whole
 * race. We read each station's distribution at that same percentile to get the
 * time "someone of your standard" typically posts — that is the `expected`
 * edge. The other four edges are the same distribution read at percentiles
 * shifted around it.
 *
 * The shift is in percentile space rather than seconds, which matters: ten
 * percentile points is worth far more time on the sled push than on the ski
 * erg, and a fixed ±5% in seconds would flatter the stations with the widest
 * spread and punish the tightest.
 */
const BAND_SHIFTS: Record<BandName, number> = {
  excellent: +18,
  great: +9,
  expected: 0,
  subpar: -9,
  poor: -18,
};

export function buildPotentialBands(
  stations: Record<StationId, number>,
  distributions: Partial<Record<StationId, Distribution>>,
  overallPercentile: number,
): PotentialBand[] {
  const bands: PotentialBand[] = [];

  for (const station of STATION_IDS) {
    const dist = distributions[station];
    const actual = stations[station] ?? 0;
    if (!dist || dist.samples.length === 0 || actual <= 0) continue;

    const edges = BAND_ORDER.map((name) => {
      // Clamped: a 95th-percentile athlete shifted +18 would ask for the 113th.
      const p = Math.max(1, Math.min(99, overallPercentile + BAND_SHIFTS[name]));
      // `timeAtPercentile` takes "faster than N%", so a higher percentile is a
      // faster time — which is why these come out already ordered fast→slow.
      return timeAtPercentile(dist.samples, p);
    });

    const percentile = percentileOf(dist, actual);
    const expected = edges[BAND_ORDER.indexOf("expected")];

    // First band the time is at least as fast as. Slower than every edge → off day.
    let band: BandName = "poor";
    for (let i = 0; i < BAND_ORDER.length; i++) {
      if (actual <= edges[i]) { band = BAND_ORDER[i]; break; }
    }

    bands.push({
      station,
      label: STATION_LABEL[station],
      actualSeconds: actual,
      percentile,
      edges,
      band,
      deltaToExpected: Math.round(actual - expected),
    });
  }

  return bands;
}

/**
 * What the race would have been with every segment at your own best standard.
 *
 * Deliberately *not* "if you were perfect". The ceiling is the athlete's own
 * strongest station percentile, already demonstrated in this race, so the
 * number is defensible: they have proved they can operate at that level on the
 * day. Anything higher would be a fantasy figure dressed as analysis.
 */
export type PotentialFinish = {
  /** The percentile the whole race is measured against. */
  ceilingPercentile: number;
  ceilingStation: string;
  actualSeconds: number;
  potentialSeconds: number;
  secondsAvailable: number;
  /** Biggest contributors, slowest-relative-to-ceiling first. */
  gaps: { label: string; station: StationId; secondsAvailable: number }[];
};

export function projectPotentialFinish(
  bands: PotentialBand[],
  distributions: Partial<Record<StationId, Distribution>>,
  actualFinishSeconds: number,
): PotentialFinish | null {
  if (bands.length === 0) return null;

  const best = bands.reduce((a, b) => (b.percentile > a.percentile ? b : a));
  const ceiling = best.percentile;

  const gaps: PotentialFinish["gaps"] = [];
  let saved = 0;

  for (const band of bands) {
    const dist = distributions[band.station];
    if (!dist) continue;
    const atCeiling = timeAtPercentile(dist.samples, ceiling);
    const gain = band.actualSeconds - atCeiling;
    if (gain <= 0) continue;
    saved += gain;
    gaps.push({
      label: band.label,
      station: band.station,
      secondsAvailable: Math.round(gain),
    });
  }

  gaps.sort((a, b) => b.secondsAvailable - a.secondsAvailable);

  return {
    ceilingPercentile: Math.round(ceiling),
    ceilingStation: best.label,
    actualSeconds: actualFinishSeconds,
    potentialSeconds: Math.round(actualFinishSeconds - saved),
    secondsAvailable: Math.round(saved),
    gaps: gaps.slice(0, 5),
  };
}

/* ── Running assessment ─────────────────────────────────────────────── */

export type RunAssessment = {
  /** Coefficient of variation across runs 2–7, as a percentage. */
  variationPercent: number;
  band: BandName;
  runs: number[];
  /** Runs 1 and 8 are excluded from the variation; flagged so the chart can dim them. */
  countedIndexes: number[];
  fastestIndex: number;
  slowestIndex: number;
  meanCountedSeconds: number;
  firstHalfSeconds: number;
  secondHalfSeconds: number;
  fadeSeconds: number;
};

/**
 * Runs 1 and 8 are excluded, and this is the industry convention for a good
 * reason rather than a copied quirk. Run 1 varies with where the start line
 * sits relative to the first station, and run 8 absorbs the transition into
 * wall balls. Including either measures the venue, not the athlete.
 */
const COUNTED_RUNS = [1, 2, 3, 4, 5, 6];

/** Cut-offs for the variation bands, in percent. */
const VARIATION_BANDS: [BandName, number][] = [
  ["excellent", 3],
  ["great", 4.5],
  ["expected", 6],
  ["subpar", 8],
  ["poor", Infinity],
];

export function assessRunning(runs: number[]): RunAssessment | null {
  if (runs.length < 8) return null;

  const counted = COUNTED_RUNS.map((i) => runs[i]).filter((s) => s > 0);
  if (counted.length < 2) return null;

  const mean = counted.reduce((s, v) => s + v, 0) / counted.length;
  const variance = counted.reduce((s, v) => s + (v - mean) ** 2, 0) / counted.length;
  const cv = mean > 0 ? (Math.sqrt(variance) / mean) * 100 : 0;

  const band = VARIATION_BANDS.find(([, limit]) => cv < limit)![0];

  const firstHalf = runs.slice(0, 4).reduce((s, v) => s + v, 0);
  const secondHalf = runs.slice(4, 8).reduce((s, v) => s + v, 0);

  let fastestIndex = 0;
  let slowestIndex = 0;
  runs.forEach((s, i) => {
    if (s > 0 && (runs[fastestIndex] === 0 || s < runs[fastestIndex])) fastestIndex = i;
    if (s > runs[slowestIndex]) slowestIndex = i;
  });

  return {
    variationPercent: Math.round(cv * 10) / 10,
    band,
    runs,
    countedIndexes: COUNTED_RUNS,
    fastestIndex,
    slowestIndex,
    meanCountedSeconds: Math.round(mean),
    firstHalfSeconds: firstHalf,
    secondHalfSeconds: secondHalf,
    fadeSeconds: secondHalf - firstHalf,
  };
}

/* ── The story of the race ──────────────────────────────────────────── */

export type PaceCheckpoint = {
  label: string;
  /** Elapsed at the end of this segment. */
  elapsedSeconds: number;
  /** Finish time implied if the rest of the race matched the division average. */
  projectedFinishSeconds: number;
};

/**
 * The projection is deliberately simple and stated on the page: at each
 * checkpoint, take the time actually elapsed and add the division's average
 * for every segment still to come.
 *
 * A line that falls means the athlete was beating the average as the race went
 * on; a line that climbs means they were giving it back. It needs no model and
 * no training data, and unlike a "predicted finish" it cannot be wrong — it is
 * arithmetic on what happened.
 */
export function buildPaceStory(segments: Segment[]): PaceCheckpoint[] {
  // The roxzone arrives as one total for the whole race rather than as eight
  // transitions, so it is not a checkpoint. Charting it as one put a phantom
  // step at the end and — worse — left the final projection short of the real
  // finish by a whole roxzone, which makes the chart look broken to the one
  // reader who checks it against their own time.
  //
  // Both the athlete's roxzone and the division's are pro-rated across the
  // sixteen timed segments instead: at checkpoint k you have spent about k/16
  // of your transitions. The line then ends exactly on the finish time.
  const timed = segments.filter((s) => s.kind !== "roxzone");
  const roxzone = segments.find((s) => s.kind === "roxzone");
  const ownRoxzone = roxzone?.seconds ?? 0;
  const averageRoxzone = roxzone?.averageSeconds ?? 0;

  const remainingAverage: number[] = [];
  let tail = 0;
  for (let i = timed.length - 1; i >= 0; i--) {
    remainingAverage[i] = tail;
    tail += timed[i].averageSeconds;
  }

  const checkpoints: PaceCheckpoint[] = [];
  let elapsed = 0;

  timed.forEach((segment, i) => {
    elapsed += segment.seconds;
    const progress = (i + 1) / timed.length;
    const roxSoFar = ownRoxzone * progress;
    const roxToCome = averageRoxzone * (1 - progress);
    checkpoints.push({
      label: segment.label,
      elapsedSeconds: Math.round(elapsed + roxSoFar),
      projectedFinishSeconds: Math.round(elapsed + roxSoFar + remainingAverage[i] + roxToCome),
    });
  });

  return checkpoints;
}

/* ── Benchmarks ─────────────────────────────────────────────────────── */

export type SplitBenchmark = {
  label: string;
  kind: SegmentKind;
  yourSeconds: number;
  /** Fastest recorded for this segment anywhere in the division at this event. */
  fastestSeconds: number;
  /** The winner's time for the same segment. */
  winnerSeconds: number;
  deltaToFastest: number;
  deltaToWinner: number;
};

export function benchmarkSplits(
  yours: Segment[],
  fastestBySegment: Record<string, number>,
  winnerBySegment: Record<string, number>,
): SplitBenchmark[] {
  return yours.map((segment) => {
    const fastest = fastestBySegment[segment.key] ?? 0;
    const winner = winnerBySegment[segment.key] ?? 0;
    return {
      label: segment.label,
      kind: segment.kind,
      yourSeconds: segment.seconds,
      fastestSeconds: fastest,
      winnerSeconds: winner,
      // A missing split has `seconds: 0`, and 0 minus the winner's time is a
      // large negative — which this chart would have drawn as the athlete
      // beating the winner by three minutes on a station they have no time for.
      deltaToFastest: !segment.missing && fastest > 0 ? segment.seconds - fastest : 0,
      deltaToWinner: !segment.missing && winner > 0 ? segment.seconds - winner : 0,
    };
  });
}

/* ── Against your own last race ─────────────────────────────────────── */

export type SplitDelta = {
  label: string;
  kind: SegmentKind;
  thisSeconds: number;
  lastSeconds: number;
  deltaSeconds: number;
};

export type RaceComparison = {
  deltas: SplitDelta[];
  netSeconds: number;
  improved: number;
  regressed: number;
  biggestGain: SplitDelta | null;
  biggestLoss: SplitDelta | null;
};

export function compareToPrevious(
  current: Segment[],
  previous: Segment[],
): RaceComparison | null {
  if (previous.length === 0) return null;

  const previousByKey = new Map(previous.map((s) => [s.key, s]));
  const deltas: SplitDelta[] = [];

  for (const segment of current) {
    const before = previousByKey.get(segment.key);
    if (!before || before.seconds <= 0 || segment.seconds <= 0) continue;
    deltas.push({
      label: segment.label,
      kind: segment.kind,
      thisSeconds: segment.seconds,
      lastSeconds: before.seconds,
      deltaSeconds: segment.seconds - before.seconds,
    });
  }

  if (deltas.length === 0) return null;

  const sorted = [...deltas].sort((a, b) => a.deltaSeconds - b.deltaSeconds);
  return {
    deltas,
    netSeconds: deltas.reduce((s, d) => s + d.deltaSeconds, 0),
    improved: deltas.filter((d) => d.deltaSeconds < 0).length,
    regressed: deltas.filter((d) => d.deltaSeconds > 0).length,
    biggestGain: sorted[0]?.deltaSeconds < 0 ? sorted[0] : null,
    biggestLoss: sorted[sorted.length - 1]?.deltaSeconds > 0 ? sorted[sorted.length - 1] : null,
  };
}

/* ── What the next race looks like ──────────────────────────────────── */

export type NextRaceProjection = {
  bands: { name: BandName; seconds: number }[];
  basis: "history" | "single-race";
  racesUsed: number;
  /** Seconds per race of improvement, from a least-squares fit. Negative is faster. */
  trendPerRace: number;
  note: string;
};

/**
 * Projected from the athlete's own history, not from a population model.
 *
 * With three or more races we fit a straight line through their finish times,
 * extrapolate one race forward, and spread the bands by their own residual
 * spread — so an athlete who is consistent gets a tight range and a streaky one
 * gets a wide one, which is the honest outcome in both cases.
 *
 * With fewer, there is no trend worth fitting and the page says so rather than
 * drawing a confident line through two points.
 */
export function projectNextRace(
  finishTimes: number[],
  fieldSd: number,
): NextRaceProjection | null {
  const times = finishTimes.filter((t) => t > 0);
  if (times.length === 0) return null;

  const latest = times[times.length - 1];

  if (times.length < 3) {
    // One or two races: no trend, so spread by the division's own variability,
    // damped — most athletes move less between races than the field spans.
    const spread = Math.max(60, fieldSd * 0.35);
    return {
      bands: [
        { name: "excellent", seconds: Math.round(latest - spread * 1.6) },
        { name: "great", seconds: Math.round(latest - spread * 0.8) },
        { name: "expected", seconds: Math.round(latest) },
        { name: "subpar", seconds: Math.round(latest + spread * 0.8) },
        { name: "poor", seconds: Math.round(latest + spread * 1.6) },
      ],
      basis: "single-race",
      racesUsed: times.length,
      trendPerRace: 0,
      note: times.length === 1
        ? "Based on one race, so this is a range around that time rather than a trend. "
          + "It sharpens considerably once you have three."
        : "Based on two races. Two points make a line but not a trend — this "
          + "sharpens once you have three.",
    };
  }

  // Least squares on (index, time).
  const n = times.length;
  const meanX = (n - 1) / 2;
  const meanY = times.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  times.forEach((y, x) => {
    num += (x - meanX) * (y - meanY);
    den += (x - meanX) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  const predicted = intercept + slope * n;

  // Residual spread: how far this athlete actually lands from their own line.
  const residuals = times.map((y, x) => y - (intercept + slope * x));
  const rmse = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / n);
  const spread = Math.max(45, rmse);

  return {
    bands: [
      { name: "excellent", seconds: Math.round(predicted - spread * 1.6) },
      { name: "great", seconds: Math.round(predicted - spread * 0.8) },
      { name: "expected", seconds: Math.round(predicted) },
      { name: "subpar", seconds: Math.round(predicted + spread * 0.8) },
      { name: "poor", seconds: Math.round(predicted + spread * 1.6) },
    ],
    basis: "history",
    racesUsed: n,
    trendPerRace: Math.round(slope),
    note: slope < -5
      ? `Across ${n} races you are trending faster by about ${Math.abs(Math.round(slope))}s a race.`
      : slope > 5
        ? `Across ${n} races you are trending slower by about ${Math.round(slope)}s a race.`
        : `Across ${n} races your finish time has been stable.`,
  };
}

/* ── Race plan ──────────────────────────────────────────────────────── */

export type PlannedSplit = {
  label: string;
  kind: SegmentKind;
  targetSeconds: number;
  lastSeconds: number;
  deltaSeconds: number;
  cumulativeSeconds: number;
};

/**
 * Split targets that add up to a goal.
 *
 * Time is taken off each segment in proportion to how much room it has against
 * the athlete's own ceiling, rather than shaved evenly. Even shaving asks for
 * an equal improvement from the strongest station and the weakest, which is
 * both harder and slower than fixing what is actually behind.
 */
export function buildRacePlan(
  segments: Segment[],
  goalSeconds: number,
  roomBySegment: Record<string, number>,
): PlannedSplit[] {
  const current = segments.reduce((s, seg) => s + seg.seconds, 0);
  const mustSave = current - goalSeconds;

  const totalRoom = segments.reduce((s, seg) => s + Math.max(0, roomBySegment[seg.key] ?? 0), 0);

  let cumulative = 0;
  return segments.map((segment) => {
    const room = Math.max(0, roomBySegment[segment.key] ?? 0);
    // No room anywhere, or already at the goal: hold every split where it is.
    const share = totalRoom > 0 && mustSave > 0 ? (room / totalRoom) * mustSave : 0;
    const target = Math.max(1, Math.round(segment.seconds - share));
    cumulative += target;
    return {
      label: segment.label,
      kind: segment.kind,
      targetSeconds: target,
      lastSeconds: segment.seconds,
      deltaSeconds: target - segment.seconds,
      cumulativeSeconds: cumulative,
    };
  });
}
