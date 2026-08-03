/**
 * The sync engine: the shared machinery every ingestion mode runs on.
 *
 * Catalog, backfill, live and reconcile differ only in *what they ask for* and
 * *how often*. What happens to a division once it arrives — parse, normalise,
 * validate, quarantine, hash, diff, upsert, publish, recount — is one code path
 * here, so live races and a two-year backfill cannot drift apart in behaviour.
 *
 * The rule that shapes everything: **if we cannot fetch, we write nothing.**
 * Freezing on last-good data is always better than a half-written event, and a
 * live board that stops updating and says so is better than one that quietly
 * shows five-minute-old positions as current (brief §11).
 */

import { createHash } from "node:crypto";
import type { ResultsRepository } from "../repository";
import type { SourceAdapter } from "../source/adapter";
import { AllSourcesFailedError } from "../source/adapter";
import { Normaliser } from "../normalise/normaliser";
import { parseDivisionRows } from "../source/mika-parse";
import { summariseShape, type SentinelVerdict } from "../validate/sentinel";
import type {
  EngineDivision,
  EngineEvent,
  IngestionMode,
  RawDivisionPage,
  SyncState,
} from "../types";
import {
  channelForEvent,
  type LiveUpdate,
  type RealtimePublisher,
} from "./publisher";
import { reapStaleRuns, recordSharedRequests } from "../ops/run-hygiene";

export type EngineDeps = {
  repo: ResultsRepository;
  adapter: SourceAdapter;
  publisher?: RealtimePublisher;
  now?: () => Date;
};

export type DivisionSyncOutcome = {
  sourceDivisionId: string;
  changed: boolean;
  inserted: number;
  updated: number;
  unchanged: number;
  quarantined: number;
  shape: SentinelVerdict;
  /** Set when stored rows fall short of what the source published. */
  completenessMismatch?: { published: number; stored: number };
  skippedUnchanged?: boolean;
};

/** Content hash, since the source sends no ETag (SOURCE.md §6). */
export function hashRows(page: RawDivisionPage): string {
  const canonical = page.rows
    .map((r) =>
      [r.sourceResultId, r.rankOverall ?? "", r.finishTime ?? "", r.status ?? ""].join("|"),
    )
    .sort()
    .join("\n");
  return createHash("sha256").update(canonical).digest("hex");
}

export class SyncEngine {
  private normaliser: Normaliser;
  private now: () => Date;

  constructor(private deps: EngineDeps) {
    this.normaliser = new Normaliser(deps.repo);
    this.now = deps.now ?? (() => new Date());
  }

  get repo() {
    return this.deps.repo;
  }

  get adapter() {
    return this.deps.adapter;
  }

