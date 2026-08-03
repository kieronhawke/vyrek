/**
 * `ResultsService` — the frontend's `ResultsDataSource` contract, served from
 * our own database.
 *
 * This is the join between the two briefs. The frontend defined the contract
 * and built twenty route templates against it; this implements that same
 * contract over ingested data, so going live is a data-layer swap and not one
 * component changes (frontend brief §8, engine brief §7).
 *
 * It reads **only** from the repository. There is no code path from here to the
 * source, which is what makes "the site stays up when the source is down" a
 * property of the architecture rather than a promise in a document.
 */

import type {
  AthleteProfile,
  AthleteRace,
  EventDivisionSummary,
  EventSummary,
  RaceEventDetail,
  RankingPage,
  RankingRow,
  RecordEntry,
  RecordsBoard,
  ResultDetail,
  ResultsDataSource,
  SearchResults,
  StartList,
} from "../../source";
import type { AgeGroup, StationId } from "../../model";
import { STATION_IDS } from "../../model";
import type { DivisionCode, EventStatus } from "../../types";
import { buildDistribution, type Distribution } from "../../percentiles";
import type { ResultsRepository } from "../repository";
import type { EngineEvent, EngineEventStatus, EngineResult } from "../types";
import { toDivisionCode, toDivisionKey } from "./divisions";

const msToSeconds = (ms: number | null | undefined): number =>
  ms === null || ms === undefined ? 0 : Math.round(ms / 1000);

/**
 * `updates_paused` presents as live, because that is what it is: a live event
 * whose feed has stalled. The board carries its own paused notice, pushed over
 * realtime — demoting it to "finished" would be a lie with a podium on it.
 */
export function toPublicStatus(status: EngineEventStatus): EventStatus {
  if (status === "final") return "finished";
  if (status === "updates_paused") return "live";
  return status;
}

export class ResultsService implements ResultsDataSource {
  constructor(private repo: ResultsRepository) {}

  /* ── Events ───────────────────────────────────────────────────────── */

  async listEvents(filter?: {
    season?: string;
    region?: string;
    status?: EventStatus;
  }): Promise<EventSummary[]> {
    // "finished" covers final only; "live" must also surface paused events, so
    // status filtering happens after mapping rather than in the query.
    const events = await this.repo.listEvents({
      season: filter?.season,
      region: filter?.region,
    });
    return events
      .map((e) => this.toEventSummary(e))
      .filter((e) => (filter?.status ? e.status === filter.status : true));
  }

  async getEvent(slug: string): Promise<RaceEventDetail | null> {
    const event = await this.repo.getEventBySlug(slug);
    if (!event) return null;

    const divisions = await this.repo.listDivisions(event.id);
    const summaries: EventDivisionSummary[] = [];

    for (const division of divisions) {
      const code = toDivisionCode(division.divisionKey);
      if (!code) continue;

      const rows = await this.repo.listResultsForDivision(division.id);
      const finishers = rows
        .filter((r) => r.status === "finished" && r.finishTimeMs)
        .sort((a, b) => (a.finishTimeMs ?? 0) - (b.finishTimeMs ?? 0));
      const leader = finishers[0];
      const leaderAthlete = leader ? await this.repo.getAthleteById(leader.athleteId) : null;

      summaries.push({
        divisionCode: code,
        label: division.displayName,
        headline: code === "hyrox-men" || code === "hyrox-women",
        athleteCount: division.entrantCount || rows.length,
        finisherCount: finishers.length,
        leaderTimeSeconds: leader ? msToSeconds(leader.finishTimeMs) : undefined,
        leaderAthleteSlug: leaderAthlete?.slug,
        leaderAthleteName: leaderAthlete?.name,
        waves: wavesOf(rows),
      });
    }

    return { ...this.toEventSummary(event), divisions: summaries };
  }

  /* ── Rankings ─────────────────────────────────────────────────────── */

