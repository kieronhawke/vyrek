/**
 * OPERATOR TOOL — re-pull exactly the divisions that need it.
 * Skipped unless `HYROX_REPULL=1`.
 *
 *   HYROX_REPULL=1 HYROX_SOURCE_ACCESS=authorised npx vitest run repull-divisions
 *
 * The general backfill walks events in market-priority order and asks each
 * whether it needs work. That is right for its job and wrong for this one: when
 * the divisions still to do are scattered thinly across 223 events, it spends
 * most of its budget re-checking events that are already complete. Measured mid-
 * run, its cost climbed from 17 requests per division to 26 as the remainder
 * thinned, and it had begun revisiting events it had finished ten rounds
 * earlier.
 *
 * This takes the work list directly — every division with no checkpoint — and
 * pulls those and nothing else. Same engine, same idempotent upserts, same
 * per-division checkpointing, so it composes with the backfill rather than
 * replacing it and can be stopped at any point.
 */

import { describe, expect, it } from "vitest";
import { SupabaseResultsRepository } from "../supabase-repo";
import { SyncEngine } from "../sync/engine";
import { createHyroxChain } from "../source/hyrox-adapter";
import { SourceFetcher } from "../fetch/fetcher";
import { OutboundBudget } from "../fetch/guard";
import { backfillEventTotals } from "../sync/event-totals";
import { recomputeRecords } from "../sync/records";
import { hasResultsSupabaseConfig } from "../supabase-client";

const enabled = process.env.HYROX_REPULL === "1" && hasResultsSupabaseConfig();
const suite = enabled ? describe : describe.skip;
const MINUTES = Number(process.env.HYROX_REPULL_MINUTES ?? 300);
const RATE = Number(process.env.HYROX_REPULL_RATE ?? 45);

suite("targeted re-pull", () => {
  it("pulls every division missing a checkpoint", async () => {
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

    const [events, divisions] = await Promise.all([repo.listEvents(), repo.listAllDivisions()]);
    const eventById = new Map(events.map((e) => [e.id, e]));

    const todo = divisions.filter((d) => !d.lastSeenHash && d.sourceDivisionId);
    console.log(`[repull] ${todo.length} divisions to pull of ${divisions.length}`);

    let done = 0;
    let rows = 0;
    let failed = 0;

    for (const division of todo) {
      if (Date.now() > deadline) {
        console.log("[repull] out of time");
        break;
      }
      const event = eventById.get(division.eventId);
      if (!event) continue;
      const seasonPath =
        event.sourceSeasonPath ?? `season-${/s(\d+)/.exec(event.season)?.[1] ?? "9"}`;

      try {
        const outcome = await engine.syncDivision({
          seasonPath,
          event,
          division,
          sourceDivisionId: division.sourceDivisionId as string,
        });
        rows += outcome.inserted + outcome.updated;
        done += 1;
      } catch (error) {
        failed += 1;
        console.log(
          `[repull] ${event.slug}/${division.divisionKey} failed: ` +
            `${(error as Error).message.slice(0, 70)}`,
        );
      }

      if (done > 0 && done % 25 === 0) {
        console.log(
          `[repull] ${done}/${todo.length} divisions · +${rows} rows · ` +
            `${failed} failed · ${chain.requestCount()} requests`,
        );
      }
    }

    await backfillEventTotals(repo);
    await recomputeRecords(repo);

    console.log(
      `[repull] done: ${done}/${todo.length} divisions · +${rows} rows · ` +
        `${failed} failed · ${chain.requestCount()} requests`,
    );
    expect(done + failed).toBeGreaterThan(0);
  }, MINUTES * 60_000 + 120_000);
});
