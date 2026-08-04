/**
 * `DemoDataSource` — the full implementation over generated demo data.
 *
 * Server-only. Reads the shards written by `scripts/generate-demo-data.ts`
 * lazily and caches them per event, so a Cardiff ranking page never pays to
 * parse the London shard. The generated files are gitignored and rebuilt from
 * a fixed seed, so this is reproducible without being committed.
 */

import { isFinish, normaliseStatus } from "./status";
import "server-only";
import type { DivisionCode, EventStatus } from "./types";
import { STATION_IDS, PROFILE_BY_CODE, type StationId, type AgeGroup } from "./model";
import { buildDistribution } from "./percentiles";
import { rankBy } from "./search";
import type {
  ResultsDataSource, EventSummary, RaceEventDetail, RankingRow,
  AthleteProfile, StartListWave, RecordEntry, ResultDetail,
} from "./source";

/**
 * Which dataset this source reads.
 *
 * `demo` → generated fixtures. `live` → whatever `scripts/import-results.ts`
 * wrote from real CSVs. Same shape either way, which is the point: swapping to
 * real data is a data-loading job, not a rewrite.
 */
const DATA_DIR = [
  process.cwd(),
  "data",
  process.env.NEXT_PUBLIC_DATA_MODE === "live" ? "results-live" : "results-demo",
].join("/");
const PAGE_SIZE = 100;

type RawResult = {
  id: string; eventSlug: string; division: DivisionCode;
  athleteSlug: string; athleteName: string; countryIso: string; ageGroup: AgeGroup;
  rank: number; ageGroupRank: number; finishSeconds: number;
  runs: number[]; stations: Record<StationId, number>; roxzoneSeconds: number;
  status: string; penaltySeconds?: number; partnerNames?: string[];
};

type EventShard = { slug: string; results: Record<string, RawResult[]> };

/**
 * `node:fs` is required lazily rather than imported.
 *
 * `server-only` stops a *direct* client import, but it does not help when a
 * client component reaches this module through a chain of server modules —
 * which is what happened: the admin results-engine console imports the engine,
 * the engine imports this source for its fallback, and Turbopack then tried to
 * put `node:fs` in a browser chunk and failed the whole build.
 *
 * A lazy require keeps the specifier out of the module graph, so the file is
 * safe to appear anywhere while still only ever reading from disk on a server.
 */
function nodeFs() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("node:fs") as typeof import("node:fs");
}

