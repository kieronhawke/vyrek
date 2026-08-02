/**
 * Backfill — the one-off historical pull that gives athlete pages their depth.
 *
 * Two properties matter more than speed:
 *
 * **Resumable.** Nine seasons of results is the largest thing this system will
 * ever ask of the source. It will be interrupted — a deploy, a timeout, a
 * tripped breaker — and when it is, it must pick up at the next event rather
 * than start again. So progress is checkpointed per event in `sync_state`, and
 * a re-run skips what is already done. There is no "backfill in progress" flag
 * to get stuck on.
 *
 * **Rate-limited hard.** This is a big pull against a source we want to keep
 * access to, so it runs inside the same global outbound budget as everything
 * else and takes a per-run event cap. It is meant to take days, quietly.
 *
 * Priority order is market order: UK first, then India and Hong Kong, then the
 * rest (brief §5).
 */

import type { EngineEvent } from "../types";
import type { SyncEngine } from "./engine";
import { recomputeDistributionsForEvent } from "./distributions";

export const PRIORITY_REGIONS = ["UK", "India", "Hong Kong"] as const;

const PRIORITY_CITIES: Record<string, number> = {
  london: 0, manchester: 0, birmingham: 0, glasgow: 0, cardiff: 0, dublin: 0,
  leeds: 0, bristol: 0, sheffield: 0, newcastle: 0, liverpool: 0,
  mumbai: 1, delhi: 1, "new delhi": 1, bengaluru: 1, bangalore: 1,
  "hong kong": 2, hongkong: 2,
};

/** UK first, then India and Hong Kong, then everything else by date. */
export function backfillPriority(event: EngineEvent): number {
  const city = event.city.toLowerCase();
  if (city in PRIORITY_CITIES) return PRIORITY_CITIES[city];
  if (PRIORITY_REGIONS.includes(event.region as (typeof PRIORITY_REGIONS)[number])) return 1;
  return 9;
}

export function orderForBackfill(events: EngineEvent[]): EngineEvent[] {
  return [...events].sort((a, b) => {
    const byPriority = backfillPriority(a) - backfillPriority(b);
    if (byPriority !== 0) return byPriority;
    // Newest first within a band: recent races are what people search for.
    return (b.startDate ?? "").localeCompare(a.startDate ?? "");
  });
}

export type BackfillResult = {
  eventsCompleted: string[];
  eventsSkipped: string[];
  eventsFailed: string[];
  rowsUpserted: number;
  rowsQuarantined: number;
  exhaustedBudget: boolean;
};

export async function runBackfill(
  engine: SyncEngine,
  opts: {
    seasonPaths?: string[];
    /** Events per run. Small on purpose: this is a marathon, not a sprint. */
    maxEvents?: number;
    triggerSource?: string;
    now?: Date;
  } = {},
): Promise<BackfillResult> {
  const repo = engine.repo;
  const maxEvents = opts.maxEvents ?? 2;

  return engine.withRun("backfill", opts.triggerSource ?? "manual", async (runId) => {
    const result: BackfillResult = {
      eventsCompleted: [],
      eventsSkipped: [],
      eventsFailed: [],
      rowsUpserted: 0,
      rowsQuarantined: 0,
      exhaustedBudget: false,
    };

    const all = await repo.listEvents();
    const ordered = orderForBackfill(all);

    for (const event of ordered) {
      if (result.eventsCompleted.length >= maxEvents) {
        result.exhaustedBudget = true;
        break;
      }

      const sourceEventId = event.sourceEventId ?? event.slug;
      const state = await repo.getSyncState(sourceEventId);

      // The checkpoint: an event with a hash has been pulled. Re-running the
      // backfill is therefore free and safe, which is the recovery story.
      if (state?.lastSeenHash) {
        result.eventsSkipped.push(event.slug);
        continue;
      }

      try {
        const divisions = await repo.listDivisions(event.id);
        for (const division of divisions) {
          const outcome = await engine.syncDivision({
            seasonPath: event.sourceSeasonPath ?? opts.seasonPaths?.[0] ?? "season-9",
            event,
            division,
            sourceDivisionId: division.sourceDivisionId ?? division.divisionKey,
            ingestionRunId: runId,
          });
          result.rowsUpserted += outcome.inserted + outcome.updated;
          result.rowsQuarantined += outcome.quarantined;
        }
        await recomputeDistributionsForEvent(repo, event.id);
        result.eventsCompleted.push(event.slug);
      } catch (error) {
        // One bad event does not stop the backfill. It is recorded, skipped,
        // and picked up by the next run because its checkpoint is still unset.
        await engine.freezeOnFailure(event, error);
        result.eventsFailed.push(event.slug);
      }
    }

    return {
      ...result,
      eventsTouched: result.eventsCompleted.length,
      rowsUpserted: result.rowsUpserted,
      rowsQuarantined: result.rowsQuarantined,
      detail: {
        completed: result.eventsCompleted,
        skipped: result.eventsSkipped.length,
        failed: result.eventsFailed,
      },
    } as BackfillResult & Record<string, unknown>;
  });
}