  async getRanking(
    eventSlug: string,
    division: string,
    opts?: { cursor?: string; ageGroup?: string; q?: string; limit?: number },
  ): Promise<RankingPage | null> {
    const divisionKey = toDivisionKey(division) ?? division;
    const event = await this.repo.getEventBySlug(eventSlug);
    if (!event) return null;

    const divisions = await this.repo.listDivisions(event.id);
    const target = divisions.find((d) => d.divisionKey === divisionKey);
    if (!target) return null;

    const page = await this.repo.getRanking({
      eventSlug,
      divisionKey,
      cursor: opts?.cursor,
      ageGroup: opts?.ageGroup,
      q: opts?.q,
      limit: opts?.limit,
    });

    // Gap to leader is derived here, never stored: it is a property of the
    // board at read time and goes stale the moment a faster finisher lands.
    const allRows = await this.repo.listResultsForDivision(target.id);
    const leaderMs = Math.min(
      ...allRows
        .filter((r) => r.status === "finished" && r.finishTimeMs)
        .map((r) => r.finishTimeMs as number),
    );
    const leaderTimeSeconds = Number.isFinite(leaderMs) ? msToSeconds(leaderMs) : 0;

    const rows: RankingRow[] = page.rows.map((r) => ({
      id: r.id,
      rank: r.rankOverall ?? 0,
      ageGroupRank: r.rankAgeGroup ?? 0,
      athleteSlug: r.athlete.slug,
      athleteName: r.athlete.isAnonymised ? "Withdrawn athlete" : r.athlete.name,
      countryIso: r.athlete.nationality ?? "",
      ageGroup: (r.ageGroup ?? "30-34") as AgeGroup,
      finishSeconds: msToSeconds(r.finishTimeMs),
      gapToLeaderSeconds: r.finishTimeMs
        ? msToSeconds(r.finishTimeMs) - leaderTimeSeconds
        : 0,
      status: r.status === "finished" ? "finished" : "dnf",
    }));

    return {
      eventSlug,
      eventName: event.name,
      division: (toDivisionCode(divisionKey) ?? division) as DivisionCode,
      divisionLabel: target.displayName,
      rows,
      total: page.total,
      fieldSize: allRows.length,
      leaderTimeSeconds,
      nextCursor: page.nextCursor,
    };
  }

  /* ── One race ─────────────────────────────────────────────────────── */

  async getResult(id: string): Promise<ResultDetail | null> {
    const result = await this.repo.getResultById(id);
    if (!result) return null;

    const [event, athlete] = await Promise.all([
      this.repo.getEventBySlug((await this.eventSlugFor(result.eventId)) ?? ""),
      this.repo.getAthleteById(result.athleteId),
    ]);
    if (!event || !athlete) return null;

    const divisions = await this.repo.listDivisions(event.id);
    const division = divisions.find((d) => d.id === result.divisionId);
    if (!division) return null;

    const siblings = await this.repo.listResultsForDivision(division.id);
    const finishers = siblings.filter((r) => r.status === "finished" && r.finishTimeMs);

    return {
      id: result.id,
      eventSlug: event.slug,
      eventName: event.name,
      eventCity: event.city,
      division: (toDivisionCode(division.divisionKey) ?? division.divisionKey) as DivisionCode,
      divisionLabel: division.displayName,
      athleteSlug: athlete.slug,
      athleteName: athlete.isAnonymised ? "Withdrawn athlete" : athlete.name,
      countryIso: athlete.nationality ?? "",
      ageGroup: (result.ageGroup ?? "30-34") as AgeGroup,
      rank: result.rankOverall ?? 0,
      ageGroupRank: result.rankAgeGroup ?? 0,
      finishSeconds: msToSeconds(result.finishTimeMs),
      runs: runsOf(result),
      stations: stationsOf(result),
      roxzoneSeconds: msToSeconds(result.roxzoneTimeMs),
      status: result.status === "finished" ? "finished" : "dnf",
      fieldSize: siblings.length,
      leaderTimeSeconds: finishers.length
        ? msToSeconds(Math.min(...finishers.map((r) => r.finishTimeMs as number)))
        : 0,
      divisionAverage: averageOf(finishers),
    };
  }

  /* ── Athletes ─────────────────────────────────────────────────────── */

