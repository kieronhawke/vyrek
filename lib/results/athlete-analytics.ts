/**
 * Cross-race athlete analytics.
 *
 * Everything in `analysis.ts` reads one race. This reads a career: form,
 * consistency, station profile, partner records, head-to-head. These are the
 * questions an athlete actually asks after their third or fourth event, and
 * nothing in this space answers them — the reference site's athlete page is a
 * race list with a min/max strip.
 *
 * Pure functions, no I/O, fully unit-tested. All of it is derived from data we
 * already hold, so it works unchanged on a live feed.
 */

import { STATION_IDS, STATION_LABEL, type StationId } from "./model";
import type { AthleteRace } from "./source";

/* ─── 1. Power score ──────────────────────────────────────────────
   One number for a whole career. Their "Elite Points" is closed — no
   published formula — so nobody can check it or argue with it. Ours is
   documented, reproducible, and deliberately simple enough to explain in a
   sentence. */

export type PowerScore = {
  score: number;
  /** 0–100. Below ~40 the score is built on too little to lean on. */
  confidence: number;
  breakdown: {
    /** Best finish, as a percentile of its division. */
    peak: number;
    /** Median finish percentile — rewards repeatability over one good day. */
    consistency: number;
    /** How much of the career is recent. Form decays. */
    recency: number;
    /** Field size raced against, so beating 3,000 outranks beating 30. */
    depth: number;
  };
};

export type ScoredRace = {
  /** Percentile within the division at that event, 0–100, higher is better. */
  percentile: number;
  fieldSize: number;
  /** Days before "now". */
  ageDays: number;
};

/**
 * Weighted blend of peak, consistency, recency and field depth, 0–1000.
 *
 * Peak and consistency dominate deliberately: a single outstanding race and a
 * body of solid ones should both count, and neither alone should be enough.
 * Recency stops a retired athlete topping a live board. Depth stops a small
 * regional field outscoring a world championship.
 */
export function powerScore(races: ScoredRace[]): PowerScore {
  const finished = races.filter((r) => r.percentile > 0);
  if (finished.length === 0) {
    return {
      score: 0,
      confidence: 0,
      breakdown: { peak: 0, consistency: 0, recency: 0, depth: 0 },
    };
  }

  const percentiles = finished.map((r) => r.percentile).sort((a, b) => b - a);
  const peak = percentiles[0];
  const consistency = percentiles[Math.floor(percentiles.length / 2)];

  // Half-life of one year: a race two years old counts for a quarter.
  const recencyWeights = finished.map((r) => 0.5 ** (r.ageDays / 365));
  const recency = (recencyWeights.reduce((s, w) => s + w, 0) / finished.length) * 100;

  // log10 so the curve flattens: 3,000 vs 300 matters, 3,000 vs 3,100 does not.
  const depths = finished.map((r) => Math.min(100, (Math.log10(Math.max(10, r.fieldSize)) / 3.6) * 100));
  const depth = depths.reduce((s, d) => s + d, 0) / depths.length;

  /**
   * Evidence discount.
   *
   * Without it a single 99th-percentile race outscored six consistent
   * 95th-percentile ones — peak and consistency are both high when there is
   * only one race, because the one race *is* the median. That reads as
   * "unbeatable athlete" from one good day, which is exactly the failure a
   * ranking must not have.
   *
   * Full credit needs six races, which is roughly a season and a half. Below
   * that the score is scaled down rather than the athlete being excluded, so a
   * newcomer still appears and still climbs.
   */
  const volume = Math.min(1, finished.length / 6);
  const evidence = 0.55 + 0.45 * volume;

  const score = Math.round(
    (peak * 4.0 + consistency * 3.5 + recency * 1.5 + depth * 1.0) * evidence,
  );

  // Confidence is about evidence, not quality: races run and how recent.
  const freshness = Math.min(1, recency / 60);
  return {
    score: Math.min(1000, score),
    confidence: Math.round(volume * 70 + freshness * 30),
    breakdown: {
      peak: Math.round(peak),
      consistency: Math.round(consistency),
      recency: Math.round(recency),
      depth: Math.round(depth),
    },
  };
}

