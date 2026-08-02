/**
 * The percentile engine — brief §6.4.
 *
 * One module computes every percentile in the section: result pages, the
 * simulator, the percentile tool and share cards all call in here. If this
 * maths lives in more than one place the four surfaces will drift apart and
 * quietly start disagreeing about the same athlete.
 *
 * Convention, fixed once here: for race times **lower is better**, and a
 * percentile of 78 means "faster than 78% of the field". Every caller gets
 * that reading, so no surface has to remember to invert anything.
 */

export type Distribution = {
  /** Ascending finish/split times in seconds. */
  samples: number[];
  count: number;
  mean: number;
  sd: number;
  min: number;
  max: number;
  /** Time in seconds at each percentile boundary, keyed by "faster than N%". */
  breakpoints: Record<PercentileBand, number>;
  /** Fixed-width buckets for the histogram charts on station guides. */
  histogram: HistogramBucket[];
};

export type HistogramBucket = { from: number; to: number; count: number };

export const PERCENTILE_BANDS = [99, 95, 90, 75, 50] as const;
export type PercentileBand = (typeof PERCENTILE_BANDS)[number];

/** The shading bands on ranking tables: top 1%, 5%, 10%, 25%, 50%. */
export type RankBand = "top-1" | "top-5" | "top-10" | "top-25" | "top-50" | "field";

const EMPTY: Distribution = {
  samples: [],
  count: 0,
  mean: 0,
  sd: 0,
  min: 0,
  max: 0,
  breakpoints: { 99: 0, 95: 0, 90: 0, 75: 0, 50: 0 },
  histogram: [],
};

export function buildDistribution(times: readonly number[], bucketCount = 24): Distribution {
  const samples = times.filter((t) => Number.isFinite(t) && t > 0).sort((a, b) => a - b);
  if (samples.length === 0) return { ...EMPTY, samples: [] };

  const count = samples.length;
  const mean = samples.reduce((sum, t) => sum + t, 0) / count;
  const variance = samples.reduce((sum, t) => sum + (t - mean) ** 2, 0) / count;
  const sd = Math.sqrt(variance);
  const min = samples[0];
  const max = samples[count - 1];

  const breakpoints = {} as Record<PercentileBand, number>;
  for (const band of PERCENTILE_BANDS) {
    // "faster than 99%" is the 1st-from-fastest position, so index from the front.
    breakpoints[band] = timeAtPercentile(samples, band);
  }

  const span = max - min || 1;
  const width = span / bucketCount;
  const histogram: HistogramBucket[] = Array.from({ length: bucketCount }, (_, i) => ({
    from: min + i * width,
    to: min + (i + 1) * width,
    count: 0,
  }));
  for (const t of samples) {
    const idx = Math.min(bucketCount - 1, Math.floor((t - min) / width));
    histogram[idx].count++;
  }

  return { samples, count, mean, sd, min, max, breakpoints, histogram };
}

/**
 * Share of the field this time beats, 0–100. A time faster than everyone
 * returns 100; slower than everyone returns 0.
 *
 * Ties count as half-beaten (the standard mid-rank convention), so two
 * identical times get the same percentile rather than one arbitrarily
 * outranking the other.
 */
export function percentileOf(dist: Distribution, timeSeconds: number): number {
  const { samples, count } = dist;
  if (count === 0 || !Number.isFinite(timeSeconds)) return 0;

  const firstGte = lowerBound(samples, timeSeconds);
  const firstGt = upperBound(samples, timeSeconds);
  const slower = count - firstGt;
  const equal = firstGt - firstGte;

  return ((slower + equal / 2) / count) * 100;
}

/** Inverse: the time you would need to sit at this percentile. */
export function timeAtPercentile(samples: readonly number[], percentile: number): number {
  if (samples.length === 0) return 0;
  const clamped = Math.min(100, Math.max(0, percentile));
  // Faster-than-N% counts from the fast end, so invert into an index.
  const pos = ((100 - clamped) / 100) * (samples.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return samples[lo];
  return samples[lo] + (samples[hi] - samples[lo]) * (pos - lo);
}

/** Which shading band a rank falls into, for ranking-table backgrounds. */
export function rankBand(rank: number, fieldSize: number): RankBand {
  if (fieldSize <= 0 || rank <= 0) return "field";
  // The winner always gets the top band. Strict arithmetic would put rank 1 of a
  // 20-strong Adaptive field in "top-5", shading it weaker than 40th of 4,000 in
  // Open Men — which reads as nonsense on a leaderboard.
  if (rank === 1) return "top-1";
  const pct = (rank / fieldSize) * 100;
  if (pct <= 1) return "top-1";
  if (pct <= 5) return "top-5";
  if (pct <= 10) return "top-10";
  if (pct <= 25) return "top-25";
  if (pct <= 50) return "top-50";
  return "field";
}

/**
 * Phrase a percentile the way the brief writes it on result pages:
 * "faster than 78% of Men at this event".
 */
export function describePercentile(percentile: number, divisionLabel: string, scope: string): string {
  return `Faster than ${Math.round(percentile)}% of ${divisionLabel} ${scope}`;
}

/* ─── Binary search helpers ──────────────────────────────────────── */

/** First index whose value is >= target. */
function lowerBound(sorted: readonly number[], target: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** First index whose value is > target. */
function upperBound(sorted: readonly number[], target: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
