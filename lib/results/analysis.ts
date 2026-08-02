/**
 * Race analysis — the layer the reference site does not have.
 *
 * Their product tells you your Sled Push was 2:25. It never tells you whether
 * that is good, what it cost you, or what to do about it. Everything in this
 * file turns a row of splits into something coachable, and it is all derived —
 * no extra data required, so it works identically on a live feed.
 *
 * Pure functions only. No React, no data source, fully unit-testable.
 */

import { STATION_IDS, STATION_LABEL, type StationId } from "./model";
import type { Distribution } from "./percentiles";
import { percentileOf } from "./percentiles";

export type RaceSplits = {
  runs: number[];
  stations: Record<StationId, number>;
  roxzoneSeconds: number;
  finishSeconds: number;
};

/* ─── 1. Roxzone leak ─────────────────────────────────────────────
   Transition time is the most ignored and most fixable minutes in the
   sport. Nobody surfaces it as a headline number. We do. */

export type RoxzoneReport = {
  seconds: number;
  averageSeconds: number;
  deltaSeconds: number;
  /** Share of total race time spent not running and not working. */
  shareOfRace: number;
  verdict: "sharp" | "typical" | "leaking";
};

export function analyseRoxzone(splits: RaceSplits, averageRoxzone: number): RoxzoneReport {
  const delta = splits.roxzoneSeconds - averageRoxzone;
  const share = splits.finishSeconds > 0 ? splits.roxzoneSeconds / splits.finishSeconds : 0;
  // A tenth of the division average either way is noise, not a finding.
  const threshold = Math.max(20, averageRoxzone * 0.1);
  return {
    seconds: splits.roxzoneSeconds,
    averageSeconds: averageRoxzone,
    deltaSeconds: delta,
    shareOfRace: share,
    verdict: delta < -threshold ? "sharp" : delta > threshold ? "leaking" : "typical",
  };
}

/* ─── 2. Pacing consistency ───────────────────────────────────────
   Eight 1km runs make a pacing story. Reduce it to one number an athlete
   can actually train against, plus the drift that produced it. */

export type PacingReport = {
  /** 0–100. 100 is metronomic; below 60 means the wheels came off. */
  consistency: number;
  /** Seconds per run of slowdown, fitted across the eight runs. */
  driftPerRun: number;
  fastestRun: { index: number; seconds: number };
  slowestRun: { index: number; seconds: number };
  /** Positive split = second half slower than first. */
  splitDifferenceSeconds: number;
  verdict: "even" | "fading" | "negative-split";
};

export function analysePacing(runs: number[]): PacingReport {
  const valid = runs.filter((r) => r > 0);
  if (valid.length < 2) {
    return {
      consistency: 0, driftPerRun: 0,
      fastestRun: { index: 0, seconds: 0 }, slowestRun: { index: 0, seconds: 0 },
      splitDifferenceSeconds: 0, verdict: "even",
    };
  }

  const mean = valid.reduce((s, v) => s + v, 0) / valid.length;
  const sd = Math.sqrt(valid.reduce((s, v) => s + (v - mean) ** 2, 0) / valid.length);
  // Coefficient of variation, inverted onto 0–100. A CV of 10% or worse
  // scores 0; perfectly even scores 100.
  const cv = mean > 0 ? sd / mean : 1;
  const consistency = Math.max(0, Math.min(100, Math.round((1 - cv / 0.1) * 100)));

  // Least-squares slope over run index — the drift the chart highlights.
  const n = valid.length;
  const meanX = (n - 1) / 2;
  let num = 0;
  let den = 0;
  valid.forEach((y, x) => {
    num += (x - meanX) * (y - mean);
    den += (x - meanX) ** 2;
  });
  const driftPerRun = den > 0 ? num / den : 0;

  const half = Math.floor(n / 2);
  const firstHalf = valid.slice(0, half).reduce((s, v) => s + v, 0);
  const secondHalf = valid.slice(n - half).reduce((s, v) => s + v, 0);
  const splitDifference = secondHalf - firstHalf;

  let fastest = { index: 0, seconds: valid[0] };
  let slowest = { index: 0, seconds: valid[0] };
  valid.forEach((v, i) => {
    if (v < fastest.seconds) fastest = { index: i, seconds: v };
    if (v > slowest.seconds) slowest = { index: i, seconds: v };
  });

  return {
    consistency,
    driftPerRun,
    fastestRun: fastest,
    slowestRun: slowest,
    splitDifferenceSeconds: splitDifference,
    verdict: splitDifference < -15 ? "negative-split" : splitDifference > 45 ? "fading" : "even",
  };
}

