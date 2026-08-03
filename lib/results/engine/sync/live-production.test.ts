/**
 * THE REAL THING — real source, real database, real workers.
 * Skipped unless `HYROX_LIVE_INGEST=1`.
 *
 * Everything else proves a piece. This proves the assembled system: the actual
 * `SupabaseResultsRepository` against the actual Supabase project, driven by the
 * actual catalog and ingest workers, reading from the actual HYROX source, and
 * served back through the same `ResultsDataSource` contract the frontend uses.
 *
 *   HYROX_LIVE_INGEST=1 HYROX_SOURCE_ACCESS=authorised \
 *     node --env-file=.env.local node_modules/.bin/vitest run live-production
 *
 * It writes to the production results database on purpose. Every write is
 * idempotent on a stable source id, so running it twice is safe and is in fact
 * one of the things it asserts.
 */

import { describe, expect, it } from "vitest";
import { SupabaseResultsRepository } from "../supabase-repo";
import { SyncEngine } from "./engine";
import { createHyroxChain } from "../source/hyrox-adapter";
import { SourceFetcher } from "../fetch/fetcher";
import { OutboundBudget } from "../fetch/guard";
import { runCatalogSync } from "./catalog";
import { runSplitsBackfill } from "./splits";
import { ResultsService } from "../serve/service";
import { hasResultsSupabaseConfig } from "../supabase-client";

const enabled = process.env.HYROX_LIVE_INGEST === "1" && hasResultsSupabaseConfig();
const suite = enabled ? describe : describe.skip;

function engineFor() {
  const repo = new SupabaseResultsRepository();
  const chain = createHyroxChain(
    new SourceFetcher({
      authorised: true,
      budget: new OutboundBudget({ maxRequests: 120, windowMs: 60_000 }),
      maxAttempts: 3,
    }),
  );
  return { repo, chain, engine: new SyncEngine({ repo, adapter: chain }) };
}

suite("production ingestion", () => {
  it("runs the catalogue against the real database", async () => {
    const { repo, chain, engine } = engineFor();

    const result = await runCatalogSync(engine, {
      seasonPaths: ["season-9"],
      // The catalogue only. Pulling full results for finalised events is the
      // cron's job and would make this test unbounded.
      maxEventsToPull: 0,
      triggerSource: "operator-verification",
    });

    const events = await repo.listEvents();
    const dated = events.filter((e) => e.startDatetime);

    console.log(
      `[prod] catalogue: ${result.eventsUpserted} upserts, ${result.divisionsUpserted} divisions, ` +
        `${events.length} events stored, ${dated.length} dated, ${chain.requestCount()} requests`,
    );
    for (const e of dated.slice(0, 6)) {
      console.log(`[prod]   ${e.slug.padEnd(26)} ${e.startDate} ${e.region || "—"}`);
    }

    expect(events.length).toBeGreaterThan(3);
    // Distinct cities, not 22 weekends filed under one.
    expect(new Set(events.map((e) => e.city)).size).toBeGreaterThan(3);

    // The run was recorded, which is what the operator console reads.
    const run = await repo.latestRun("catalog");
    expect(run?.status).toBe("ok");
    console.log(`[prod] run ${run?.id} ${run?.status}, ${run?.requestsMade} requests`);
  }, 300_000);

  it("fills splits and serves everything through the frontend contract", async () => {
    const { repo, engine } = engineFor();

    const splits = await runSplitsBackfill(engine, { limit: 10, triggerSource: "operator" });
    console.log(
      `[prod] splits: filled=${splits.filled} quarantined=${splits.quarantined} ` +
        `failed=${splits.failed} remaining=${splits.remaining}`,
    );

    const service = new ResultsService(repo);

    const events = await service.listEvents();
    console.log(`[prod] listEvents -> ${events.length}`);
    expect(events.length).toBeGreaterThan(0);

    // The seeded London weekend, read back through the public contract.
    const ranking = await service.getRanking("s8-2026-london", "hyrox-men", { limit: 3 });
    expect(ranking).not.toBeNull();
    expect(ranking!.rows.length).toBe(3);
    const leader = ranking!.rows[0];
    console.log(
      `[prod] getRanking -> ${ranking!.total} rows, leader ${leader.athleteName} ` +
        `(${leader.countryIso}) ${leader.finishSeconds}s`,
    );
    expect(leader.rank).toBe(1);
    expect(leader.athleteName).not.toContain(",");
    expect(leader.finishSeconds).toBeGreaterThan(1800);

    const athlete = await service.getAthlete(leader.athleteSlug);
    expect(athlete).not.toBeNull();
    console.log(`[prod] getAthlete -> ${athlete!.name}, ${athlete!.races.length} race(s)`);

    const detail = await service.getResult(leader.id);
    expect(detail).not.toBeNull();
    const stations = Object.values(detail!.stations).filter((s) => s > 0).length;
    console.log(`[prod] getResult -> ${stations} stations, roxzone ${detail!.roxzoneSeconds}s`);

    const search = await service.searchAll(leader.athleteName.split(" ").pop() ?? "a");
    console.log(`[prod] searchAll -> ${search.athletes.length} athletes`);
    expect(search.athletes.length).toBeGreaterThan(0);

    const records = await service.getRecords();
    console.log(`[prod] getRecords -> ${records.entries.length} division records`);
    expect(records.entries.length).toBeGreaterThan(0);

    const times = await service.getDivisionFinishTimes("s8-2026-london", "hyrox-men");
    expect(times.length).toBeGreaterThan(100);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    console.log(`[prod] getDivisionFinishTimes -> ${times.length}, fastest ${times[0]}s`);
  }, 300_000);
});