/* ─── 2. Form trend ───────────────────────────────────────────────
   Is this athlete getting faster? A career list cannot answer that; a fitted
   slope over comparable races can. */

export type FormTrend = {
  direction: "improving" | "steady" | "declining" | "unknown";
  /** Seconds per race of change. Negative is faster. */
  secondsPerRace: number;
  /** Same, projected over a season of four races. */
  secondsPerSeason: number;
  sampleSize: number;
};

/**
 * Least-squares slope over finish times, oldest first.
 *
 * Only races in the same division are comparable — a Doubles time and an Open
 * time on one line is meaningless — so the caller filters first. Under three
 * races the answer is "unknown" rather than a slope through noise.
 */
export function formTrend(finishSecondsOldestFirst: number[]): FormTrend {
  const times = finishSecondsOldestFirst.filter((t) => t > 0);
  if (times.length < 3) {
    return { direction: "unknown", secondsPerRace: 0, secondsPerSeason: 0, sampleSize: times.length };
  }

  const n = times.length;
  const meanX = (n - 1) / 2;
  const meanY = times.reduce((s, t) => s + t, 0) / n;

  let num = 0;
  let den = 0;
  times.forEach((y, x) => {
    num += (x - meanX) * (y - meanY);
    den += (x - meanX) ** 2;
  });

  const slope = den > 0 ? num / den : 0;
  // A minute per race either way is signal; less is noise in a sport where
  // course and conditions vary.
  const direction = slope < -20 ? "improving" : slope > 20 ? "declining" : "steady";

  return {
    direction,
    secondsPerRace: Math.round(slope),
    secondsPerSeason: Math.round(slope * 4),
    sampleSize: n,
  };
}

/* ─── 3. Station profile ──────────────────────────────────────────
   Which stations does this athlete win and lose across a career, not one race.
   This is the thing that tells someone what to train. */

export type StationProfile = {
  station: StationId;
  label: string;
  /** Mean percentile across every race where the split exists. */
  averagePercentile: number;
  bestSeconds: number;
  worstSeconds: number;
  /** Coefficient of variation, 0–100. Low means repeatable. */
  volatility: number;
  races: number;
};

export function stationProfile(
  splitsByStation: Partial<Record<StationId, { seconds: number; percentile: number }[]>>,
): StationProfile[] {
  return STATION_IDS.map((station) => {
    const entries = splitsByStation[station] ?? [];
    const seconds = entries.map((e) => e.seconds).filter((s) => s > 0);
    if (seconds.length === 0) {
      return {
        station, label: STATION_LABEL[station],
        averagePercentile: 0, bestSeconds: 0, worstSeconds: 0, volatility: 0, races: 0,
      };
    }

    const mean = seconds.reduce((s, v) => s + v, 0) / seconds.length;
    const sd = Math.sqrt(seconds.reduce((s, v) => s + (v - mean) ** 2, 0) / seconds.length);

    return {
      station,
      label: STATION_LABEL[station],
      averagePercentile: Math.round(
        entries.reduce((s, e) => s + e.percentile, 0) / entries.length,
      ),
      bestSeconds: Math.min(...seconds),
      worstSeconds: Math.max(...seconds),
      volatility: Math.round(mean > 0 ? Math.min(100, (sd / mean) * 300) : 0),
      races: seconds.length,
    };
  }).filter((p) => p.races > 0);
}

/* ─── 4. Head to head ─────────────────────────────────────────────
   Two athletes, only the events they both raced. Nothing else in the sport
   answers "have I ever beaten them". */

export type HeadToHead = {
  meetings: number;
  wins: number;
  losses: number;
  /** Mean margin in seconds. Negative means the first athlete is faster. */
  averageMarginSeconds: number;
  closest: { eventSlug: string; marginSeconds: number } | null;
  results: {
    eventSlug: string;
    eventCity: string;
    year: number;
    aSeconds: number;
    bSeconds: number;
    marginSeconds: number;
    aWon: boolean;
  }[];
};