/* ─── 3. Station standing and the weakest link ────────────────────
   Ranked against the division at the same event, so "weakest" means
   weakest relative to peers, not simply the slowest station. */

export type StationStanding = {
  station: StationId;
  label: string;
  seconds: number;
  averageSeconds: number;
  deltaSeconds: number;
  /** Percentile within the division for this station alone. */
  percentile: number;
};

export function analyseStations(
  splits: RaceSplits,
  averages: Record<StationId, number>,
  distributions?: Partial<Record<StationId, Distribution>>,
): StationStanding[] {
  return STATION_IDS.map((station) => {
    const seconds = splits.stations[station] ?? 0;
    const average = averages[station] ?? 0;
    const dist = distributions?.[station];
    return {
      station,
      label: STATION_LABEL[station],
      seconds,
      averageSeconds: average,
      deltaSeconds: seconds - average,
      percentile: dist ? percentileOf(dist, seconds) : percentileFromAverage(seconds, average),
    };
  });
}

/**
 * Fallback percentile when no distribution is loaded: map the delta onto a
 * rough curve. Approximate by construction, and never shown as a precise
 * figure — the UI rounds it and labels it "approx" when this path is used.
 */
function percentileFromAverage(seconds: number, average: number): number {
  if (!average) return 50;
  const ratio = seconds / average;
  return Math.max(0, Math.min(100, 50 - (ratio - 1) * 200));
}

/** The one station to fix. Weakest by percentile, not by raw seconds. */
export function weakestStation(standings: StationStanding[]): StationStanding | null {
  if (standings.length === 0) return null;
  return standings.reduce((worst, s) => (s.percentile < worst.percentile ? s : worst));
}

export function strongestStation(standings: StationStanding[]): StationStanding | null {
  if (standings.length === 0) return null;
  return standings.reduce((best, s) => (s.percentile > best.percentile ? s : best));
}

/* ─── 4. What-if projection ───────────────────────────────────────
   "Fix your weakest station" is advice. "Fixing it moves you from 412th
   to 341st" is a reason to book a call. This is the coaching funnel
   earning its place instead of being a banner. */

export type WhatIfResult = {
  station: StationId;
  label: string;
  currentSeconds: number;
  targetSeconds: number;
  secondsSaved: number;
  projectedFinishSeconds: number;
  projectedRank: number;
  ranksGained: number;
  projectedPercentile: number;
};

/**
 * Project the effect of bringing one station up to a target standard.
 * `fieldTimes` must be the sorted finish times of the division.
 */
export function projectWhatIf(
  splits: RaceSplits,
  standing: StationStanding,
  fieldTimes: readonly number[],
  currentRank: number,
  targetPercentile = 50,
  distribution?: Distribution,
): WhatIfResult {
  const target = distribution
    ? timeAtPercentileLocal(distribution.samples, targetPercentile)
    : standing.averageSeconds;

  // Only an improvement counts. If the station is already better than the
  // target, there is nothing to project and we say so with a zero saving.
  const secondsSaved = Math.max(0, standing.seconds - target);
  const projectedFinish = splits.finishSeconds - secondsSaved;

  // No saving means no movement. Without this guard the scan below would
  // re-derive a rank from the field and could report places gained for an
  // athlete who improved nothing — the projection has to be honest to be
  // worth putting a coaching CTA next to.
  let projectedRank = currentRank;
  if (secondsSaved > 0) {
    for (let i = 0; i < fieldTimes.length; i++) {
      if (fieldTimes[i] >= projectedFinish) {
        projectedRank = i + 1;
        break;
      }
    }
    // Saving time can never move an athlete backwards.
    projectedRank = Math.min(projectedRank, currentRank);
  }

  const beaten = fieldTimes.filter((t) => t > projectedFinish).length;
  return {
    station: standing.station,
    label: standing.label,
    currentSeconds: standing.seconds,
    targetSeconds: Math.round(target),
    secondsSaved: Math.round(secondsSaved),
    projectedFinishSeconds: Math.round(projectedFinish),
    projectedRank,
    ranksGained: Math.max(0, currentRank - projectedRank),
    projectedPercentile: fieldTimes.length ? (beaten / fieldTimes.length) * 100 : 0,
  };
}

