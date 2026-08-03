/**
 * Splits backfill — the worker that turns a finish time into a race.
 *
 * The division list gives rank, name, nationality, age group and a finish time.
 * Everything the result page is actually *for* — the race strip, the station
 * bars, the pacing chart, the weakest-station callout, the percentile engine —
 * needs the eight runs, eight stations and Roxzone, and those live on a
 * per-athlete detail view. **One request per athlete.**
 *
 * That number is the whole design constraint. A 3,000-entrant weekend is 3,000
 * requests; at the global budget of 20 a minute that is two and a half hours
 * for one event. So splits are not fetched during the division sync, and they
 * are not fetched on page render either (ingestion never runs in a request).
 * They are filled in by this worker, a slice at a time, forever, in priority
 * order:
 *
 * 1. **Claimed athletes** — someone owns that page and will look at it.
 * 2. **Top of the board** — the results people actually open.
 * 3. **Everyone else**, oldest event first, so history converges too.
 *
 * The effect is that a finished event has its podium fully broken down within
 * minutes and its long tail within days, without ever exceeding the budget.
 * Results pages render from whatever is stored, and a result without splits
 * shows its summary rather than an error.
 */

import type { ResultsRepository } from "../repository";
import type { SyncEngine } from "./engine";
import { parseTimeToMs } from "../normalise/time";
import { validateRow } from "../validate/validate";
import type { EngineDivision, EngineEvent, EngineResult, Splits } from "../types";

export type SplitsResult = {
  attempted: number;
  filled: number;
  quarantined: number;
  failed: number;
  remaining: number;
};

/** `H_LR3MS4JI163A#men:LRAA0001` → `LRAA0001`. */
export function idpFromSourceResultId(sourceResultId: string): string | null {
  const idp = sourceResultId.split(":").pop();
  return idp && /^[A-Za-z0-9]+$/.test(idp) ? idp : null;
}

export function hasSplits(result: EngineResult): boolean {
  return result.splits.runs.length > 0 || result.splits.stations.length > 0;
}

export async function runSplitsBackfill(
  engine: SyncEngine,
  opts: { limit?: number; triggerSource?: string; eventSlug?: string } = {},
): Promise<SplitsResult> {
  const repo = engine.repo;
  // Small by default: this runs often and must leave budget for live polling.
  const limit = opts.limit ?? Number(process.env.HYROX_SPLITS_PER_RUN ?? 15);

  return engine.withRun("backfill", opts.triggerSource ?? "cron", async (runId) => {
    const result: SplitsResult = {
      attempted: 0,
      filled: 0,
      quarantined: 0,
      failed: 0,
      remaining: 0,
    };

    const pending = await selectPending(repo, { limit, eventSlug: opts.eventSlug });
    result.remaining = pending.remaining;

    for (const { event, division, row } of pending.rows) {
      const idp = row.sourceResultId.includes(":")
        ? idpFromSourceResultId(row.sourceResultId)
        : null;
      if (!idp) {
        // No stable id means no detail URL to fetch. Skipping rather than
        // guessing: a wrong idp fetches somebody else's race.
        result.failed += 1;
        continue;
      }

      result.attempted += 1;

      try {
        const detail = await engine.adapter.fetchResultDetail(
          event.sourceSeasonPath ?? "season-9",
          { idp, sourceDivisionId: division.sourceDivisionId ?? division.divisionKey },
        );

        const splits: Splits = {
          runs: detail.runs
            .map((r) => ({ key: r.key, timeMs: parseTimeToMs(r.time) ?? 0 }))
            .filter((r) => r.timeMs > 0),
          stations: detail.stations
            .map((s) => ({ key: s.key, timeMs: parseTimeToMs(s.time) ?? 0 }))
            .filter((s) => s.timeMs > 0),
          roxzoneMs: parseTimeToMs(detail.roxzone ?? null) ?? undefined,
        };

        const finishTimeMs = row.finishTimeMs ?? parseTimeToMs(detail.finish ?? null);

        // Validated with the splits attached: this is the first point at which
        // "do the splits sum to the finish" is a question that can be asked.
        const verdict = validateRow({
          sourceResultId: row.sourceResultId,
          finishTimeMs: finishTimeMs ?? null,
          roxzoneTimeMs: splits.roxzoneMs ?? null,
          splits,
          status: row.status,
          rankOverall: row.rankOverall ?? null,
          name: "athlete",
        });

        if (!verdict.ok) {
          await repo.quarantine({
            sourceEventId: event.sourceEventId ?? null,
            sourceDivisionId: division.sourceDivisionId ?? null,
            sourceResultId: row.sourceResultId,
            reason: verdict.failures.map((f) => f.reason).join(","),
            detail: { failures: verdict.failures, stage: "splits" },
            rawPayload: detail,
            ingestionRunId: runId,
            reprocessedAt: null,
          });
          result.quarantined += 1;
          continue;
        }

        await repo.upsertResults([
          {
            ...row,
            splits,
            roxzoneTimeMs: splits.roxzoneMs ?? row.roxzoneTimeMs ?? null,
            finishTimeMs: finishTimeMs ?? row.finishTimeMs ?? null,
            bib: row.bib ?? detail.bib ?? null,
          },
        ]);
        result.filled += 1;
      } catch {
        // One unreachable detail page must not end the run; the next tick
        // picks this row up again because it still has no splits.
        result.failed += 1;
      }
    }

    return {
      ...result,
      eventsTouched: 0,
      rowsUpserted: result.filled,
      rowsQuarantined: result.quarantined,
      detail: {
        attempted: result.attempted,
        filled: result.filled,
        failed: result.failed,
        remaining: result.remaining,
      },
    } as SplitsResult & Record<string, unknown>;
  });
}

/**
 * The next slice of results needing splits, in priority order.
 *
 * Claimed profiles first, then rank, then event age. Sorting in memory is fine
 * at this scale because the slice is tiny; the Supabase implementation of
 * `listResultsForDivision` is the thing that would need an index if this ever
 * walked the whole table.
 */
type PendingRow = {
  event: EngineEvent;
  division: EngineDivision;
  row: EngineResult;
};

async function selectPending(
  repo: ResultsRepository,
  opts: { limit: number; eventSlug?: string },
): Promise<{ rows: PendingRow[]; remaining: number }> {
  const events = opts.eventSlug
    ? [await repo.getEventBySlug(opts.eventSlug)].filter(Boolean)
    : await repo.listEvents();

  const candidates: (PendingRow & { priority: number })[] = [];

  for (const event of events) {
    if (!event) continue;
    for (const division of await repo.listDivisions(event.id)) {
      for (const row of await repo.listResultsForDivision(division.id)) {
        if (hasSplits(row)) continue;
        if (row.status !== "finished") continue;

        const athlete = await repo.getAthleteById(row.athleteId);
        const claimed = Boolean(athlete?.claimedByUserId);
        // Lower sorts first: claimed profiles, then the top of the board.
        const priority = claimed ? -1_000_000 : (row.rankOverall ?? 9_999);
        candidates.push({ event, division, row, priority });
      }
    }
  }

  candidates.sort((a, b) => a.priority - b.priority);
  return {
    rows: candidates.slice(0, opts.limit),
    remaining: Math.max(0, candidates.length - opts.limit),
  };
}
