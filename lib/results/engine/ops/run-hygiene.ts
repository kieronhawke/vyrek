/**
 * Two things that only go wrong once the system is actually running on a
 * schedule, in a serverless environment, against a shared database.
 *
 * ## 1. Runs that never finish
 *
 * `withRun` closes its row in a `finally`-shaped try/catch, which covers a
 * thrown error. It does not cover the process being *killed* — a Vercel
 * function hitting `maxDuration`, an instance recycled mid-flight, a deploy
 * landing during a sync. The row is left saying `running` for ever.
 *
 * Observed in production: four runs still `running` an hour after they started.
 * The operator console reads the newest run to decide a job's state, so those
 * jobs showed as busy and would never have shown as failed. A monitoring system
 * that cannot distinguish "working" from "died" is worse than none, because it
 * is trusted.
 *
 * So a run older than any plausible execution is reaped and marked `error`. The
 * next scheduled tick then runs normally, which is the self-healing behaviour
 * the whole design leans on.
 *
 * ## 2. A "global" budget that is per-process
 *
 * `OutboundBudget` counts requests in memory. On one machine that is a global
 * budget. On Vercel, where the live poller, the splits worker and the backfill
 * can each be a separate invocation on a separate instance, it is three
 * independent budgets that each believe they are the only one.
 *
 * The brief asks for a cap that holds "independent of how many events are live
 * at once", and in-memory counting cannot deliver that. This records every
 * request in the shared database, so the ceiling is real regardless of how many
 * instances are running.
 *
 * It is deliberately advisory rather than a lock: a rate limiter that can block
 * a worker indefinitely is a worse failure than briefly exceeding a
 * self-imposed politeness budget.
 */

import type { ResultsRepository } from "../repository";

const WINDOW_MS = 60_000;

/** Longest any single ingestion run could legitimately take. */
export const RUN_STALE_AFTER_MS = Number(process.env.RESULTS_RUN_STALE_MS ?? 15 * 60_000);

export type ReapResult = { reaped: string[] };

/**
 * Close out runs that cannot still be running.
 *
 * Called at the start of every worker, so a killed run is tidied by whichever
 * job next wakes up rather than needing a janitor of its own.
 */
export async function reapStaleRuns(
  repo: ResultsRepository,
  now: Date = new Date(),
): Promise<ReapResult> {
  const runs = await repo.listRuns(50);
  const reaped: string[] = [];

  for (const run of runs) {
    if (run.status !== "running") continue;
    const age = now.getTime() - new Date(run.startedAt).getTime();
    if (age < RUN_STALE_AFTER_MS) continue;

    await repo.finishRun(run.id, {
      status: "error",
      finishedAt: now.toISOString(),
      errors: [
        {
          message:
            `Run abandoned: still marked running after ${Math.round(age / 60_000)} minutes. ` +
            `The process was almost certainly killed — a function timeout, an instance ` +
            `recycle, or a deploy landing mid-run. No data is lost; every write is ` +
            `idempotent and the next tick resumes.`,
        },
      ],
    });
    reaped.push(run.id);
  }

  return { reaped };
}

/* ── Shared outbound budget ─────────────────────────────────────────────── */

const BUDGET_KEY = "outbound_request_log";

type RequestLog = { at: number }[];

/**
 * Requests made across every instance in the last minute.
 *
 * Stored as a timestamp list in settings rather than a counter, so the window
 * slides properly instead of resetting on a boundary — a counter that resets
 * on the minute allows a double-rate burst across the join.
 */
export async function sharedRequestsInWindow(
  repo: ResultsRepository,
  now: Date = new Date(),
): Promise<number> {
  const log = (await repo.getSetting<RequestLog>(BUDGET_KEY)) ?? [];
  const cutoff = now.getTime() - WINDOW_MS;
  return log.filter((e) => e.at > cutoff).length;
}

/**
 * Record `count` requests and report what remains.
 *
 * Read-modify-write, so two instances writing at the same instant can lose an
 * entry. That is accepted: the cost is very slightly over-counting requests
 * against a self-imposed politeness budget, and the alternative — a real
 * distributed lock on every fetch — buys precision nobody needs at the price of
 * a new way for ingestion to stall.
 */
export async function recordSharedRequests(
  repo: ResultsRepository,
  count: number,
  now: Date = new Date(),
): Promise<{ used: number; remaining: number; limit: number }> {
  const limit = Number(process.env.HYROX_MAX_REQUESTS_PER_MINUTE ?? 20);
  const cutoff = now.getTime() - WINDOW_MS;

  const existing = (await repo.getSetting<RequestLog>(BUDGET_KEY)) ?? [];
  const kept = existing.filter((e) => e.at > cutoff);
  for (let i = 0; i < count; i += 1) kept.push({ at: now.getTime() });

  // Bounded: a stuck clock or a runaway worker must not grow this row without
  // limit. Twice the limit is more history than the window can ever need.
  const trimmed = kept.slice(-Math.max(limit * 2, 100));
  await repo.setSetting(BUDGET_KEY, trimmed);

  const used = kept.length;
  return { used, remaining: Math.max(0, limit - used), limit };
}

/**
 * Should this worker start at all?
 *
 * Checked once before a run rather than before every request: the point is to
 * stop a *third* worker piling onto a source already being hit by two, not to
 * meter individual fetches, which the in-process budget already does well.
 */
export async function sharedBudgetAllows(
  repo: ResultsRepository,
  opts: { need?: number; now?: Date } = {},
): Promise<{ allowed: boolean; used: number; limit: number; reason: string | null }> {
  const now = opts.now ?? new Date();
  const need = opts.need ?? 1;
  const limit = Number(process.env.HYROX_MAX_REQUESTS_PER_MINUTE ?? 20);
  const used = await sharedRequestsInWindow(repo, now);

  if (used + need > limit) {
    return {
      allowed: false,
      used,
      limit,
      reason:
        `${used} of ${limit} requests already made this minute across all workers. ` +
        `Deferring to the next tick rather than adding to the load.`,
    };
  }
  return { allowed: true, used, limit, reason: null };
}
