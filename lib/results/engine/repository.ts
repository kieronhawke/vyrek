/**
 * `ResultsRepository` — the seam the whole engine is built on.
 *
 * Workers, the serving API and the operator console all talk to this. Supabase
 * sits behind one implementation of it; an in-memory store sits behind another.
 *
 * That is not a testing convenience bolted on afterwards. The Supabase project
 * was paused when this was built, and the brief requires every behaviour —
 * idempotency, quarantine, circuit breaking, live fan-out, completeness — to be
 * proven deterministically in CI. Both are satisfied by making the store an
 * interface rather than an import.
 *
 * Rule: **no worker or endpoint may import a Supabase client directly.**
 */

import type {
  AthleteMergeReview,
  EngineAlert,
  EngineAthlete,
  EngineDivision,
  EngineEvent,
  EngineEventStatus,
  EngineResult,
  IngestionRun,
  QuarantineRow,
  StationDistribution,
  SyncState,
} from "./types";

export type UpsertEvent = Omit<EngineEvent, "id"> & { id?: string };
export type UpsertDivision = Omit<EngineDivision, "id"> & { id?: string };
export type UpsertAthlete = Omit<EngineAthlete, "id"> & { id?: string };
export type UpsertResult = Omit<EngineResult, "id"> & { id?: string };

export type RankingQuery = {
  eventSlug: string;
  divisionKey: string;
  cursor?: string;
  limit?: number;
  ageGroup?: string;
  q?: string;
};

export type RankingResultPage = {
  rows: (EngineResult & { athlete: EngineAthlete })[];
  total: number;
  nextCursor: string | null;
};

export interface ResultsRepository {
  /* ── Events and divisions ─────────────────────────────────────────── */
  upsertEvent(event: UpsertEvent): Promise<EngineEvent>;
  getEventBySlug(slug: string): Promise<EngineEvent | null>;
  getEventBySourceId(sourceEventId: string): Promise<EngineEvent | null>;
  listEvents(filter?: {
    season?: string;
    region?: string;
    status?: EngineEventStatus;
  }): Promise<EngineEvent[]>;
  setEventStatus(eventId: string, status: EngineEventStatus): Promise<void>;

  upsertDivision(division: UpsertDivision): Promise<EngineDivision>;
  listDivisions(eventId: string): Promise<EngineDivision[]>;
  /**
   * Every division, for callers that need to reason across events.
   *
   * The backfill needs to know which events are finished, and the real unit of
   * work is the division — so asking per event is 223 round trips to answer one
   * question.
   */
  listAllDivisions(): Promise<EngineDivision[]>;

  /* ── Athletes ─────────────────────────────────────────────────────── */
  upsertAthlete(athlete: UpsertAthlete): Promise<EngineAthlete>;
  getAthleteById(id: string): Promise<EngineAthlete | null>;
  getAthleteBySlug(slug: string): Promise<EngineAthlete | null>;
  getAthleteBySourceId(sourceAthleteId: string): Promise<EngineAthlete | null>;
  /**
   * Many athletes by source id, in one round trip.
   *
   * Resolving a division one athlete at a time cost up to three calls each —
   * roughly 460 for a single 77-row doubles board, and half a million across
   * the catalogue. At even 100ms a call that is fifteen hours of pure latency,
   * and every one of those calls is a window in which the process can die
   * leaving athletes created but their rows unwritten.
   */
  getAthletesBySourceIds(sourceAthleteIds: string[]): Promise<EngineAthlete[]>;
  /** Many athletes at once, keyed on slug. Same reasoning as the read. */
  upsertAthletes(athletes: UpsertAthlete[]): Promise<EngineAthlete[]>;
  /**
   * Which of these slugs are already taken.
   *
   * Allocating slugs one at a time was the last per-athlete round trip left:
   * a 638-row doubles board needed 1,276 of them, which is what turned a
   * seven-request fetch into a division that never finished.
   */
  findTakenSlugs(slugs: string[]): Promise<Set<string>>;
  findAthletesByName(name: string): Promise<EngineAthlete[]>;
  anonymiseAthlete(athleteId: string): Promise<void>;
  claimAthlete(athleteId: string, userId: string): Promise<void>;
  recordMergeReview(
    review: Omit<AthleteMergeReview, "id" | "createdAt">,
  ): Promise<AthleteMergeReview>;
  listMergeReviews(opts?: { unresolvedOnly?: boolean }): Promise<AthleteMergeReview[]>;

