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
import { readStoredRecords } from "../sync/records";
import { dedupePeople, samePerson } from "./identity-group";
import { isFinish, normaliseStatus } from "@/lib/results/status";

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

    // ⚠️ Summaries, not rows, and all divisions at once.
    //
    // Two separate costs were stacked here. Each division read every column of
    // every one of its rows — including the `splits` JSONB blob of eighteen
    // segments per athlete — to print a field size and a leader. And the
    // divisions were read one after another: a fifteen-division event was sixty
    // sequential round trips. Rotterdam, at 12,366 results, took twelve seconds.
    // ⚠️ One aggregate for the whole event, not four questions per division.
    //
    // Eighteen divisions meant seventy-two requests and about four seconds on
    // the page people open most. Grouping is the database's job — see
    // `results_event_division_summary` in migration 0108.
    const byDivision = await this.repo.getEventDivisionSummaries(event.id);

    const summaries = (
      await Promise.all(
        divisions.map(async (division): Promise<EventDivisionSummary | null> => {
          const code = toDivisionCode(division.divisionKey);
          if (!code) return null;

          const summary = byDivision.get(division.id) ?? {
            total: 0, finisherCount: 0, leader: null, waves: [],
          };
          const leaderAthlete = summary.leader
            ? await this.repo.getAthleteById(summary.leader.athleteId)
            : null;

          return {
            divisionCode: code,
            label: division.displayName,
            headline: code === "hyrox-men" || code === "hyrox-women",
            athleteCount: division.entrantCount || summary.total,
            finisherCount: summary.finisherCount,
            leaderTimeSeconds: summary.leader
              ? msToSeconds(summary.leader.finishTimeMs)
              : undefined,
            leaderAthleteSlug: leaderAthlete?.slug,
            leaderAthleteName: leaderAthlete?.name,
            waves: wavesFromLabels(summary.waves),
          };
        }),
      )
    ).filter((s): s is EventDivisionSummary => s !== null);

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
    //
    // ⚠️ Two narrow reads, not a full one. This used to call
    // `listResultsForDivision`, which selects every column — including the
    // `splits` JSONB blob carrying eighteen segments per athlete — for the whole
    // division, to extract one minimum and one count. On a real board that is
    // megabytes of JSON per request: a 695-athlete division took minutes rather
    // than milliseconds, and the largest event here holds 12,366.
    //
    // `listFinishTimesForDivision` is one integer column, filtered to finishers
    // and ordered ascending, so the leader is simply its first element.
    const [finishTimes, fieldSize] = await Promise.all([
      this.repo.listFinishTimesForDivision(target.id),
      this.repo.countResultsForDivision(target.id),
    ]);
    const leaderTimeSeconds = finishTimes[0] ?? 0;

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
      /*
        `normaliseStatus` rather than a two-way ternary. The ternary was safe —
        an unknown value became `dnf`, never a finish — but it also flattened
        every disqualification and no-show into "did not finish", which are
        different things and are published as different things. An athlete
        would not thank us for recording a DSQ as a DNF.
      */
      status: normaliseStatus(r.status),
    }));

    return {
      eventSlug,
      eventName: event.name,
      division: (toDivisionCode(divisionKey) ?? division) as DivisionCode,
      divisionLabel: target.displayName,
      rows,
      total: page.total,
      fieldSize,
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

    // Three narrow reads rather than the whole division.
    //
    // The averages are taken over the rows that actually carry splits, not over
    // every row. Splits arrive one athlete at a time long after the board does,
    // so most rows have none — averaging eighteen segment times across a field
    // that is 99% zeroes reported a division average far faster than anybody
    // ran, and that number is what every "vs division average" bar on this page
    // is drawn against.
    const [fieldSize, finishSeconds, withSplits] = await Promise.all([
      this.repo.countResultsForDivision(division.id),
      this.repo.listFinishTimesForDivision(division.id),
      this.repo.listResultsWithSplitsForDivision(division.id),
    ]);

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
      status: normaliseStatus(result.status),
      fieldSize,
      // Already ascending and filtered to finishers.
      leaderTimeSeconds: finishSeconds[0] ?? 0,
      divisionAverage: averageOf(
        // One gate for "does this count towards an average", shared with the
        // record book so the two can never drift apart.
        withSplits.filter((r) => isFinish(r.status, msToSeconds(r.finishTimeMs))),
        finishSeconds,
      ),
    };
  }

  /* ── Athletes ─────────────────────────────────────────────────────── */

  async getAthlete(slug: string): Promise<AthleteProfile | null> {
    const athlete = await this.repo.getAthleteBySlug(slug);
    // Anonymised athletes 404 rather than render an empty shell: an erasure
    // that leaves a page behind has not really erased anything.
    if (!athlete || athlete.isAnonymised) return null;

    // ⚠️ Every profile that is this same person, not just this row's id.
    //
    // The source has no stable athlete id across events, so one career is
    // stored as many profiles. Reading only `athlete.id` shows a page with a
    // single race on it and no history — which is the opposite of what an
    // athlete profile is for.
    const namesakes = await this.repo.findAthletesByName(athlete.name);
    const identities = samePerson(athlete, namesakes.length ? namesakes : [athlete]);

    const resultSets = await Promise.all(
      identities.map((a) => this.repo.listResultsForAthlete(a.id)),
    );
    // Deduped by result id: a doubles row lists both partners, so the same row
    // can arrive from two of this person's profiles.
    const results = [...new Map(resultSets.flat().map((r) => [r.id, r])).values()];
    const races: AthleteRace[] = [];

    // ⚠️ Events and divisions read once, not once per race.
    //
    // This loop used to await an event slug, an event, and that event's whole
    // division list *inside* the loop — three round trips per race, in series.
    // A seventeen-race career was fifty-one sequential queries and took five
    // seconds. Two reads cover every race.
    const [allEvents, allDivisions] = await Promise.all([
      this.repo.listEvents(),
      this.repo.listAllDivisions(),
    ]);
    const eventById = new Map(allEvents.map((e) => [e.id, e]));
    const divisionById = new Map(allDivisions.map((d) => [d.id, d]));

    for (const result of results) {
      const event = eventById.get(result.eventId);
      if (!event) continue;
      const division = divisionById.get(result.divisionId);
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

    // ⚠️ One race per event, per finish time.
    //
    // A division filled with another division's athletes puts the same result
    // on the profile twice — Glasgow appears as both "Pro Doubles Men" and "Pro
    // Doubles Women", same rank, same time, because one row is contamination.
    // Nobody races two divisions at one event in the same time, so the
    // duplicate is dropped rather than shown as two races.
    const seenRace = new Set<string>();
    const unique = races.filter((r) => {
      const key = `${r.eventSlug}|${r.finishSeconds}`;
      if (seenRace.has(key)) return false;
      seenRace.add(key);
      return true;
    });
    races.length = 0;
    races.push(...unique);

    // ⚠️ Ordered by date where we have one, by year where we do not.
    //
    // Only the events matching HYROX's published calendar carry a real date —
    // that calendar lists upcoming races, so most of the archive has none. A
    // plain date sort therefore put every undated race in one undifferentiated
    // clump, and "your latest races" showed 2019 above 2026. Year is known for
    // every event, so it is the fallback.
    races.sort((a, b) => {
      const byDate = (b.date || `${b.year}-00-00`).localeCompare(a.date || `${a.year}-00-00`);
      if (byDate !== 0) return byDate;
      return b.year - a.year;
    });
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

    // ⚠️ One joined read per division, all divisions at once.
    //
    // This walked every row of every division and issued a `getAthleteById` for
    // each — 12,366 sequential lookups for Rotterdam, measured at nine and a
    // half minutes. The athlete now arrives joined to the row.
    const divisions = await this.repo.listDivisions(event.id);
    const perDivision = await Promise.all(
      divisions.map(async (division) => {
        const code = toDivisionCode(division.divisionKey);
        if (!code) return [];

        const entries = await this.repo.listStartersForDivision(division.id);
        const byWave = new Map<string, typeof entries>();
        for (const entry of entries) {
          // An anonymised athlete is a removal request: off the start list,
          // while the row stays for ranking integrity.
          if (entry.isAnonymised) continue;
          const key = entry.wave ?? "1";
          byWave.set(key, [...(byWave.get(key) ?? []), entry]);
        }

        return [...byWave.entries()].map(([wave, group]) => ({
          divisionCode: code,
          divisionLabel: division.displayName,
          wave: Number(wave) || 1,
          time: "",
          athletes: group.map((entry) => ({
            slug: entry.slug,
            name: entry.name,
            countryIso: entry.nationality ?? "",
            ageGroup: (entry.ageGroup ?? "30-34") as AgeGroup,
          })),
        }));
      }),
    );

    return { eventSlug, eventName: event.name, waves: perDivision.flat() };
  }

  /* ── Search, records, distributions ───────────────────────────────── */

  async searchAll(q: string): Promise<SearchResults> {
    // ⚠️ Athletes ranked and deduped in SQL; only the events list is read here.
    //
    // This used to search, then count each hit one at a time, then group the
    // duplicates in TypeScript — eighteen round trips, 35 seconds on "ben sut",
    // for queries that run in single-digit milliseconds. The database does all
    // three now and this is one call.
    const [people, { events }] = await Promise.all([
      this.repo.searchAthletes(q, 8),
      this.repo.searchAthletesAndEvents(q, 8),
    ]);

    const withCounts = people.map((p) => ({
      slug: p.slug,
      name: p.name,
      countryIso: p.nationality,
      raceCount: p.races,
    }));

    return {
      // Already one entry per person, ranked by career length, from SQL.
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
    // ⚠️ One top-1 query per division, not a walk of the whole database.
    //
    // This used to iterate every event, every division and every row — 2,692
    // divisions, all columns, with an athlete lookup on each improvement — and
    // took six minutes against the real store. That is past any serverless
    // timeout, so `/rankings/world-records` could not have rendered in
    // production; the resilient wrapper would have caught the timeout and
    // quietly served demo records instead.
    const [stored, events] = await Promise.all([
      readStoredRecords(this.repo),
      // One read for the whole catalogue, rather than a lookup per record.
      this.repo.listEvents(),
    ]);

    // Falling back to deriving it means the very first request after a deploy
    // pays the full cost, but a board that has never been computed is better
    // served slowly than not at all.
    const records = stored?.records ?? (await this.repo.getDivisionRecords());
    const eventById = new Map(events.map((e) => [e.id, e]));

    const entries = await Promise.all(
      records.map(async (record): Promise<RecordEntry | null> => {
        const code = toDivisionCode(record.divisionKey);
        if (!code) return null;

        const athlete = await this.repo.getAthleteById(record.athleteId);
        const event = eventById.get(record.eventId);
        // An anonymised athlete is a removal request: their name comes off the
        // record board rather than the board keeping a stale copy of it.
        //
        // An athlete flagged for identity review is held back too. This board
        // claims to name the fastest human being ever to do this, so it is the
        // one page where a doubtful row must not appear — a placeholder entry
        // called "- -" reached it as the fastest women's HYROX on record.
        if (!athlete || athlete.isAnonymised || athlete.needsIdentityReview || !event) {
          return null;
        }

        return {
          divisionCode: code,
          divisionLabel: record.divisionLabel,
          athleteSlug: athlete.slug,
          athleteName: athlete.name,
          countryIso: athlete.nationality ?? "",
          finishSeconds: msToSeconds(record.finishTimeMs),
          eventSlug: event.slug,
          eventName: event.name,
          date: event.startDate ?? "",
        };
      }),
    );

    return {
      scope: "all-time",
      entries: entries.filter((e): e is RecordEntry => e !== null),
    };
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

    // ⚠️ One query, not one per division.
    //
    // This walked every division of the key and read its rows — about 130
    // requests and six seconds for a page that renders two of these. The
    // database unnests the splits and filters on `has_splits`, which covers 21
    // rows rather than 630,287. See migration 0108.
    return buildDistribution(await this.repo.listStationTimes(station, divisionKey));
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

/**
 * The division's average race.
 *
 * ⚠️ Two different denominators, deliberately.
 *
 * Segment averages are taken over `withSplits` — the rows that actually carry
 * them. Splits are fetched one athlete at a time and arrive long after the
 * board, so most rows have none; dividing real segment totals by the whole
 * field made the average race look far faster than anyone ran, and that is the
 * baseline every "vs division average" bar on the result page is drawn against.
 *
 * The finish average uses every finisher's time, because that column is
 * populated for all of them and a narrower sample would be a worse answer.
 */
function averageOf(
  withSplits: EngineResult[],
  allFinishSeconds: number[],
): ResultDetail["divisionAverage"] {
  const runs = new Array(8).fill(0);
  const stations = Object.fromEntries(STATION_IDS.map((s) => [s, 0])) as Record<
    StationId,
    number
  >;
  let roxzone = 0;
  const n = withSplits.length || 1;

  for (const result of withSplits) {
    runsOf(result).forEach((value, i) => (runs[i] += value));
    const rowStations = stationsOf(result);
    for (const station of STATION_IDS) stations[station] += rowStations[station];
    roxzone += msToSeconds(result.roxzoneTimeMs);
  }

  const finish = allFinishSeconds.length
    ? Math.round(allFinishSeconds.reduce((a, b) => a + b, 0) / allFinishSeconds.length)
    : 0;

  return {
    runs: runs.map((v) => Math.round(v / n)),
    stations: Object.fromEntries(
      STATION_IDS.map((s) => [s, Math.round(stations[s] / n)]),
    ) as Record<StationId, number>,
    roxzone: Math.round(roxzone / n),
    finish,
  };
}

/** Waves tallied from the wave column alone. */
function wavesFromLabels(
  labels: (string | null)[],
): { wave: number; time: string; athletes: number }[] {
  const counts = new Map<number, number>();
  for (const label of labels) {
    const wave = Number(label ?? 1) || 1;
    counts.set(wave, (counts.get(wave) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([wave, athletes]) => ({ wave, time: "", athletes }));
}
