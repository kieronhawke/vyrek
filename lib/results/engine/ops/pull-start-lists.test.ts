/**
 * OPERATOR TOOL — pull start lists for races that have not happened.
 * Skipped unless `HYROX_START_LISTS=1`.
 *
 *   HYROX_START_LISTS=1 HYROX_SOURCE_ACCESS=authorised \
 *     npx vitest run pull-start-lists
 *
 * The same job the cron should run in entry week. Kept as an operator tool too
 * because a start list is the one thing on the site with a deadline: it is
 * worth nothing the day after the race and everything the day before.
 */

import { describe, expect, it } from "vitest";
import { SupabaseResultsRepository } from "../supabase-repo";
import { SyncEngine } from "../sync/engine";
import { createHyroxChain } from "../source/hyrox-adapter";
import { SourceFetcher } from "../fetch/fetcher";
import { OutboundBudget } from "../fetch/guard";
import { syncStartLists } from "../sync/start-lists";
import { backfillEventTotals } from "../sync/event-totals";
import { hasResultsSupabaseConfig } from "../supabase-client";

const enabled = process.env.HYROX_START_LISTS === "1" && hasResultsSupabaseConfig();
const suite = enabled ? describe : describe.skip;
const MINUTES = Number(process.env.HYROX_START_LIST_MINUTES ?? 30);
const RATE = Number(process.env.HYROX_START_LIST_RATE ?? 60);
const say = (m: string) => process.stderr.write(`[starters] ${m}\n`);

suite("pull start lists", () => {
  it("fills the start list for every upcoming race", async () => {
    const repo = new SupabaseResultsRepository();
    const chain = createHyroxChain(
      new SourceFetcher({
        authorised: true,
        budget: new OutboundBudget({ maxRequests: RATE, windowMs: 60_000 }),
        maxAttempts: 3,
      }),
    );
    const engine = new SyncEngine({ repo, adapter: chain });

    const r = await syncStartLists(engine, {
      repo,
      deadline: Date.now() + MINUTES * 60_000,
      withinDays: Number(process.env.HYROX_START_LIST_DAYS ?? 14),
      triggerSource: "operator-start-lists",
    });

    say(
      `${r.eventsChecked} events · ${r.divisionsPulled} divisions with entries · ` +
        `${r.divisionsEmpty} empty · ${r.entrantsUpserted} entrants · ` +
        `${r.failures.length} failed · ${chain.requestCount()} requests`,
    );
    for (const f of r.failures.slice(0, 5)) say(`  ${f.event}/${f.division}: ${f.error.slice(0, 70)}`);

    await backfillEventTotals(repo);
    expect(r.eventsChecked).toBeGreaterThan(0);
  }, MINUTES * 60_000 + 120_000);
});