  /* ── Results ──────────────────────────────────────────────────────── */
  /**
   * Idempotent on `sourceResultId`. Returns how many rows were genuinely new
   * or changed, which is what the live differ publishes on and what the
   * idempotency test asserts against.
   */
  upsertResults(rows: UpsertResult[]): Promise<{ inserted: number; updated: number; unchanged: number }>;
  getResultById(id: string): Promise<EngineResult | null>;
  getResultBySourceId(sourceResultId: string): Promise<EngineResult | null>;
  getRanking(query: RankingQuery): Promise<RankingResultPage>;
  listResultsForAthlete(athleteId: string): Promise<EngineResult[]>;
  /** How many races an athlete has, without materialising any of them. */
  countResultsForAthlete(athleteId: string): Promise<number>;
  /**
   * Race counts for many athletes at once.
   *
   * ⚠️ The search box shows a count beside each name and asked for them one at
   * a time — sixteen round trips for eight results. Each query runs in under a
   * millisecond and each trip costs the better part of a second, so search took
   * 35 seconds on "ben sut" while the query behind it took 11ms.
   */
  countResultsForAthletes(athleteIds: string[]): Promise<Map<string, number>>;
  listResultsForDivision(divisionId: string): Promise<EngineResult[]>;
  countResultsForDivision(divisionId: string): Promise<number>;
  /**
   * Finish times only, ascending, finishers only.
   *
   * Deliberately its own method rather than a map over `listResultsForDivision`:
   * the frontend contract notes that materialising 3,221 row objects to read one
   * number off each cost a 5.5s LCP. The Supabase implementation selects a single
   * column; nothing else may.
   */
  listFinishTimesForDivision(divisionId: string): Promise<number[]>;
  /**
   * The headline numbers for one division, without reading its rows.
   *
   * `getEvent` renders a card per division — field size, finisher count, the
   * leader, the wave list — and used to load every column of every row of every
   * division to derive them. `results_results` carries a `splits` JSONB blob of
   * eighteen segments per athlete, so a fifteen-division event meant megabytes
   * of JSON to print a handful of integers.
   */
  getDivisionSummary(divisionId: string): Promise<{
    total: number;
    finisherCount: number;
    leader: { athleteId: string; finishTimeMs: number | null } | null;
    waves: (string | null)[];
  }>;
  /**
   * Only the rows that actually carry splits.
   *
   * Splits arrive one athlete at a time, long after the board does, so most
   * rows have none. Averaging segment times across *all* rows divides real
   * totals by a field that is mostly zeroes and reports a division average far
   * faster than anybody ran — which is what the "vs division average" bars on
   * every result page were drawn from.
   */
  listResultsWithSplitsForDivision(divisionId: string): Promise<EngineResult[]>;
  /**
   * Every division of one event, summarised, in a single call.
   *
   * The event page needs a field size, a finisher count, a leader and a wave
   * list per division. Asking each separately was four requests per division —
   * seventy-two for an eighteen-division event, about four seconds.
   */
  getEventDivisionSummaries(eventId: string): Promise<
    Map<string, {
      total: number;
      finisherCount: number;
      leader: { athleteId: string; finishTimeMs: number | null } | null;
      waves: (string | null)[];
    }>
  >;
  /**
   * Every stored time for one station across a division key, in seconds.
   *
   * Built for the station guides' histogram, which used to walk each division
   * of the key in turn: ~130 requests for a page that renders two of them.
   */
  listStationTimes(station: string, divisionKey: string): Promise<number[]>;
  /**
   * Start-list rows for one division, with the athlete already joined.
   *
   * The start list needs a name, a nationality and an age group per entrant and
   * nothing else. Building it from `listResultsForDivision` plus a
   * `getAthleteById` per row meant 12,366 sequential athlete lookups for one
   * event, which took nine and a half minutes.
   */
  listStartersForDivision(divisionId: string): Promise<
    {
      wave: string | null;
      ageGroup: string | null;
      slug: string;
      name: string;
      nationality: string | null;
      isAnonymised: boolean;
    }[]
  >;
  /**
   * The fastest finish ever recorded in each division, across every event.
   *
   * The record board is one row per division and used to be assembled by
   * walking every event, every division and every row — 2,692 divisions, all
   * columns, plus an athlete lookup per improvement. It took six minutes, which
   * is past any serverless timeout: the page could not have rendered in
   * production at all.
   *
   * One ordered, limited query per division key instead.
   */
  getDivisionRecords(): Promise<
    {
      divisionKey: string;
      divisionLabel: string;
      athleteId: string;
      finishTimeMs: number;
      eventId: string;
    }[]
  >;
  /**
   * Athlete search, ranked and deduped by the database.
   *
   * ⚠️ Returns one row per *person*, with their whole career counted. The
   * source issues a new athlete id at every event, so a plain search returns
   * the same name four times with two races each; and ranking by race count is
   * what puts the Ben Sutherland somebody is looking for above the Ben who has
   * raced once. Both are done in SQL because doing them here cost 35 seconds.
   */
  searchAthletes(q: string, limit?: number): Promise<
    { slug: string; name: string; nationality: string; races: number }[]
  >;
  searchAthletesAndEvents(q: string, limit?: number): Promise<{
    athletes: EngineAthlete[];
    events: EngineEvent[];
  }>;

