/**
 * Live mode: self-arming, timezone-correct, and the only thing that touches the
 * source during a race.
 *
 * The arming rule is the part worth reading twice. Vercel cron runs in UTC, and
 * "is this event today?" is a question with no answer for a global sport: a
 * HYROX in Sydney starting 08:00 local on 4 August starts at 22:00 UTC on
 * 3 August. A naive calendar comparison arms it fourteen hours late, or not at
 * all. So arming compares *instants* — `start_datetime` is stored as a real UTC
 * moment and the offset is kept alongside it purely so we can print local time
 * (brief §13).
 *
 * Disarming matters as much as arming. An event that never disarms polls the
 * source every 20 seconds forever.
 */

import type { EngineEvent } from "../types";
import type { SyncEngine } from "./engine";
import { AllSourcesFailedError } from "../source/adapter";

/** Arm this long before the gun: the board goes live before the first finisher. */
export const PRE_ROLL_MINUTES = 60;
/** Keep polling after the last wave: results trickle in for a while. */
export const POST_ROLL_MINUTES = 240;

/** Hard floor, enforced server-side. The console cannot go below it (§12). */
export const MIN_LIVE_INTERVAL_SECONDS = 15;
export const DEFAULT_LIVE_INTERVAL_SECONDS = 20;

export function clampLiveInterval(seconds: number): number {
  if (!Number.isFinite(seconds)) return DEFAULT_LIVE_INTERVAL_SECONDS;
  return Math.max(MIN_LIVE_INTERVAL_SECONDS, Math.round(seconds));
}

/** Thrown rather than silently clamped, so the console shows a real rejection. */
export class IntervalBelowFloorError extends Error {
  readonly code = "INTERVAL_BELOW_FLOOR";
  constructor(requested: number) {
    super(
      `Live interval ${requested}s is below the ${MIN_LIVE_INTERVAL_SECONDS}s safety floor. ` +
        `The floor exists so the fetcher cannot be tuned into getting us blocked.`,
    );
    this.name = "IntervalBelowFloorError";
  }
}

export function assertLiveInterval(seconds: number): number {
  if (seconds < MIN_LIVE_INTERVAL_SECONDS) throw new IntervalBelowFloorError(seconds);
  return clampLiveInterval(seconds);
}

/**
 * Should this event be polling right now?
 *
 * Instant comparison, never a date comparison. `tzOffsetMinutes` is not used in
 * the maths at all — it exists to render "08:00 local" in the console — and
 * that is exactly why this is correct for Sydney, Mumbai and New York alike.
 */
export function shouldArmLive(event: EngineEvent, now: Date): boolean {
  if (!event.startDatetime) return false;
  if (event.status === "final") return false;

  const start = new Date(event.startDatetime).getTime();
  const end = event.endDatetime ? new Date(event.endDatetime).getTime() : start;
  const from = start - PRE_ROLL_MINUTES * 60_000;
  const until = end + POST_ROLL_MINUTES * 60_000;
  const t = now.getTime();
  return t >= from && t <= until;
}

export function shouldDisarmLive(event: EngineEvent, now: Date): boolean {
  if (event.status === "final") return true;
  if (!event.startDatetime) return true;
  const start = new Date(event.startDatetime).getTime();
  const end = event.endDatetime ? new Date(event.endDatetime).getTime() : start;
  return now.getTime() > end + POST_ROLL_MINUTES * 60_000;
}

/** Local wall-clock start, for the console. Display only. */
export function localStartLabel(event: EngineEvent): string | null {
  if (!event.startDatetime) return null;
  const shifted = new Date(
    new Date(event.startDatetime).getTime() + event.tzOffsetMinutes * 60_000,
  );
  return shifted.toISOString().replace("T", " ").slice(0, 16);
}

export type LiveTickResult = {
  armed: string[];
  disarmed: string[];
  polled: string[];
  skippedNotDue: string[];
  changes: number;
  frozen: string[];
  detail: Record<string, unknown>;
};

