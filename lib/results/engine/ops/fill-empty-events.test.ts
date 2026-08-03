/**
 * OPERATOR TOOL — pull the events that hold no results at all.
 * Skipped unless `HYROX_FILL_EMPTY=1`.
 *
 *   HYROX_FILL_EMPTY=1 HYROX_SOURCE_ACCESS=authorised npx vitest run fill-empty-events
 *
 * The general backfill walks events in market-priority order and re-verifies
 * ones it has already pulled, which is correct but wasteful when the actual gap
 * is known: 38 of 223 events hold nothing, and reaching them behind 185
 * completed ones costs hours of requests that find no new rows.
 *
 * This goes straight at them. Same engine, same idempotent upserts, same
 * checkpointing — only the work list differs, so it composes with the general
 * backfill rather than replacing it.
 *
 * ⚠️ An event with no results is not necessarily a gap. Some never ran, and
 * their boards are genuinely empty at source; those are reported and skipped
 * rather than retried for ever.
 */

import { describe, expect, it } from "vitest";
import { SupabaseResultsRepository } from "../supabase-repo";
import { SyncEngine } from "../sync/engine";
import { createHyroxChain } from "../source/hyrox-adapter";
import { SourceFetcher } from "../fetch/fetcher";
import { OutboundBudget } from "../fetch/guard";
import { recomputeDistributionsForEvent } from "../sync/distributions";
import { backfillEventTotals } from "../sync/event-totals";
import { recomputeRecords } from "../sync/records";
import { hasResultsSupabaseConfig } from "../supabase-client";

const enabled = process.env.HYROX_FILL_EMPTY === "1" && hasResultsSupabaseConfig();
const suite = enabled ? describe : describe.skip;
const MINUTES = Number(process.env.HYROX_FILL_MINUTES ?? 240);
const RATE = Number(process.env.HYROX_FILL_RATE ?? 45);

suite("fill empty events", () => {
  it("pulls every event holding no results", async () => {
    const repo = new SupabaseResultsRepository();
    const chain = createHyroxChain(
      new SourceFetcher({
        authorised: true,
        budget: new OutboundBudget({ maxRequests: RATE, windowMs: 60_000 }),
        maxAttempts: 3,
      }),
    );
    const engine = new SyncEngine({ repo, adapter: chain });
    const deadline = Date.now() + MINUTES * 60_000;

    const [events, divisions] = await Promise.all([
      repo.listEvents(),
      repo.listAllDivisions(),
    ]);

    const divisionsByEvent = new Map<string, typeof divisions>();
    for (const d of divisions) {
      divisionsByEvent.set(d.eventId, [...(divisionsByEvent.get(d.eventId) ?? []), d]);
    }

    // "Holds nothing" is the sum of its divisions' stored counts, which the
    // roll-up keeps honest.
    const empty = events.filter((e) =>
      (divisionsByEvent.get(e.id) ?? []).every((d) => (d.entrantCount ?? 0) === 0),
    );
    console.log(`[fill] ${empty.length} of ${events.length} events hold no results`);

    let filled = 0;
    let genuinelyEmpty = 0;
    let failedDivisions = 0;
    let rows = 0;

    for (const event of empty) {
      if (Date.now() > deadline) {
        console.log("[fill] out of time");
        break;
      }
      const seasonPath =
        event.sourceSeasonPath ?? `season-${/s(\d+)/.exec(event.season)?.[1] ?? "9"}`;
      let eventRows = 0;

      for (const division of divisionsByEvent.get(event.id) ?? []) {
        if (!division.sourceDivisionId) continue;
        try {
          const outcome = await engine.syncDivision({
            seasonPath,
            event,
            division,
            sourceDivisionId: division.sourceDivisionId,
          });
          eventRows += outcome.inserted + outcome.updated;
        } catch (error) {
          console.log(
            `[fill] ${event.slug}/${division.divisionKey} failed: ` +
              `${(error as Error).message.slice(0, 70)}`,
          );
          failedDivisions += 1;
        }
      }

      if (eventRows > 0) {
        await recomputeDistributionsForEvent(repo, event.id);
        filled += 1;
        rows += eventRows;
        console.log(`[fill] ${event.slug}: +${eventRows} rows (${chain.requestCount()} requests)`);
      } else {
        genuinelyEmpty += 1;
        console.log(`[fill] ${event.slug}: nothing at source`);
      }
    }

    await backfillEventTotals(repo);
    await recomputeRecords(repo);

    console.log(
      `[fill] done: ${filled} events filled (+${rows} rows), ${genuinelyEmpty} empty at ` +
        `source, ${failedDivisions} divisions failed, ${chain.requestCount()} requests`,
    );
    expect(filled + genuinelyEmpty).toBeGreaterThan(0);
  }, MINUTES * 60_000 + 120_000);
});
