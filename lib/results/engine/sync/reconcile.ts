/**
 * Post-race reconciliation.
 *
 * Results are not final when they say FINAL. DQs land days later, timing errors
 * get corrected, a mis-scanned bib gets reassigned. A system that pulls once
 * and never looks again will publish a podium that the official results
 * corrected a week ago, and it will keep publishing it forever.
 *
 * So each finalised event is re-synced on a decaying schedule — often at first,
 * then rarely, then never. The decay matters: re-syncing every finished event
 * hourly forever is both pointless and exactly the kind of steady load that
 * gets a fetcher blocked (brief §11).
 */

import type { EngineEvent, SyncState } from "../types";
import type { SyncEngine } from "./engine";
import { recomputeDistributionsForEvent } from "./distributions";

/**
 * Hours after the event to re-check, in order. Dense for the first two days,
 * then a week, then a fortnight, then stop.
 */
export const RECONCILE_SCHEDULE_HOURS = [6, 24, 48, 168, 336] as const;

export function reconcileWindowMs(): number {
  return RECONCILE_SCHEDULE_HOURS[RECONCILE_SCHEDULE_HOURS.length - 1] * 3_600_000;
}

/** Is this event due its next reconciliation pass? */
export function isReconcileDue(
  event: EngineEvent,
  state: SyncState | null,
  now: Date,
): boolean {
  if (event.status !== "final") return false;
  const end = event.endDatetime ?? event.startDatetime;
  if (!end) return false;

  const sinceEndMs = now.getTime() - new Date(end).getTime();
  if (sinceEndMs < 0) return false;
  if (sinceEndMs > reconcileWindowMs()) return false;

  const attempts = state?.reconcileAttempts ?? 0;
  if (attempts >= RECONCILE_SCHEDULE_HOURS.length) return false;

  return sinceEndMs >= RECONCILE_SCHEDULE_HOURS[attempts] * 3_600_000;
}

export type ReconcileResult = {
  eventsChecked: string[];
  eventsAmended: string[];
  rowsUpserted: number;
  mismatches: { eventSlug: string; divisionKey: string; published: number; stored: number }[];
};

export async function runReconcile(
  engine: SyncEngine,
  opts: { now?: Date; triggerSource?: string; maxEvents?: number } = {},
): Promise<ReconcileResult> {
  const now = opts.now ?? new Date();
  const repo = engine.repo;
  const maxEvents = opts.maxEvents ?? 5;

  return engine.withRun("reconcile", opts.triggerSource ?? "cron", async (runId) => {
    const result: ReconcileResult = {
      eventsChecked: [],
      eventsAmended: [],
      rowsUpserted: 0,
      mismatches: [],
    };

    const finals = await repo.listEvents({ status: "final" });

    for (const event of finals) {
      if (result.eventsChecked.length >= maxEvents) break;

      const sourceEventId = event.sourceEventId ?? event.slug;
      const state = await repo.getSyncState(sourceEventId);
      if (!isReconcileDue(event, state, now)) continue;

      result.eventsChecked.push(event.slug);
      let amended = false;

      try {
        for (const division of await repo.listDivisions(event.id)) {
          const outcome = await engine.syncDivision({
            seasonPath: event.sourceSeasonPath ?? "season-9",
            event,
            division,
            sourceDivisionId: division.sourceDivisionId ?? division.divisionKey,
            ingestionRunId: runId,
            // Force: the whole point is to catch a change the hash would hide
            // if the amendment happens to leave the hashed fields identical.
            force: true,
          });
          result.rowsUpserted += outcome.updated;
          if (outcome.updated > 0) amended = true;
          if (outcome.completenessMismatch) {
            result.mismatches.push({
              eventSlug: event.slug,
              divisionKey: division.divisionKey,
              ...outcome.completenessMismatch,
            });
          }
        }

        if (amended) {
          await recomputeDistributionsForEvent(repo, event.id);
          result.eventsAmended.push(event.slug);
        }
      } catch (error) {
        await engine.freezeOnFailure(event, error);
      }

      // Advance the schedule whether or not anything changed, or a quiet event
      // is re-checked on every tick for a fortnight.
      await repo.upsertSyncState({
        ...(state ?? {
          sourceEventId,
          eventId: event.id,
          lastSeenHash: null,
          lastPolledAt: null,
          lastSuccessAt: null,
          isLive: false,
          liveArmedAt: null,
          liveIntervalSeconds: 20,
          consecutiveFailures: 0,
          updatesPaused: false,
          reconcileUntil: null,
          reconcileAttempts: 0,
        }),
        reconcileAttempts: (state?.reconcileAttempts ?? 0) + 1,
        reconcileUntil: new Date(now.getTime() + reconcileWindowMs()).toISOString(),
      });
    }

    return {
      ...result,
      eventsTouched: result.eventsChecked.length,
      rowsUpserted: result.rowsUpserted,
      detail: {
        checked: result.eventsChecked,
        amended: result.eventsAmended,
        mismatches: result.mismatches,
      },
    } as ReconcileResult & Record<string, unknown>;
  });
}