/**
 * One tick of the live poller.
 *
 * Called by cron every minute; decides for itself which events are due. Each
 * run is independent and stateless beyond the database, so a crashed tick
 * never stops the next one — the next tick just resumes (brief §11).
 */
export async function runLiveTick(
  engine: SyncEngine,
  opts: { now?: Date; seasonPath?: string; triggerSource?: string } = {},
): Promise<LiveTickResult> {
  const now = opts.now ?? new Date();
  const repo = engine.repo;

  const result: LiveTickResult = {
    armed: [],
    disarmed: [],
    polled: [],
    skippedNotDue: [],
    changes: 0,
    frozen: [],
    detail: {},
  };

  return engine.withRun("live", opts.triggerSource ?? "cron", async (runId) => {
    const candidates = [
      ...(await repo.listEvents({ status: "upcoming" })),
      ...(await repo.listEvents({ status: "live" })),
      ...(await repo.listEvents({ status: "updates_paused" })),
    ];

    const configured = await repo.getSetting<number>("live_interval_seconds");
    const interval = clampLiveInterval(configured ?? DEFAULT_LIVE_INTERVAL_SECONDS);

    for (const event of candidates) {
      const sourceEventId = event.sourceEventId ?? event.slug;
      const state = await repo.getSyncState(sourceEventId);

      if (shouldDisarmLive(event, now)) {
        if (state?.isLive) {
          await repo.upsertSyncState({ ...state, isLive: false, updatesPaused: false });
          await repo.setEventStatus(event.id, "final");
          result.disarmed.push(event.slug);
        }
        continue;
      }

      if (!shouldArmLive(event, now)) continue;

      if (!state?.isLive) {
        await repo.upsertSyncState({
          sourceEventId,
          eventId: event.id,
          lastSeenHash: state?.lastSeenHash ?? null,
          lastPolledAt: state?.lastPolledAt ?? null,
          lastSuccessAt: state?.lastSuccessAt ?? null,
          isLive: true,
          liveArmedAt: now.toISOString(),
          liveIntervalSeconds: interval,
          consecutiveFailures: 0,
          updatesPaused: false,
          reconcileUntil: state?.reconcileUntil ?? null,
          reconcileAttempts: state?.reconcileAttempts ?? 0,
        });
        await repo.setEventStatus(event.id, "live");
        result.armed.push(event.slug);
      }

      // Due yet? One upstream fetch per event per interval, regardless of how
      // many browsers are watching — this line is the fan-out guarantee.
      const lastPolled = state?.lastPolledAt ? new Date(state.lastPolledAt).getTime() : 0;
      if (now.getTime() - lastPolled < interval * 1000) {
        result.skippedNotDue.push(event.slug);
        continue;
      }

      const divisions = await repo.listDivisions(event.id);
      try {
        for (const division of divisions) {
          const outcome = await engine.syncDivision({
            seasonPath: opts.seasonPath ?? event.sourceSeasonPath ?? "season-9",
            event,
            division,
            sourceDivisionId: division.sourceDivisionId ?? division.divisionKey,
            ingestionRunId: runId,
            publish: true,
          });
          if (outcome.changed) result.changes += outcome.inserted + outcome.updated;
        }
        result.polled.push(event.slug);
        if (event.status === "updates_paused") {
          await repo.setEventStatus(event.id, "live");
        }
      } catch (error) {
        // Every method failed. Write nothing, pause updates, alert, carry on to
        // the next event — one dead event must not stop the others.
        await engine.freezeOnFailure(event, error);
        result.frozen.push(event.slug);
        if (!(error instanceof AllSourcesFailedError) && result.frozen.length > 3) throw error;
      }
    }

    return {
      ...result,
      eventsTouched: result.polled.length,
      rowsUpserted: result.changes,
      detail: {
        armed: result.armed,
        disarmed: result.disarmed,
        polled: result.polled,
        frozen: result.frozen,
        intervalSeconds: interval,
      },
    } as LiveTickResult & Record<string, unknown>;
  });
}
