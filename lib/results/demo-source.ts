/**
 * `DemoDataSource` — the full implementation over generated demo data.
 *
 * Server-only. Reads the shards written by `scripts/generate-demo-data.ts`
 * lazily and caches them per event, so a Cardiff ranking page never pays to
 * parse the London shard. The generated files are gitignored and rebuilt from
 * a fixed seed, so this is reproducible without being committed.
 */

import "server-only";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { DivisionCode, EventStatus } from "./types";
import { STATION_IDS, PROFILE_BY_CODE, type StationId, type AgeGroup } from "./model";
import { buildDistribution } from "./percentiles";
import type {
  ResultsDataSource, EventSummary, RaceEventDetail, RankingRow,
  AthleteProfile, StartListWave, RecordEntry, ResultDetail,
} from "./source";

const DATA_DIR = join(process.cwd(), "data", "results-demo");
const PAGE_SIZE = 100;

type RawResult = {
  id: string; eventSlug: string; division: DivisionCode;
  athleteSlug: string; athleteName: string; countryIso: string; ageGroup: AgeGroup;
  rank: number; ageGroupRank: number; finishSeconds: number;
  runs: number[]; stations: Record<StationId, number>; roxzoneSeconds: number;
  status: "finished" | "dnf" | "entered"; partnerNames?: string[];
};

type EventShard = { slug: string; results: Record<string, RawResult[]> };

function readJson<T>(file: string, fallback: T): T {
  const path = join(DATA_DIR, file);
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
  return rows.filter((r) => r.status === "finished");
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
      if (!row || row.status !== "finished") continue;
      const field = rows.filter((r) => r.status === "finished");
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
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return { athletes: [], events: [] };

    const events = allEvents()
      .filter((e) =>
        e.name.toLowerCase().includes(needle) || e.city.toLowerCase().includes(needle))
      .slice(0, 8)
      .map((e) => ({ slug: e.slug, name: e.name, city: e.city, year: e.year, status: e.status }));

    const athletes = allAthletes()
      .filter((a) => a.name.toLowerCase().includes(needle))
      .sort((a, b) => b.races.length - a.races.length)
      .slice(0, 12)
      .map((a) => ({
        slug: a.slug, name: a.name, countryIso: a.countryIso, raceCount: a.races.length,
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
    status: r.status === "dnf" ? "dnf" : "finished",
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