export function headToHead(a: AthleteRace[], b: AthleteRace[]): HeadToHead {
  // Same event *and* same division: beating someone who raced Doubles while you
  // raced Open is not a meeting.
  const bByKey = new Map(b.map((r) => [`${r.eventSlug}::${r.division}`, r]));
  const results: HeadToHead["results"] = [];

  for (const race of a) {
    const other = bByKey.get(`${race.eventSlug}::${race.division}`);
    if (!other || race.finishSeconds <= 0 || other.finishSeconds <= 0) continue;
    results.push({
      eventSlug: race.eventSlug,
      eventCity: race.eventCity,
      year: race.year,
      aSeconds: race.finishSeconds,
      bSeconds: other.finishSeconds,
      marginSeconds: race.finishSeconds - other.finishSeconds,
      aWon: race.finishSeconds < other.finishSeconds,
    });
  }

  results.sort((x, y) => y.year - x.year);

  const wins = results.filter((r) => r.aWon).length;
  const closest = results.length
    ? results.reduce((best, r) =>
        Math.abs(r.marginSeconds) < Math.abs(best.marginSeconds) ? r : best)
    : null;

  return {
    meetings: results.length,
    wins,
    losses: results.length - wins,
    averageMarginSeconds: results.length
      ? Math.round(results.reduce((s, r) => s + r.marginSeconds, 0) / results.length)
      : 0,
    closest: closest
      ? { eventSlug: closest.eventSlug, marginSeconds: closest.marginSeconds }
      : null,
    results,
  };
}

/* ─── 5. Personal bests ───────────────────────────────────────────
   A PB per division, not one overall: an Open PB and a Doubles PB are
   different achievements and collapsing them hides both. */

export type DivisionBest = {
  division: string;
  divisionLabel: string;
  seconds: number;
  eventCity: string;
  year: number;
  resultId: string;
  /** True when this is also the athlete's most recent race in the division. */
  isCurrent: boolean;
};

export function divisionBests(races: AthleteRace[]): DivisionBest[] {
  const byDivision = new Map<string, AthleteRace[]>();
  for (const race of races) {
    if (race.finishSeconds <= 0) continue;
    if (!byDivision.has(race.division)) byDivision.set(race.division, []);
    byDivision.get(race.division)!.push(race);
  }

  return [...byDivision.entries()]
    .map(([division, list]) => {
      const best = list.reduce((a, b) => (b.finishSeconds < a.finishSeconds ? b : a));
      const latest = list.reduce((a, b) => (b.date > a.date ? b : a));
      return {
        division,
        divisionLabel: best.divisionLabel,
        seconds: best.finishSeconds,
        eventCity: best.eventCity,
        year: best.year,
        resultId: best.resultId,
        isCurrent: best.resultId === latest.resultId,
      };
    })
    .sort((a, b) => a.seconds - b.seconds);
}

/* ─── 6. Career summary ───────────────────────────────────────────
   The line under an athlete's name. Cheap, and it is what makes a profile feel
   like a profile rather than a table. */

export type CareerSummary = {
  races: number;
  seasons: number;
  divisions: number;
  countries: number;
  podiums: number;
  bestRank: number | null;
  totalRacingSeconds: number;
};

export function careerSummary(races: AthleteRace[]): CareerSummary {
  const finished = races.filter((r) => r.finishSeconds > 0);
  const ranked = finished.filter((r) => r.rank > 0);
  return {
    races: races.length,
    seasons: new Set(races.map((r) => r.season).filter(Boolean)).size,
    divisions: new Set(races.map((r) => r.division)).size,
    countries: new Set(races.map((r) => r.eventCity)).size,
    podiums: ranked.filter((r) => r.rank <= 3).length,
    bestRank: ranked.length ? Math.min(...ranked.map((r) => r.rank)) : null,
    totalRacingSeconds: finished.reduce((s, r) => s + r.finishSeconds, 0),
  };
}
