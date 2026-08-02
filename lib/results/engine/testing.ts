/**
 * Test harness for the engine.
 *
 * Assembles the real engine — real normaliser, real validator, real sentinel,
 * real repository semantics — with fixtures where the network would be. The
 * only thing swapped is where bytes come from, which is what makes these tests
 * evidence rather than decoration.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MemoryResultsRepository } from "./memory-repo";
import { ReplayAdapter, type ReplayFixtures } from "./source/replay-adapter";
import { MemoryPublisher } from "./sync/publisher";
import { SyncEngine } from "./sync/engine";
import type { EngineDivision, EngineEvent } from "./types";
import type { SourceAdapter } from "./source/adapter";

export function fixture(name: string): string {
  return readFileSync(join(process.cwd(), "tests", "fixtures", "hyrox", name), "utf8");
}

export const SEASON = "season-9";
export const DIVISION_CODE = "H_LR3MS4JI1738";

export function defaultFixtures(overrides: Partial<ReplayFixtures> = {}): ReplayFixtures {
  return {
    seasonIndex: { [SEASON]: fixture("season-index.html") },
    divisions: { [DIVISION_CODE]: [fixture("list-rows.html")] },
    startLists: {},
    ...overrides,
  };
}

export type Harness = {
  repo: MemoryResultsRepository;
  adapter: ReplayAdapter;
  publisher: MemoryPublisher;
  engine: SyncEngine;
  event: EngineEvent;
  division: EngineDivision;
  now: Date;
  setNow(date: Date): void;
};

/**
 * A live-ish event with one division, ready to sync.
 *
 * Dated deliberately in Sydney's timezone in some tests, so the arming maths is
 * exercised against a real offset rather than against UTC pretending to be one.
 */
export async function makeHarness(
  opts: {
    fixtures?: ReplayFixtures;
    adapter?: SourceAdapter;
    now?: Date;
    event?: Partial<EngineEvent>;
  } = {},
): Promise<Harness> {
  let now = opts.now ?? new Date("2026-08-03T10:00:00.000Z");
  const repo = new MemoryResultsRepository({ clock: () => now });
  const adapter = (opts.adapter as ReplayAdapter) ?? new ReplayAdapter(opts.fixtures ?? defaultFixtures());
  const publisher = new MemoryPublisher();

  const engine = new SyncEngine({
    repo,
    adapter,
    publisher,
    now: () => now,
  });

  const event = await repo.upsertEvent({
    slug: "s9-2026-manchester",
    name: "HYROX Manchester 2026",
    city: "Manchester",
    country: "United Kingdom",
    countryIso: "GB",
    region: "UK",
    season: "s9",
    year: 2026,
    venue: "Manchester Central",
    status: "upcoming",
    startDatetime: "2026-08-03T09:00:00.000Z",
    endDatetime: "2026-08-03T18:00:00.000Z",
    tzOffsetMinutes: 60,
    startDate: "2026-08-03",
    endDate: "2026-08-03",
    athleteCount: 0,
    sourceEventId: "LR3MS4JI1738",
    sourceSeasonPath: SEASON,
    isDemo: false,
    lastSyncedAt: null,
    ...opts.event,
  });

  const division = await repo.upsertDivision({
    eventId: event.id,
    divisionKey: "open-men",
    displayName: "HYROX Men",
    entrantCount: 0,
    publishedEntrantCount: null,
    sourceDivisionId: DIVISION_CODE,
  });

  return {
    repo,
    adapter,
    publisher,
    engine,
    event,
    division,
    get now() {
      return now;
    },
    setNow(date: Date) {
      now = date;
    },
  };
}

export async function syncOnce(h: Harness, opts: { publish?: boolean; force?: boolean } = {}) {
  return h.engine.syncDivision({
    seasonPath: SEASON,
    event: h.event,
    division: h.division,
    sourceDivisionId: DIVISION_CODE,
    publish: opts.publish ?? false,
    force: opts.force ?? false,
  });
}
