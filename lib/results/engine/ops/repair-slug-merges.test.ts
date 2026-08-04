/**
 * OPERATOR TOOL — re-attach results that were written onto the wrong person.
 * Skipped unless `HYROX_REPAIR_MERGES=1`.
 *
 *   HYROX_REPAIR_MERGES=1 HYROX_SOURCE_ACCESS=authorised \
 *     npx vitest run repair-slug-merges
 *
 * ## What went wrong
 *
 * `findTakenSlugs` asked the database about a base slug and nine numbered
 * variants. The allocator counted on to `-500`. So the eleventh person to share
 * a name was handed `-11` — a slug nobody had checked for — and the athlete
 * upsert declares `ON CONFLICT (slug) DO UPDATE`, which quietly wrote them over
 * whoever already held it. The new arrival inherited every result attached to
 * that row.
 *
 * Names that folded to an empty base made it far worse: before `athleteSlug`
 * learned about non-Latin alphabets, every Chinese, Japanese, Korean, Cyrillic,
 * Greek and Arabic name slugged to `""`, so they all queued for one shared
 * namespace and blew through the window on the first large board. One row ended
 * up holding 212 results from 33 different events.
 *
 * Measured before this ran: **32,062 results across 1,858 divisions and 216
 * events** were attached to a person who did not run them.
 *
 * ## Why a re-pull is the repair
 *
 * The link is `results_results.athlete_id`. Nothing on the result records which
 * source athlete it came from — that lives on the athlete row, and the athlete
 * row now holds whichever person overwrote it last. So the correct owner is not
 * recoverable from the database; it has to come back from the source.
 *
 * Re-pulling does exactly that. Every result is upserted on its own
 * `source_result_id`, so a row that was pointed at the wrong athlete is pointed
 * back at the right one, and with the allocator fixed the right one now gets a
 * slug that cannot collide. Idempotent, checkpointed per division, safe to stop
 * and resume.
 *
 * ## Why it re-pulls divisions that already have a checkpoint
 *
 * `repull-divisions` deliberately skips those — its job is filling gaps. This
 * one's job is correcting rows that were stored confidently and wrongly, so a
 * checkpoint is not evidence of anything. The work list comes from the damage
 * instead: only the divisions actually holding a mis-attributed result.
 */

import { describe, expect, it } from "vitest";
import { SupabaseResultsRepository } from "../supabase-repo";
import { SyncEngine } from "../sync/engine";
import { createHyroxChain } from "../source/hyrox-adapter";
import { SourceFetcher } from "../fetch/fetcher";
import { OutboundBudget } from "../fetch/guard";
import { backfillEventTotals } from "../sync/event-totals";
import { recomputeRecords } from "../sync/records";
import { hasResultsSupabaseConfig, resultsSupabase } from "../supabase-client";

const enabled = process.env.HYROX_REPAIR_MERGES === "1" && hasResultsSupabaseConfig();
const suite = enabled ? describe : describe.skip;
const MINUTES = Number(process.env.HYROX_REPAIR_MINUTES ?? 300);
const RATE = Number(process.env.HYROX_REPAIR_RATE ?? 45);

suite("repair slug-collision merges", () => {
  it("re-pulls every division holding a mis-attributed result", async () => {
    const repo = new SupabaseResultsRepository();
    const db = resultsSupabase();

    // Which divisions to fix, straight from the damage.
    //
    // A slug ending past the checked window (`-11` and beyond) could only have
    // been allocated by the old counting allocator, and a row carrying several
    // races under such a slug is a merge rather than a coincidence. That is the
    // signal; the query returns the divisions those results sit in.
    const { data, error } = await db.rpc("results_divisions_needing_slug_repair");
    if (error) throw new Error(`work list failed: ${error.message}`);

    const todo = (data ?? []) as Array<{
      division_id: string;
      division_key: string;
      source_division_id: string | null;
      event_id: string;
      affected: number;
    }>;

    console.log(`[repair] ${todo.length} divisions hold mis-attributed results`);

    const [events, divisions] = await Promise.all([repo.listEvents(), repo.listAllDivisions()]);
    const eventById = new Map(events.map((e) => [e.id, e]));
    const divisionById = new Map(divisions.map((d) => [d.id, d]));

    const chain = createHyroxChain(
      new SourceFetcher({
        authorised: true,
        budget: new OutboundBudget({ maxRequests: RATE, windowMs: 60_000 }),
        maxAttempts: 3,
      }),
    );
    const engine = new SyncEngine({ repo, adapter: chain });
    const deadline = Date.now() + MINUTES * 60_000;

    let done = 0;
    let rows = 0;
    let failed = 0;

    // Worst first: the divisions holding the most wrong rows are the ones a
    // visitor is most likely to land on, and a run that runs out of time should
    // have spent it where it counted.
    for (const item of [...todo].sort((a, b) => b.affected - a.affected)) {
      if (Date.now() > deadline) {
        console.log("[repair] out of time — rerun to continue");
        break;
      }
      const event = eventById.get(item.event_id);
      const division = divisionById.get(item.division_id);
      const sourceDivisionId = item.source_division_id ?? division?.sourceDivisionId;
      if (!event || !division || !sourceDivisionId) continue;

      const seasonPath =
        event.sourceSeasonPath ?? `season-${/s(\d+)/.exec(event.season)?.[1] ?? "9"}`;

      try {
        const outcome = await engine.syncDivision({
          seasonPath,
          event,
          division,
          sourceDivisionId,
        });
        rows += outcome.inserted + outcome.updated;
        done += 1;
      } catch (error) {
        failed += 1;
        console.log(
          `[repair] ${event.slug}/${division.divisionKey} failed: ` +
            `${(error as Error).message.slice(0, 70)}`,
        );
      }

      if (done > 0 && done % 25 === 0) {
        console.log(
          `[repair] ${done}/${todo.length} divisions · ${rows} rows rewritten · ` +
            `${failed} failed · ${chain.requestCount()} requests`,
        );
      }
    }

    // Race counts were computed from the merged rows, so they are wrong wherever
    // a merge was — and search ranks on them.
    const { error: countError } = await db.rpc("results_recount_athlete_races");
    if (countError) console.log(`[repair] recount failed: ${countError.message}`);

    await backfillEventTotals(repo);
    await recomputeRecords(repo);

    console.log(
      `[repair] done: ${done}/${todo.length} divisions · ${rows} rows rewritten · ` +
        `${failed} failed · ${chain.requestCount()} requests`,
    );
    expect(done + failed).toBeGreaterThan(0);
  }, MINUTES * 60_000 + 120_000);
});