function readJson<T>(file: string, fallback: T): T {
  const { existsSync, readFileSync } = nodeFs();
  const path = `${DATA_DIR}/${file}`;
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

/* ─── Lazy caches ────────────────────────────────────────────────── */

let eventsCache: RaceEventDetail[] | null = null;
let athletesCache: AthleteProfile[] | null = null;
let athleteIndex: Map<string, AthleteProfile> | null = null;
const shardCache = new Map<string, EventShard | null>();

function allEvents(): RaceEventDetail[] {
  eventsCache ??= readJson<RaceEventDetail[]>("events.json", []);
  return eventsCache;
}

function allAthletes(): AthleteProfile[] {
  if (!athletesCache) {
    type RawAthlete = Omit<AthleteProfile, "pbSeconds" | "divisionsRaced" | "seasonsActive"> & {
      raceCount: number;
    };
    const raw = readJson<RawAthlete[]>("athletes.json", []);
    athletesCache = raw.map((a) => {
      const finished = a.races.filter((r) => r.finishSeconds > 0);
      return {
        ...a,
        pbSeconds: finished.length ? Math.min(...finished.map((r) => r.finishSeconds)) : null,
        divisionsRaced: [...new Set(a.races.map((r) => r.division))],
        seasonsActive: [...new Set(a.races.map((r) => r.season))].sort(),
      };
    });
    athleteIndex = new Map(athletesCache.map((a) => [a.slug, a]));
  }
  return athletesCache;
}

function shard(eventSlug: string): EventShard | null {
  if (!shardCache.has(eventSlug)) {
    shardCache.set(eventSlug, readJson<EventShard | null>(`event-${eventSlug}.json`, null));
  }
  return shardCache.get(eventSlug) ?? null;
}

function finishersOf(eventSlug: string, division: string): RawResult[] {
  const rows = shard(eventSlug)?.results[division] ?? [];
  return rows.filter((r) => isFinish(r.status, r.finishSeconds));
}

/* ─── Implementation ─────────────────────────────────────────────── */

export const demoDataSource: ResultsDataSource = {
  async listEvents(filter) {
    let events = allEvents().map(stripDivisions);
    if (filter?.season) events = events.filter((e) => e.season === filter.season);
    if (filter?.status) events = events.filter((e) => e.status === filter.status);
    if (filter?.region) {
      const needle = filter.region.toLowerCase();
      events = events.filter(
        (e) => e.region.toLowerCase() === needle || e.countryIso === needle,
      );
    }
    return events.sort((a, b) => b.startDate.localeCompare(a.startDate));
  },

  async getEvent(slug) {
    return allEvents().find((e) => e.slug === slug) ?? null;
  },

  async getRanking(eventSlug, division, opts) {
    const event = allEvents().find((e) => e.slug === eventSlug);
    if (!event) return null;
    const divisionMeta = event.divisions.find((d) => d.divisionCode === division);
    if (!divisionMeta) return null;

    let rows = finishersOf(eventSlug, division);
    const fieldSize = rows.length;
    const leaderTimeSeconds = rows[0]?.finishSeconds ?? 0;

    if (opts?.ageGroup) rows = rows.filter((r) => r.ageGroup === opts.ageGroup);
    if (opts?.q) {
      const needle = opts.q.toLowerCase();
      rows = rows.filter((r) => r.athleteName.toLowerCase().includes(needle));
    }

    const total = rows.length;
    const start = opts?.cursor ? Number(opts.cursor) || 0 : 0;
    const limit = opts?.limit ?? PAGE_SIZE;
    const slice = rows.slice(start, start + limit);
    const nextCursor = start + limit < total ? String(start + limit) : null;

    return {
      eventSlug,
      eventName: event.name,
      division: division as DivisionCode,
      divisionLabel: divisionMeta.label,
      rows: slice.map(toRankingRow(leaderTimeSeconds)),
      total,
      fieldSize,
      leaderTimeSeconds,
      nextCursor,
    };
  },

  async getResult(id) {
    // Result ids carry their event slug as a prefix, so we can go straight to
    // the right shard instead of scanning fourteen of them.
    const eventSlug = allEvents().find((e) => id.startsWith(`${e.slug}-`))?.slug;
    if (!eventSlug) return null;
    const data = shard(eventSlug);
    const event = allEvents().find((e) => e.slug === eventSlug);
    if (!data || !event) return null;

    for (const [division, rows] of Object.entries(data.results)) {
      const row = rows.find((r) => r.id === id);
      if (!row) continue;

      /*
       * TWO DIFFERENT QUESTIONS, AND THEY WERE BEING ANSWERED WITH ONE FILTER.
       *
       * This skipped any row that was not a clean finish, so looking up a DNF
       * or a disqualified entry returned nothing and the page 404'd. To the
       * athlete that reads as the site having lost their race, which is worse
       * than telling them plainly what happened — and they are exactly the
       * person most likely to come looking.
       *
       * So the row is returned whatever its status, and `ResultStatusNotice`
       * says what it was. What must stay filtered is the *field*: averages and
       * percentiles are only meaningful over athletes who actually finished,
       * and a DNF's zeroes would drag every division average down.
       */
      const field = rows.filter((r) => isFinish(r.status, r.finishSeconds));
      return {
        ...row,
        eventName: event.name,
        eventCity: event.city,
        eventSlug,
        divisionLabel: PROFILE_BY_CODE[division]?.label ?? division,
        fieldSize: field.length,
        leaderTimeSeconds: field[0]?.finishSeconds ?? 0,
        divisionAverage: averageOf(field),
      } as ResultDetail;
    }
    return null;
  },

  async getAthlete(slug) {
    allAthletes();
    return athleteIndex?.get(slug) ?? null;
  },

  async getStarters(eventSlug) {
    const event = allEvents().find((e) => e.slug === eventSlug);
    const data = shard(eventSlug);
    if (!event || !data) return null;

    const waves: StartListWave[] = [];
    for (const division of event.divisions) {
      const entrants = data.results[division.divisionCode] ?? [];
      let cursor = 0;
      for (const wave of division.waves) {
        waves.push({
          divisionCode: division.divisionCode,
          divisionLabel: division.label,
          wave: wave.wave,
          time: wave.time,
          athletes: entrants.slice(cursor, cursor + wave.athletes).map((a) => ({
            slug: a.athleteSlug, name: a.athleteName,
            countryIso: a.countryIso, ageGroup: a.ageGroup,
          })),
        });
        cursor += wave.athletes;
      }
    }
    return { eventSlug, eventName: event.name, waves };
  },

  async searchAll(q) {
    const query = q.trim();
    if (query.length < 2) return { athletes: [], events: [] };

    // Relevance ranking rather than substring order: an exact name beats a
    // prefix beats a fuzzy match, and race count only breaks ties. See
    // lib/results/search.ts.
    const events = rankBy(
      allEvents().map((e) => ({
        // City and year are searchable too — "london 2026" is a real query.
        text: `${e.name} ${e.city} ${e.year} ${e.season}`,
        weight: e.year,
        event: e,
      })),
      query,
      8,
    ).map(({ event }) => ({
      slug: event.slug, name: event.name, city: event.city,
      year: event.year, status: event.status,
    }));

    const athletes = rankBy(
      allAthletes().map((a) => ({ text: a.name, weight: a.races.length, athlete: a })),
      query,
      12,
    ).map(({ athlete }) => ({
      slug: athlete.slug, name: athlete.name,
      countryIso: athlete.countryIso, raceCount: athlete.races.length,
    }));

    return { athletes, events };
  },

  async getRecords() {
    const entries: RecordEntry[] = [];
    for (const event of allEvents()) {
      if (event.status === "upcoming") continue;
      for (const division of event.divisions) {
        if (!division.leaderTimeSeconds || !division.leaderAthleteSlug) continue;
        entries.push({
          divisionCode: division.divisionCode,
          divisionLabel: division.label,
          athleteSlug: division.leaderAthleteSlug,
          athleteName: division.leaderAthleteName ?? "",
          countryIso: "gb",
          finishSeconds: division.leaderTimeSeconds,
          eventSlug: event.slug,
          eventName: event.name,
          date: event.startDate,
        });
      }
    }
    // Best time per division across every event.
    const best = new Map<string, RecordEntry>();
    for (const e of entries) {
      const held = best.get(e.divisionCode);
      if (!held || e.finishSeconds < held.finishSeconds) best.set(e.divisionCode, e);
    }
    return {
      scope: "all-time",
      entries: [...best.values()].sort((a, b) => a.finishSeconds - b.finishSeconds),
    };
  },

  async getDivisionFinishTimes(eventSlug, division) {
    // Straight off the shard, no object allocation.
    return finishersOf(eventSlug, division)
      .map((r) => r.finishSeconds)
      .sort((a, b) => a - b);
  },

  /**
   * The names worth having in the browser before anybody types.
   *
   * The live source precomputes this into a table; here it is cheap enough to
   * rank on demand. Ordered the same way for the same reason — someone typing
   * three letters wants the person who appears most often, not the first
   * alphabetically.
   */
  async listPopularAthletes(limit = 5000) {
    return [...allAthletes()]
      .sort((a, b) => b.races.length - a.races.length || a.name.localeCompare(b.name))
      .slice(0, limit)
      .map((a) => ({
        slug: a.slug,
        name: a.name,
        countryIso: a.countryIso,
        raceCount: a.races.length,
      }));
  },

  async getStationDistribution(station, division) {
    const times: number[] = [];
    for (const event of allEvents()) {
      if (event.status === "upcoming") continue;
      for (const row of finishersOf(event.slug, division)) {
        const t = row.stations?.[station];
        if (t) times.push(t);
      }
    }
    return buildDistribution(times);
  },
};

/* ─── Helpers ────────────────────────────────────────────────────── */

/** Drops the division list — `listEvents` returns summaries, not full events. */
function stripDivisions(event: RaceEventDetail): EventSummary {
  const { divisions, ...summary } = event;
  void divisions;
  return summary;
}

function toRankingRow(leaderTime: number) {
  return (r: RawResult): RankingRow => ({
    id: r.id,
    rank: r.rank,
    ageGroupRank: r.ageGroupRank,
    athleteSlug: r.athleteSlug,
    athleteName: r.athleteName,
    countryIso: r.countryIso,
    ageGroup: r.ageGroup,
    finishSeconds: r.finishSeconds,
    gapToLeaderSeconds: r.finishSeconds - leaderTime,
    /*
     * ⚠️ ALLOWLIST, NOT A DENYLIST — see `normaliseStatus`.
     *
     * This was `r.status === "dnf" ? "dnf" : "finished"`, which mapped
     * *anything that is not literally "dnf"* onto a valid finish: "dsq",
     * "dns", a capitalised "DNF", or a typo in a CSV column. This source also
     * backs `scripts/import-results.ts`, so those are real results, and a
     * disqualified athlete promoted to "finished" is eligible for the record
     * book.
     */
    status: normaliseStatus(r.status),
    penaltySeconds: r.penaltySeconds,
    partnerNames: r.partnerNames,
  });
}

function averageOf(rows: RawResult[]) {
  const n = rows.length || 1;
  const runs = Array.from({ length: 8 }, (_, i) =>
    Math.round(rows.reduce((sum, r) => sum + (r.runs[i] ?? 0), 0) / n));
  const stations = {} as Record<StationId, number>;
  for (const id of STATION_IDS) {
    stations[id] = Math.round(rows.reduce((sum, r) => sum + (r.stations?.[id] ?? 0), 0) / n);
  }
  return {
    runs,
    stations,
    roxzone: Math.round(rows.reduce((sum, r) => sum + r.roxzoneSeconds, 0) / n),
    finish: Math.round(rows.reduce((sum, r) => sum + r.finishSeconds, 0) / n),
  };
}

/** Status labels as the brief writes them: UPCOMING, LIVE, FINAL. */
export const STATUS_LABEL: Record<EventStatus, string> = {
  upcoming: "UPCOMING",
  live: "LIVE",
  finished: "FINAL",
};
