/**
 * OPERATOR TOOL — the long backfill. Skipped unless `HYROX_BACKFILL=1`.
 *
 * Walks every season, catalogues each one, then pulls results for event after
 * event until it runs out of work or out of time. Writes to the real database.
 *
 *   HYROX_BACKFILL=1 HYROX_SOURCE_ACCESS=authorised \
 *     HYROX_BACKFILL_MINUTES=45 npx vitest run live-backfill
 *
 * Safe to stop and restart at any point. Every write is idempotent on a stable
 * source id and progress is checkpointed per division, so an interrupted run
 * resumes rather than repeating — which is what makes a multi-hour pull
 * survivable on a laptop.
 *
 * It runs inside the same global outbound budget as production, so it is
 * deliberately unhurried. The whole of HYROX is a lot of requests and the point
 * is to still have access at the end of it.
 */

import { describe, expect, it } from "vitest";
import { SupabaseResultsRepository } from "../supabase-repo";
import { SyncEngine } from "./engine";
import { createHyroxChain } from "../source/hyrox-adapter";
import { SourceFetcher } from "../fetch/fetcher";
import { OutboundBudget } from "../fetch/guard";
import { runCatalogSync } from "./catalog";
import { runBackfill, allSeasonPaths } from "./backfill";
import { enrichEventMetadata } from "./event-metadata";
import { hasResultsSupabaseConfig } from "../supabase-client";

const enabled = process.env.HYROX_BACKFILL === "1" && hasResultsSupabaseConfig();
const suite = enabled ? describe : describe.skip;

const MINUTES = Number(process.env.HYROX_BACKFILL_MINUTES ?? 30);
/** Higher than production's 20: this is a deliberate, supervised pull. */
const RATE = Number(process.env.HYROX_BACKFILL_RATE ?? 45);

suite("backfill", () => {
  it("pulls as much of HYROX as it can in the time given", async () => {
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
    const seasons = allSeasonPaths();
    let catalogued = 0;

    // Phase one: know what exists. Nothing can be backfilled that the catalogue
    // has never heard of.
    //
    // Skippable, because it is ~700 requests and it only has to be right once.
    // A long backfill will be interrupted — a laptop lid, a deploy, a kill —
    // and re-spending the catalogue on every restart is the difference between
    // resuming and starting again.
    const skipCatalogue = process.env.HYROX_SKIP_CATALOGUE === "1";
    for (const season of skipCatalogue ? [] : seasons) {
      if (Date.now() > deadline) break;
      try {
        const r = await runCatalogSync(engine, {
          seasonPaths: [season],
          maxEventsToPull: 0,
          triggerSource: "operator-backfill",
        });
        catalogued += 1;
        console.log(
          `[backfill] catalogued ${season}: ${r.eventsUpserted} events, ` +
            `${r.divisionsUpserted} divisions (${chain.requestCount()} requests so far)`,
        );
      } catch (error) {
        console.log(`[backfill] ${season} failed: ${(error as Error).message}`);
      }
    }

    await enrichEventMetadata(repo);
    const events = await repo.listEvents();
    console.log(
      skipCatalogue
        ? `[backfill] catalogue skipped; ${events.length} events already known`
        : `[backfill] catalogue complete: ${events.length} events across ${catalogued} seasons`,
    );

    // Phase two: results, in market order, until the clock runs out.
    let rounds = 0;
    let rows = 0;
    while (Date.now() < deadline) {
      const r = await runBackfill(engine, {
        maxEvents: 3,
        catalogueSeasons: false,
        triggerSource: "operator-backfill",
      });
      rounds += 1;
      rows += r.rowsUpserted;
      console.log(
        `[backfill] round ${rounds}: +${r.rowsUpserted} rows ` +
          `(${r.eventsCompleted.join(", ") || "none"}) · ` +
          `${r.eventsSkipped.length} done · ${r.eventsFailed.length} failed · ` +
          `${chain.requestCount()} requests`,
      );
      // Nothing completed and nothing failed means every event is checkpointed.
      if (r.eventsCompleted.length === 0 && r.eventsFailed.length === 0) {
        console.log("[backfill] every known event is pulled");
        break;
      }
      // Progress against the whole job, so an interrupted run tells you where
      // it got to rather than only what it just did.
      if (rounds % 5 === 0) {
        const done = (await repo.listSyncStates()).filter((x) => x.lastSeenHash).length;
        console.log(`[backfill] progress: ${done} events checkpointed of ${events.length}`);
      }
    }

    const [finalEvents, runs] = await Promise.all([repo.listEvents(), repo.listRuns(5)]);
    console.log(
      `[backfill] finished: ${finalEvents.length} events, ${rows} rows this session, ` +
        `${chain.requestCount()} requests, last run ${runs[0]?.status}`,
    );

    expect(finalEvents.length).toBeGreaterThan(0);
  }, MINUTES * 60_000 + 120_000);
});