function timeAtPercentileLocal(samples: readonly number[], percentile: number): number {
  if (samples.length === 0) return 0;
  const pos = ((100 - percentile) / 100) * (samples.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? samples[lo] : samples[lo] + (samples[hi] - samples[lo]) * (pos - lo);
}

/* ─── 5. Target split card (the "ghost pacer") ────────────────────
   Enter a goal time, get the exact splits that produce it. The reference
   simulator answers "what would I run?" — this answers "what must I hit?",
   which is the question you actually have on race morning. */

export type TargetPlan = {
  goalSeconds: number;
  runs: number[];
  stations: Record<StationId, number>;
  roxzoneSeconds: number;
  /** Cumulative elapsed time at the end of each segment, for the race-day card. */
  checkpoints: { label: string; atSeconds: number }[];
};

export function buildTargetPlan(
  goalSeconds: number,
  reference: RaceSplits,
): TargetPlan {
  const refTotal = reference.finishSeconds || 1;
  const scale = goalSeconds / refTotal;

  const runs = reference.runs.map((r) => Math.round(r * scale));
  const stations = {} as Record<StationId, number>;
  for (const id of STATION_IDS) stations[id] = Math.round((reference.stations[id] ?? 0) * scale);
  const roxzoneSeconds = Math.round(reference.roxzoneSeconds * scale);

  const checkpoints: { label: string; atSeconds: number }[] = [];
  let elapsed = 0;
  const perTransition = roxzoneSeconds / STATION_IDS.length;
  STATION_IDS.forEach((station, i) => {
    elapsed += runs[i] ?? 0;
    checkpoints.push({ label: `Run ${i + 1}`, atSeconds: Math.round(elapsed) });
    elapsed += perTransition / 2;
    elapsed += stations[station];
    checkpoints.push({ label: STATION_LABEL[station], atSeconds: Math.round(elapsed) });
    elapsed += perTransition / 2;
  });

  return { goalSeconds, runs, stations, roxzoneSeconds, checkpoints };
}

/* ─── 6. Split plausibility ───────────────────────────────────────
   The reference site renders whatever the feed gives it: one athlete page
   there shows a 42:21 "Run 2" on the same axis as a 3:06, which makes the
   whole chart useless. We flag implausible splits rather than drawing them
   as fact. Matters more, not less, on a live feed. */

export type SplitFlag = {
  segment: string;
  seconds: number;
  reason: "implausibly-fast" | "implausibly-slow" | "missing";
};

const RUN_FLOOR = 150;      // 2:30/km — faster than any Hyrox run split
const RUN_CEILING = 900;    // 15:00/km — walking, or a timing error
const STATION_FLOOR = 45;
const STATION_CEILING = 1500;

export function flagImplausibleSplits(splits: RaceSplits): SplitFlag[] {
  const flags: SplitFlag[] = [];

  splits.runs.forEach((seconds, i) => {
    const segment = `Run ${i + 1}`;
    if (!seconds) flags.push({ segment, seconds, reason: "missing" });
    else if (seconds < RUN_FLOOR) flags.push({ segment, seconds, reason: "implausibly-fast" });
    else if (seconds > RUN_CEILING) flags.push({ segment, seconds, reason: "implausibly-slow" });
  });

  for (const id of STATION_IDS) {
    const seconds = splits.stations[id];
    const segment = STATION_LABEL[id];
    if (!seconds) flags.push({ segment, seconds: 0, reason: "missing" });
    else if (seconds < STATION_FLOOR) flags.push({ segment, seconds, reason: "implausibly-fast" });
    else if (seconds > STATION_CEILING) flags.push({ segment, seconds, reason: "implausibly-slow" });
  }

  return flags;
}

/* ─── 7. Work-to-run ratio ────────────────────────────────────────
   The single number that says what kind of athlete you are: a runner who
   survives the stations, or a strength athlete who survives the runs. */

export type WorkRunBalance = {
  runSeconds: number;
  stationSeconds: number;
  roxzoneSeconds: number;
  ratio: number;
  profile: "runner" | "balanced" | "strength";
};

export function analyseBalance(splits: RaceSplits, divisionRatio: number): WorkRunBalance {
  const runSeconds = splits.runs.reduce((s, v) => s + v, 0);
  const stationSeconds = STATION_IDS.reduce((s, id) => s + (splits.stations[id] ?? 0), 0);
  const ratio = stationSeconds > 0 ? runSeconds / stationSeconds : 0;
  // Compared against the division, not an absolute — a "runner" in Pro Men is
  // a different animal from a "runner" in Open Women.
  const relative = divisionRatio > 0 ? ratio / divisionRatio : 1;
  return {
    runSeconds,
    stationSeconds,
    roxzoneSeconds: splits.roxzoneSeconds,
    ratio,
    profile: relative < 0.95 ? "runner" : relative > 1.05 ? "strength" : "balanced",
  };
}
