/**
 * Station distributions — the percentile engine's feed.
 *
 * Recomputed after every successful event sync rather than aggregated per
 * request. The frontend build learned this the hard way: aggregating on read
 * put the simulator's TTFB at two seconds, and it is the same maths over the
 * same 76,000 rows either way. Precomputed, it is a single indexed lookup.
 *
 * `percentiles` is stored as a bucket map rather than raw samples so a result
 * page can say "faster than 78 percent of Men at this event" without loading
 * the event.
 */

import type { ResultsRepository } from "../repository";
import { STATION_KEYS, type StationDistribution } from "../types";

const PERCENTILE_POINTS = [1, 5, 10, 25, 50, 75, 90, 99] as const;

/** Nearest-rank percentile. Exact, and it never invents a value between samples. */
export function percentileOf(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))];
}

export function summarise(values: number[]): Omit<
  StationDistribution,
  "id" | "scope" | "eventId" | "divisionKey" | "stationKey" | "computedAt"
> {
  const sorted = [...values].sort((a, b) => a - b);
  const percentiles: Record<string, number> = {};
  for (const p of PERCENTILE_POINTS) {
    const value = percentileOf(sorted, p);
    if (value !== null) percentiles[`p${p}`] = value;
  }
  return {
    ageGroup: null,
    sex: null,
    sampleCount: sorted.length,
    medianMs: percentileOf(sorted, 50),
    meanMs: sorted.length
      ? Math.round(sorted.reduce((sum, v) => sum + v, 0) / sorted.length)
      : null,
    percentiles,
  };
}

/**
 * Rebuild every distribution for one event, plus the global roll-up.
 *
 * DNFs are excluded: a station time from a race someone did not finish is real,
 * but a distribution built from it answers a different question than the one
 * the result page is asking.
 */
export async function recomputeDistributionsForEvent(
  repo: ResultsRepository,
  eventId: string,
): Promise<{ written: number }> {
  const divisions = await repo.listDivisions(eventId);
  const rows: Omit<StationDistribution, "id">[] = [];
  const computedAt = new Date().toISOString();

  for (const division of divisions) {
    const results = (await repo.listResultsForDivision(division.id)).filter(
      (r) => r.status === "finished",
    );
    if (results.length === 0) continue;

    for (const stationKey of STATION_KEYS) {
      const values = results
        .map((r) => r.splits.stations.find((s) => s.key === stationKey)?.timeMs)
        .filter((v): v is number => typeof v === "number" && v > 0);
      if (values.length === 0) continue;

      rows.push({
        scope: "event",
        eventId,
        divisionKey: division.divisionKey,
        stationKey,
        computedAt,
        ...summarise(values),
      });
    }

    // Finish time is modelled as a station so the percentile tool, the
    // simulator and the result page all read one shape.
    const finishes = results
      .map((r) => r.finishTimeMs)
      .filter((v): v is number => typeof v === "number" && v > 0);
    if (finishes.length > 0) {
      rows.push({
        scope: "event",
        eventId,
        divisionKey: division.divisionKey,
        stationKey: "finish",
        computedAt,
        ...summarise(finishes),
      });
    }
  }

  await repo.replaceStationDistributions(rows);
  return { written: rows.length };
}

/** Global boards, across every event we hold. */
export async function recomputeGlobalDistributions(
  repo: ResultsRepository,
): Promise<{ written: number }> {
  const events = await repo.listEvents();
  const buckets = new Map<string, number[]>();
  const computedAt = new Date().toISOString();

  for (const event of events) {
    for (const division of await repo.listDivisions(event.id)) {
      const results = (await repo.listResultsForDivision(division.id)).filter(
        (r) => r.status === "finished",
      );
      for (const stationKey of [...STATION_KEYS, "finish"] as const) {
        const values =
          stationKey === "finish"
            ? results.map((r) => r.finishTimeMs)
            : results.map(
                (r) => r.splits.stations.find((s) => s.key === stationKey)?.timeMs,
              );
        const clean = values.filter((v): v is number => typeof v === "number" && v > 0);
        if (clean.length === 0) continue;
        const key = `${division.divisionKey}::${stationKey}`;
        buckets.set(key, [...(buckets.get(key) ?? []), ...clean]);
      }
    }
  }

  const rows: Omit<StationDistribution, "id">[] = [...buckets.entries()].map(
    ([key, values]) => {
      const [divisionKey, stationKey] = key.split("::");
      return {
        scope: "global" as const,
        eventId: null,
        divisionKey,
        stationKey,
        computedAt,
        ...summarise(values),
      };
    },
  );

  await repo.replaceStationDistributions(rows);
  return { written: rows.length };
}