  async getAthlete(slug: string): Promise<AthleteProfile | null> {
    const athlete = await this.repo.getAthleteBySlug(slug);
    // Anonymised athletes 404 rather than render an empty shell: an erasure
    // that leaves a page behind has not really erased anything.
    if (!athlete || athlete.isAnonymised) return null;

    const results = await this.repo.listResultsForAthlete(athlete.id);
    const races: AthleteRace[] = [];

    for (const result of results) {
      const eventSlug = await this.eventSlugFor(result.eventId);
      const event = eventSlug ? await this.repo.getEventBySlug(eventSlug) : null;
      if (!event) continue;
      const division = (await this.repo.listDivisions(event.id)).find(
        (d) => d.id === result.divisionId,
      );
      if (!division) continue;

      races.push({
        eventSlug: event.slug,
        eventCity: event.city,
        season: event.season,
        year: event.year,
        date: event.startDate ?? "",
        division: (toDivisionCode(division.divisionKey) ?? division.divisionKey) as DivisionCode,
        divisionLabel: division.displayName,
        rank: result.rankOverall ?? 0,
        ageGroupRank: result.rankAgeGroup ?? 0,
        finishSeconds: msToSeconds(result.finishTimeMs),
        resultId: result.id,
      });
    }

    races.sort((a, b) => b.date.localeCompare(a.date));
    const finishes = races.map((r) => r.finishSeconds).filter((s) => s > 0);

    return {
      slug: athlete.slug,
      name: athlete.name,
      countryIso: athlete.nationality ?? "",
      gender: (athlete.gender as "men" | "women") ?? "men",
      ageGroup: (results[0]?.ageGroup ?? "30-34") as AgeGroup,
      isPlaceholder: athlete.isDemo,
      races,
      pbSeconds: finishes.length ? Math.min(...finishes) : null,
      divisionsRaced: [...new Set(races.map((r) => r.division))],
      seasonsActive: [...new Set(races.map((r) => r.season))],
    };
  }

  /* ── Start lists ──────────────────────────────────────────────────── */

  async getStarters(eventSlug: string): Promise<StartList | null> {
    const event = await this.repo.getEventBySlug(eventSlug);
    if (!event) return null;

    const waves: StartList["waves"] = [];
    for (const division of await this.repo.listDivisions(event.id)) {
      const code = toDivisionCode(division.divisionKey);
      if (!code) continue;
      const rows = await this.repo.listResultsForDivision(division.id);
      const byWave = new Map<string, typeof rows>();
      for (const row of rows) {
        const key = row.wave ?? "1";
        byWave.set(key, [...(byWave.get(key) ?? []), row]);
      }

      for (const [wave, entries] of byWave) {
        const athletes = [];
        for (const entry of entries) {
          const athlete = await this.repo.getAthleteById(entry.athleteId);
          if (!athlete || athlete.isAnonymised) continue;
          athletes.push({
            slug: athlete.slug,
            name: athlete.name,
            countryIso: athlete.nationality ?? "",
            ageGroup: (entry.ageGroup ?? "30-34") as AgeGroup,
          });
        }
        waves.push({
          divisionCode: code,
          divisionLabel: division.displayName,
          wave: Number(wave) || 1,
          time: "",
          athletes,
        });
      }
    }

    return { eventSlug, eventName: event.name, waves };
  }

  /* ── Search, records, distributions ───────────────────────────────── */

  async searchAll(q: string): Promise<SearchResults> {
    const { athletes, events } = await this.repo.searchAthletesAndEvents(q, 8);
    const withCounts = [];
    for (const athlete of athletes) {
      const races = await this.repo.listResultsForAthlete(athlete.id);
      withCounts.push({
        slug: athlete.slug,
        name: athlete.name,
        countryIso: athlete.nationality ?? "",
        raceCount: races.length,
      });
    }
    return {
      athletes: withCounts,
      events: events.map((e) => ({
        slug: e.slug,
        name: e.name,
        city: e.city,
        year: e.year,
        status: toPublicStatus(e.status),
      })),
    };
  }

  async getRecords(): Promise<RecordsBoard> {
    const events = await this.repo.listEvents();
    const best = new Map<string, RecordEntry>();

    for (const event of events) {
      for (const division of await this.repo.listDivisions(event.id)) {
        const code = toDivisionCode(division.divisionKey);
        if (!code) continue;
        const rows = (await this.repo.listResultsForDivision(division.id)).filter(
          (r) => r.status === "finished" && r.finishTimeMs,
        );
        for (const row of rows) {
          const current = best.get(code);
          const seconds = msToSeconds(row.finishTimeMs);
          if (current && current.finishSeconds <= seconds) continue;
          const athlete = await this.repo.getAthleteById(row.athleteId);
          if (!athlete || athlete.isAnonymised) continue;
          best.set(code, {
            divisionCode: code,
            divisionLabel: division.displayName,
            athleteSlug: athlete.slug,
            athleteName: athlete.name,
            countryIso: athlete.nationality ?? "",
            finishSeconds: seconds,
            eventSlug: event.slug,
            eventName: event.name,
            date: event.startDate ?? "",
          });
        }
      }
    }

    return { scope: "all-time", entries: [...best.values()] };
  }