  /**
   * Fetch, normalise and store one division.
   *
   * Returns `changed: false` without touching the database when the content
   * hash matches the last poll, which is what keeps a 20-second live poll from
   * rewriting 3,000 rows every 20 seconds.
   */
  async syncDivision(opts: {
    seasonPath: string;
    event: EngineEvent;
    division: EngineDivision;
    sourceDivisionId: string;
    ingestionRunId?: string;
    /** Live mode publishes; backfill does not. */
    publish?: boolean;
    /** Force a write even when the hash is unchanged (operator "force sync"). */
    force?: boolean;
  }): Promise<DivisionSyncOutcome> {
    const {
      seasonPath,
      event,
      division,
      sourceDivisionId,
      ingestionRunId,
      publish = false,
      force = false,
    } = opts;

    const page = await this.deps.adapter.fetchDivision(seasonPath, sourceDivisionId);
    const hash = hashRows(page);
    const state = await this.deps.repo.getSyncState(event.sourceEventId ?? event.slug);

    // Re-read rather than trusting the caller's copy. A stale division object —
    // captured before an earlier sync wrote its hash — makes the unchanged
    // check silently never match, which costs a full rewrite per poll and is
    // invisible except as churn.
    const current =
      (await this.deps.repo.listDivisions(event.id)).find((d) => d.id === division.id) ??
      division;

    // Compared against the *division's* hash. An event-level hash is overwritten
    // by every division in turn, so the check never matches and every poll
    // rewrites every row of every division.
    if (!force && current.lastSeenHash === hash) {
      await this.deps.repo.upsertSyncState({
        ...emptyState(event),
        ...state,
        lastPolledAt: this.now().toISOString(),
        lastSuccessAt: this.now().toISOString(),
        consecutiveFailures: 0,
      });
      await this.deps.repo.upsertDivision({
        ...current,
        lastSyncedAt: this.now().toISOString(),
      });
      return {
        sourceDivisionId,
        changed: false,
        inserted: 0,
        updated: 0,
        unchanged: page.rows.length,
        quarantined: 0,
        shape: { ok: true },
        skippedUnchanged: true,
      };
    }

    // The parser's own view, carried on the page. Reconstructing it from
    // `page.rows` here would defeat the sentinel entirely: a renamed column
    // yields zero rows, which reconstructs to "empty shell" and reads as a
    // quiet event rather than a broken parser.
    const diagnostics = page.diagnostics ?? {
      headerFields: [],
      candidateRows: page.rows.length,
      parsedRows: page.rows.length,
      emptyShell: page.rows.length === 0,
    };

    const outcome = await this.normaliser.normaliseDivision(page, {
      event,
      division,
      ingestionRunId,
      diagnostics,
    });

    for (const row of outcome.quarantined) {
      await this.deps.repo.quarantine(row);
    }

    const before = publish ? await this.snapshotRanks(division.id) : null;
    const counts = await this.deps.repo.upsertResults(outcome.rows);

    // Completeness, measured two ways, because they catch different failures.
    //
    //   stored  < published — we hold less than the source says exists. The
    //                         under-collection case: a page was missed.
    //   fetched < published — *this fetch* came back short, even if what we
    //                         already hold is complete. The source is having a
    //                         moment, or our pagination stopped early.
    //
    // Only checking `stored` misses the second entirely: a division that serves
    // three rows where it claims eight looks perfectly healthy as long as eight
    // are already in the table. That is the fetch quietly degrading, and it is
    // exactly what you want to hear about before it becomes under-collection.
    let completenessMismatch: DivisionSyncOutcome["completenessMismatch"];
    if (page.publishedEntrantCount !== undefined && page.publishedEntrantCount > 0) {
      const stored = await this.deps.repo.countResultsForDivision(division.id);
      const fetched = page.rows.length;

      if (stored < page.publishedEntrantCount) {
        completenessMismatch = { published: page.publishedEntrantCount, stored };
        await this.deps.repo.raiseAlert({
          kind: "completeness",
          severity: "warning",
          message:
            `${division.displayName} at ${event.name}: stored ${stored} rows against a ` +
            `published ${page.publishedEntrantCount}. A page of results may have been missed.`,
          detail: { ...completenessMismatch, sourceDivisionId, fetched },
          sourceEventId: event.sourceEventId ?? null,
          acknowledgedAt: null,
        });
      } else if (fetched < page.publishedEntrantCount) {
        // Rows are never deleted on a short fetch: eight athletes vanishing
        // from history is far less likely than one bad page, so what we hold
        // stands and the discrepancy is reported instead.
        completenessMismatch = { published: page.publishedEntrantCount, stored: fetched };
        await this.deps.repo.raiseAlert({
          kind: "completeness",
          severity: "info",
          message:
            `${division.displayName} at ${event.name}: this fetch returned ${fetched} rows ` +
            `against a published ${page.publishedEntrantCount}. Stored data (${stored}) is ` +
            `unchanged; the source served a short page.`,
          detail: { published: page.publishedEntrantCount, fetched, stored, sourceDivisionId },
          sourceEventId: event.sourceEventId ?? null,
          acknowledgedAt: null,
        });
      }
      await this.deps.repo.upsertDivision({
        ...current,
        publishedEntrantCount: page.publishedEntrantCount,
        entrantCount: await this.deps.repo.countResultsForDivision(division.id),
        lastSeenHash: hash,
        lastSyncedAt: this.now().toISOString(),
      });
    } else {
      await this.deps.repo.upsertDivision({
        ...current,
        lastSeenHash: hash,
        lastSyncedAt: this.now().toISOString(),
      });
    }

    if (!outcome.shape.ok) {
      await this.deps.repo.raiseAlert({
        kind: "parser_shape",
        severity: "critical",
        message: outcome.shape.message,
        detail: outcome.shape.detail,
        sourceEventId: event.sourceEventId ?? null,
        acknowledgedAt: null,
      });
    }

    await this.deps.repo.upsertSyncState({
      ...emptyState(event),
      ...(state ?? {}),
      sourceEventId: event.sourceEventId ?? event.slug,
      eventId: event.id,
      lastSeenHash: hash,
      lastPolledAt: this.now().toISOString(),
      lastSuccessAt: this.now().toISOString(),
      consecutiveFailures: 0,
      updatesPaused: false,
    });

    if (publish && this.deps.publisher && (counts.inserted > 0 || counts.updated > 0)) {
      await this.publishChanges(event, division, before ?? new Map());
    }

    return {
      sourceDivisionId,
      changed: counts.inserted > 0 || counts.updated > 0,
      inserted: counts.inserted,
      updated: counts.updated,
      unchanged: counts.unchanged,
      quarantined: outcome.quarantined.length,
      shape: outcome.shape,
      completenessMismatch,
    };
  }

