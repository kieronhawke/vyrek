/**
 * `ResultsDataSource` — brief §8.
 *
 * The whole point of this file: **no component may import a concrete source.**
 * UI receives data through this interface only, so when a licensed live feed
 * arrives it replaces `DemoDataSource` and nothing above the data layer changes.
 *
 * Get a source with `getResultsSource()`, which reads `NEXT_PUBLIC_DATA_MODE`.
 */

import type { DivisionCode, EventStatus } from "./types";
import type { AgeGroup, RaceResult, StationId } from "./model";
import type { Distribution } from "./percentiles";

export type EventSummary = {
  slug: string;
  name: string;
  city: string;
  cityLocal?: string;
  iata: string;
  country: string;
  countryIso: string;
  region: string;
  venue: string;
  season: string;
  year: number;
  startDate: string;
  endDate: string;
  status: EventStatus;
  totalAthletes: number;
};

export type EventDivisionSummary = {
  divisionCode: DivisionCode;
  label: string;
  headline: boolean;
  athleteCount: number;
  finisherCount?: number;
  leaderTimeSeconds?: number;
  leaderAthleteSlug?: string;
  leaderAthleteName?: string;
  waves: { wave: number; time: string; athletes: number }[];
};

export type RaceEventDetail = EventSummary & {
  divisions: EventDivisionSummary[];
};

export type RankingRow = {
  id: string;
  rank: number;
  ageGroupRank: number;
  athleteSlug: string;
  athleteName: string;
  countryIso: string;
  ageGroup: AgeGroup;
  finishSeconds: number;
  gapToLeaderSeconds: number;
  status: "finished" | "dnf";
  partnerNames?: string[];
};

export type RankingPage = {
  eventSlug: string;
  eventName: string;
  division: DivisionCode;
  divisionLabel: string;
  rows: RankingRow[];
  /** Total matching the current filter, which may exceed `rows.length`. */
  total: number;
  fieldSize: number;
  leaderTimeSeconds: number;
  nextCursor: string | null;
};

export type AthleteRace = {
  eventSlug: string;
  eventCity: string;
  season: string;
  year: number;
  date: string;
  division: DivisionCode;
  divisionLabel: string;
  rank: number;
  ageGroupRank: number;
  finishSeconds: number;
  resultId: string;
};

export type AthleteProfile = {
  slug: string;
  name: string;
  countryIso: string;
  gender: "men" | "women";
  ageGroup: AgeGroup;
  /** True for the storyline Sutherlands. Renders a visible placeholder notice. */
  isPlaceholder: boolean;
  races: AthleteRace[];
  pbSeconds: number | null;
  divisionsRaced: DivisionCode[];
  seasonsActive: string[];
};

export type StartListWave = {
  divisionCode: DivisionCode;
  divisionLabel: string;
  wave: number;
  time: string;
  athletes: { slug: string; name: string; countryIso: string; ageGroup: AgeGroup }[];
};

export type StartList = {
  eventSlug: string;
  eventName: string;
  waves: StartListWave[];
};

export type SearchResults = {
  athletes: { slug: string; name: string; countryIso: string; raceCount: number }[];
  events: { slug: string; name: string; city: string; year: number; status: EventStatus }[];
};

export type RecordEntry = {
  divisionCode: DivisionCode;
  divisionLabel: string;
  athleteSlug: string;
  athleteName: string;
  countryIso: string;
  finishSeconds: number;
  eventSlug: string;
  eventName: string;
  date: string;
};

export type RecordsBoard = {
  scope: "all-time" | "season";
  season?: string;
  entries: RecordEntry[];
};

export type ResultDetail = RaceResult & {
  eventName: string;
  eventCity: string;
  eventSlug: string;
  divisionLabel: string;
  fieldSize: number;
  leaderTimeSeconds: number;
  /** Division averages at this event, for the vs-average bars. */
  divisionAverage: { runs: number[]; stations: Record<StationId, number>; roxzone: number; finish: number };
};

export interface ResultsDataSource {
  listEvents(filter?: {
    season?: string;
    region?: string;
    status?: EventStatus;
  }): Promise<EventSummary[]>;

  getEvent(slug: string): Promise<RaceEventDetail | null>;

  getRanking(
    eventSlug: string,
    division: string,
    opts?: { cursor?: string; ageGroup?: string; q?: string; limit?: number },
  ): Promise<RankingPage | null>;

  getResult(id: string): Promise<ResultDetail | null>;

  getAthlete(slug: string): Promise<AthleteProfile | null>;

  getStarters(eventSlug: string): Promise<StartList | null>;

  searchAll(q: string): Promise<SearchResults>;

  getRecords(): Promise<RecordsBoard>;

  getStationDistribution(station: StationId, division: string): Promise<Distribution>;

  /**
   * Ascending finish times for a division, and nothing else.
   *
   * Result pages need the field only to place one athlete in it. Going through
   * `getRanking` built 3,221 row objects per request to read one number off
   * each — 5.5s LCP on the result page. A live feed should serve this from a
   * precomputed column, never by materialising rows.
   */
  getDivisionFinishTimes(eventSlug: string, division: string): Promise<number[]>;
}

/** `demo` shows the Demo data pill; `live` hides it. */
export type DataMode = "demo" | "live";

export function getDataMode(): DataMode {
  return process.env.NEXT_PUBLIC_DATA_MODE === "live" ? "live" : "demo";
}