  /**
   * The station histogram the guides and the simulator render.
   *
   * Built from stored splits rather than read from `results_station_distributions`,
   * because the frontend's `Distribution` needs samples and buckets, not just
   * percentile breakpoints. The precomputed table stays the fast path for
   * "what percentile is this time", which is the query that runs on every
   * result page; this is the slower, rarer, cacheable one.
   */
  async getStationDistribution(station: StationId, division: string): Promise<Distribution> {
    const divisionKey = toDivisionKey(division) ?? division;
    const samples: number[] = [];

    for (const event of await this.repo.listEvents()) {
      for (const d of await this.repo.listDivisions(event.id)) {
        if (d.divisionKey !== divisionKey) continue;
        const rows = await this.repo.listResultsForDivision(d.id);
        for (const row of rows) {
          if (row.status !== "finished") continue;
          const segment = row.splits.stations.find((s) => s.key === station);
          if (segment) samples.push(Math.round(segment.timeMs / 1000));
        }
      }
    }

    return buildDistribution(samples);
  }

  /**
   * Every finish time in a division, ascending.
   *
   * The percentile bands on the ranking table need the distribution, not the
   * rows. Served from a single-column read for exactly the reason the contract
   * documents: building row objects to read one number off each is what put the
   * result page's LCP at 5.5 seconds.
   */
  async getDivisionFinishTimes(eventSlug: string, division: string): Promise<number[]> {
    const divisionKey = toDivisionKey(division) ?? division;
    const event = await this.repo.getEventBySlug(eventSlug);
    if (!event) return [];
    const target = (await this.repo.listDivisions(event.id)).find(
      (d) => d.divisionKey === divisionKey,
    );
    if (!target) return [];
    return this.repo.listFinishTimesForDivision(target.id);
  }

  /* ── Helpers ──────────────────────────────────────────────────────── */

  private toEventSummary(event: EngineEvent): EventSummary {
    return {
      slug: event.slug,
      name: event.name,
      city: event.city,
      iata: "",
      country: event.country,
      countryIso: event.countryIso,
      region: event.region,
      venue: event.venue ?? "",
      season: event.season,
      year: event.year,
      startDate: event.startDate ?? "",
      endDate: event.endDate ?? event.startDate ?? "",
      status: toPublicStatus(event.status),
      totalAthletes: event.athleteCount,
    };
  }

  private async eventSlugFor(eventId: string): Promise<string | null> {
    const events = await this.repo.listEvents();
    return events.find((e) => e.id === eventId)?.slug ?? null;
  }
}

function runsOf(result: EngineResult): number[] {
  const runs = new Array(8).fill(0);
  for (const segment of result.splits.runs) {
    const index = Number(/(\d+)/.exec(segment.key)?.[1] ?? 0) - 1;
    if (index >= 0 && index < 8) runs[index] = Math.round(segment.timeMs / 1000);
  }
  return runs;
}

function stationsOf(result: EngineResult): Record<StationId, number> {
  const stations = Object.fromEntries(STATION_IDS.map((s) => [s, 0])) as Record<
    StationId,
    number
  >;
  for (const segment of result.splits.stations) {
    if ((STATION_IDS as readonly string[]).includes(segment.key)) {
      stations[segment.key as StationId] = Math.round(segment.timeMs / 1000);
    }
  }
  return stations;
}

function averageOf(results: EngineResult[]): ResultDetail["divisionAverage"] {
  const runs = new Array(8).fill(0);
  const stations = Object.fromEntries(STATION_IDS.map((s) => [s, 0])) as Record<
    StationId,
    number
  >;
  let roxzone = 0;
  let finish = 0;
  const n = results.length || 1;

  for (const result of results) {
    runsOf(result).forEach((value, i) => (runs[i] += value));
    const rowStations = stationsOf(result);
    for (const station of STATION_IDS) stations[station] += rowStations[station];
    roxzone += msToSeconds(result.roxzoneTimeMs);
    finish += msToSeconds(result.finishTimeMs);
  }

  return {
    runs: runs.map((v) => Math.round(v / n)),
    stations: Object.fromEntries(
      STATION_IDS.map((s) => [s, Math.round(stations[s] / n)]),
    ) as Record<StationId, number>,
    roxzone: Math.round(roxzone / n),
    finish: Math.round(finish / n),
  };
}

function wavesOf(rows: EngineResult[]): { wave: number; time: string; athletes: number }[] {
  const counts = new Map<number, number>();
  for (const row of rows) {
    const wave = Number(row.wave ?? 1) || 1;
    counts.set(wave, (counts.get(wave) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([wave, athletes]) => ({ wave, time: "", athletes }));
}