  /**
   * Every access method failed.
   *
   * Freeze: write nothing, mark any live event `updates_paused` so the board
   * stops claiming to be current, and alert. Presenting stale data as live is
   * the one outcome worse than not updating.
   */
  async freezeOnFailure(event: EngineEvent, error: unknown): Promise<void> {
    const sourceEventId = event.sourceEventId ?? event.slug;
    const state = await this.deps.repo.getSyncState(sourceEventId);
    const wasLive = state?.isLive ?? event.status === "live";

    await this.deps.repo.upsertSyncState({
      ...emptyState(event),
      ...(state ?? {}),
      sourceEventId,
      eventId: event.id,
      lastPolledAt: this.now().toISOString(),
      consecutiveFailures: (state?.consecutiveFailures ?? 0) + 1,
      updatesPaused: wasLive,
    });

    if (wasLive) {
      await this.deps.repo.setEventStatus(event.id, "updates_paused");
      if (this.deps.publisher) {
        await this.deps.publisher.publish(channelForEvent(event.slug), {
          eventSlug: event.slug,
          divisionKey: "*",
          changed: [],
          updatedAt: this.now().toISOString(),
          updatesPaused: true,
        });
      }
    }

    // Not every failure is the source's fault. Labelling a database error
    // "source unreachable" sent me hunting for a network problem that did not
    // exist while a duplicate-key error sat in the detail field.
    const fromSource = error instanceof AllSourcesFailedError;
    await this.deps.repo.raiseAlert({
      kind: fromSource ? "source_unreachable" : "parser_shape",
      severity: wasLive ? "critical" : "warning",
      message: fromSource
        ? `Source unreachable for ${event.name}; froze on last-good data` +
          (wasLive ? " and paused live updates." : ".")
        : `Sync failed for ${event.name}, and not because of the source: ` +
          `${error instanceof Error ? error.message : String(error)}`,
      detail: {
        error: error instanceof Error ? error.message : String(error),
        attempts: error instanceof AllSourcesFailedError ? error.attempts : undefined,
      },
      sourceEventId: event.sourceEventId ?? null,
      acknowledgedAt: null,
    });
  }

  private async snapshotRanks(divisionId: string): Promise<Map<string, number | null>> {
    const rows = await this.deps.repo.listResultsForDivision(divisionId);
    return new Map(rows.map((r) => [r.sourceResultId, r.rankOverall ?? null]));
  }

  private async publishChanges(
    event: EngineEvent,
    division: EngineDivision,
    before: Map<string, number | null>,
  ) {
    const after = await this.deps.repo.listResultsForDivision(division.id);
    const changed: LiveUpdate["changed"] = [];

    for (const row of after) {
      const previous = before.get(row.sourceResultId);
      const isNew = !before.has(row.sourceResultId);
      if (isNew || previous !== (row.rankOverall ?? null)) {
        const athlete = await this.deps.repo.getAthleteById(row.athleteId);
        changed.push({
          sourceResultId: row.sourceResultId,
          rankOverall: row.rankOverall ?? null,
          finishTimeMs: row.finishTimeMs ?? null,
          athleteName: athlete?.name ?? "",
        });
      }
    }

    if (changed.length === 0) return;

    await this.deps.publisher!.publish(channelForEvent(event.slug), {
      eventSlug: event.slug,
      divisionKey: division.divisionKey,
      changed,
      updatedAt: this.now().toISOString(),
    });
  }

  /**
   * Wraps a run so a crash still closes the `ingestion_runs` row.
   *
   * Also tidies up after runs that were *killed* rather than thrown — a
   * function timeout or an instance recycle leaves a row saying `running` for
   * ever, and the console reads the newest run to decide whether a job is
   * working. Reaping on the way in means whichever worker next wakes up clears
   * the wreckage, without needing a janitor of its own.
   */
  async withRun<T>(
    mode: IngestionMode,
    triggerSource: string,
    fn: (runId: string) => Promise<T & { detail?: Record<string, unknown> }>,
  ): Promise<T> {
    await reapStaleRuns(this.deps.repo, this.now()).catch(() => {
      // Housekeeping must never stop the work it is housekeeping for.
    });

    const before = this.deps.adapter.requestCount();
    const run = await this.deps.repo.startRun({ mode, triggerSource });

    const settle = async (patch: Record<string, unknown>) => {
      // The delta, not `requestCount()`. The fetcher is a module singleton, so
      // on a warm serverless instance its counter is cumulative across every
      // run that instance has served — a live tick that made no requests was
      // reporting 160, which is the sort of number that sends you hunting for
      // a runaway that does not exist.
      const made = Math.max(0, this.deps.adapter.requestCount() - before);
      // Recorded against the budget every instance shares, so the cap holds
      // however many workers are running at once.
      if (made > 0) {
        await recordSharedRequests(this.deps.repo, made, this.now()).catch(() => {});
      }
      await this.deps.repo.finishRun(run.id, { requestsMade: made, ...patch });
    };

    try {
      const result = await fn(run.id);
      await settle({ status: "ok", ...(result as Record<string, unknown>) });
      return result;
    } catch (error) {
      await settle({
        status: "error",
        errors: [{ message: error instanceof Error ? error.message : String(error) }],
      });
      throw error;
    }
  }
}

export function emptyState(event: EngineEvent): SyncState {
  return {
    sourceEventId: event.sourceEventId ?? event.slug,
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
  };
}

export { summariseShape, parseDivisionRows };