  /* ── Distributions ────────────────────────────────────────────────── */
  replaceStationDistributions(rows: Omit<StationDistribution, "id">[]): Promise<void>;
  getStationDistribution(query: {
    scope: "event" | "global";
    eventId?: string | null;
    divisionKey: string;
    stationKey: string;
  }): Promise<StationDistribution | null>;

  /* ── Observability ────────────────────────────────────────────────── */
  startRun(run: Pick<IngestionRun, "mode"> & Partial<IngestionRun>): Promise<IngestionRun>;
  finishRun(id: string, patch: Partial<IngestionRun>): Promise<IngestionRun>;
  listRuns(limit?: number): Promise<IngestionRun[]>;
  latestRun(mode?: IngestionRun["mode"]): Promise<IngestionRun | null>;

  getSyncState(sourceEventId: string): Promise<SyncState | null>;
  upsertSyncState(state: SyncState): Promise<SyncState>;
  listSyncStates(filter?: { liveOnly?: boolean }): Promise<SyncState[]>;

  quarantine(row: Omit<QuarantineRow, "id" | "createdAt">): Promise<QuarantineRow>;
  listQuarantine(opts?: { openOnly?: boolean; limit?: number }): Promise<QuarantineRow[]>;
  markQuarantineReprocessed(id: string): Promise<void>;

  /**
   * Raise an alert, or quietly refresh an identical open one.
   *
   * Implementations must **deduplicate**: an alert whose kind and message match
   * an existing unacknowledged alert is not a second problem, it is the same
   * problem still happening. The catalogue raises "155 events have no calendar
   * match" on every run; without dedup an operator opens the console to a
   * hundred identical rows and stops reading it, which costs more than the
   * alert was ever worth.
   */
  raiseAlert(alert: Omit<EngineAlert, "id" | "createdAt">): Promise<EngineAlert>;
  listAlerts(opts?: { openOnly?: boolean; limit?: number }): Promise<EngineAlert[]>;
  acknowledgeAlert(id: string): Promise<void>;

  /* ── Settings ─────────────────────────────────────────────────────── */
  getSetting<T>(key: string): Promise<T | null>;
  setSetting(key: string, value: unknown, updatedBy?: string): Promise<void>;
}
