/**
 * LIVE END-TO-END INGESTION — really contacts results.hyrox.com.
 *
 * Skipped unless `HYROX_LIVE_SMOKE=1`, so it never blocks a build.
 *
 * This is the test that proves the whole chain rather than any one link:
 * fetch → parse → normalise → validate → resolve athletes → store → serve
 * through the `ResultsDataSource` contract the frontend reads. Everything else
 * runs on fixtures, and fixtures only ever prove that we handle what we already
 * knew about.
 *
 *   HYROX_LIVE_SMOKE=1 HYROX_SOURCE_ACCESS=authorised npx vitest run live-ingest
 */

import { describe, expect, it } from "vitest";
import { MemoryResultsRepository } from "../memory-repo";
import { SyncEngine } from "./engine";
import { MemoryPublisher } from "./publisher";
import { createHyroxChain } from "../source/hyrox-adapter";
import { SourceFetcher } from "../fetch/fetcher";
import { OutboundBudget } from "../fetch/guard";
import { ResultsService } from "../serve/service";
import { recomputeDistributionsForEvent } from "./distributions";
import { runSplitsBackfill } from "./splits";

const LIVE = process.env.HYROX_LIVE_SMOKE === "1";
const suite = LIVE ? describe : describe.skip;

/** A real, finished season-8 division: HYROX, Friday. */
const SEASON = "season-8";
const DIVISION_CODE = "H_LR3MS4JI163A";

suite("live ingestion, end to end", () => {
  it("ingests a real division and serves it through the frontend contract", async () => {
    const repo = new MemoryResultsRepository();
    const chain = createHyroxChain(
      new SourceFetcher({
        authorised: true,
        budget: new OutboundBudget({ maxRequests: 10, windowMs: 60_000 }),
        maxAttempts: 2,
      }),
    );
    const engine = new SyncEngine({ repo, adapter: chain, publisher: new MemoryPublisher() });

    const event = await repo.upsertEvent({
      slug: "s8-2026-live-check",
      name: "HYROX Live Check",
      city: "Live Check",
      country: "United Kingdom",
      countryIso: "GB",
      region: "UK",
      season: "s8",
      year: 2026,
      status: "final",
      tzOffsetMinutes: 0,
      startDate: "2026-01-01",
      endDate: "2026-01-01",
      athleteCount: 0,
      sourceEventId: "LR3MS4JI163A",
      sourceSeasonPath: SEASON,
      isDemo: false,
      lastSyncedAt: null,
    });

    const division = await repo.upsertDivision({
      eventId: event.id,
      divisionKey: "open-men",
      displayName: "HYROX Men",
      entrantCount: 0,
      publishedEntrantCount: null,
      sourceDivisionId: `${DIVISION_CODE}#men`,
    });

    const outcome = await engine.syncDivision({
      seasonPath: SEASON,
      event,
      division,
      sourceDivisionId: `${DIVISION_CODE}#men`,
    });

    console.log(
      `[live] inserted=${outcome.inserted} quarantined=${outcome.quarantined} ` +
        `published=${outcome.completenessMismatch?.published ?? "matched"} ` +
        `requests=${chain.requestCount()}`,
    );

    expect(outcome.inserted).toBeGreaterThan(50);
    expect(outcome.shape.ok).toBe(true);

    // Real names, real nationalities, real times — not column headings.
    const service = new ResultsService(repo);
    const page = await service.getRanking("s8-2026-live-check", "hyrox-men", { limit: 5 });
    expect(page).not.toBeNull();
    expect(page!.rows.length).toBe(5);

    const leader = page!.rows[0];
    console.log(
      `[live] leader: ${leader.athleteName} (${leader.countryIso}) ` +
        `${leader.finishSeconds}s, age ${leader.ageGroup}`,
    );
    expect(leader.rank).toBe(1);
    expect(leader.athleteName).toMatch(/\w+ \w+/);
    expect(leader.athleteName).not.toContain(",");
    expect(leader.countryIso).toMatch(/^[A-Z]{3}$/);
    expect(leader.finishSeconds).toBeGreaterThan(1800);
    expect(page!.rows[1].gapToLeaderSeconds).toBeGreaterThan(0);

    // Athlete profiles resolve and carry the race.
    const athlete = await service.getAthlete(leader.athleteSlug);
    expect(athlete).not.toBeNull();
    expect(athlete!.races).toHaveLength(1);
    expect(athlete!.pbSeconds).toBe(leader.finishSeconds);

    // Distributions compute off real finish times.
    const { written } = await recomputeDistributionsForEvent(repo, event.id);
    expect(written).toBeGreaterThan(0);

    // Idempotency against the real source: a second sync writes nothing new.
    const again = await engine.syncDivision({
      seasonPath: SEASON,
      event,
      division,
      sourceDivisionId: `${DIVISION_CODE}#men`,
      force: true,
    });
    expect(again.inserted).toBe(0);
    console.log(`[live] re-sync: inserted=${again.inserted} unchanged=${again.unchanged}`);

    // Splits: the part the result page is actually for. Three athletes only —
    // this is one request each and the smoke test must stay cheap.
    const splits = await runSplitsBackfill(engine, { limit: 3, triggerSource: "smoke" });
    console.log(
      `[live] splits: attempted=${splits.attempted} filled=${splits.filled} ` +
        `quarantined=${splits.quarantined} failed=${splits.failed} remaining=${splits.remaining}`,
    );
    expect(splits.filled).toBe(3);
    expect(splits.quarantined).toBe(0);

    const detail = await service.getResult(page!.rows[0].id);
    expect(detail).not.toBeNull();
    expect(detail!.runs.filter((r) => r > 0)).toHaveLength(8);
    expect(Object.values(detail!.stations).filter((s) => s > 0)).toHaveLength(8);
    expect(detail!.roxzoneSeconds).toBeGreaterThan(0);

    // The splits must actually account for the race, not merely exist.
    const summed =
      detail!.runs.reduce((a, b) => a + b, 0) +
      Object.values(detail!.stations).reduce((a, b) => a + b, 0) +
      detail!.roxzoneSeconds;
    const drift = Math.abs(summed - detail!.finishSeconds) / detail!.finishSeconds;
    console.log(
      `[live] ${detail!.athleteName}: splits sum ${summed}s vs finish ${detail!.finishSeconds}s ` +
        `(${(drift * 100).toFixed(1)}% drift)`,
    );
    expect(drift).toBeLessThan(0.05);
  }, 240_000);
});
