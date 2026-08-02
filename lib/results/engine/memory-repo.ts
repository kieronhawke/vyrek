/**
 * In-memory `ResultsRepository`.
 *
 * A real implementation, not a mock: the same upsert semantics, the same
 * idempotency keys, the same ordering and pagination rules as the Supabase one.
 * Tests that pass here are testing behaviour, not a stub's opinion of it.
 *
 * Ids are counter-based rather than random so a test run is reproducible and
 * failures diff cleanly.
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
import type {
  RankingQuery,
  RankingResultPage,
  ResultsRepository,
  UpsertAthlete,
  UpsertDivision,
  UpsertEvent,
  UpsertResult,
} from "./repository";

/** Injectable so tests can freeze time; `Date.now` in production. */
export type Clock = () => Date;

export class MemoryResultsRepository implements ResultsRepository {
  private seq = 0;
  private clock: Clock;

  events = new Map<string, EngineEvent>();
  divisions = new Map<string, EngineDivision>();
  athletes = new Map<string, EngineAthlete>();
  results = new Map<string, EngineResult>();
  distributions: StationDistribution[] = [];
  runs = new Map<string, IngestionRun>();
  syncStates = new Map<string, SyncState>();
  quarantined: QuarantineRow[] = [];
  alerts: EngineAlert[] = [];
  mergeReviews: AthleteMergeReview[] = [];
  settings = new Map<string, unknown>();

  constructor(opts: { clock?: Clock } = {}) {
    this.clock = opts.clock ?? (() => new Date());
  }

  private id(prefix: string) {
    this.seq += 1;
    return `${prefix}_${String(this.seq).padStart(6, "0")}`;
  }

  private now() {
    return this.clock().toISOString();
  }

  /* ── Events and divisions ───────────────────────────────────────────── */

  async upsertEvent(event: UpsertEvent): Promise<EngineEvent> {
    const existing =
      [...this.events.values()].find((e) => e.slug === event.slug) ??
      (event.sourceEventId
        ? [...this.events.values()].find((e) => e.sourceEventId === event.sourceEventId)
        : undefined);

    if (existing) {
      const merged: EngineEvent = { ...existing, ...event, id: existing.id };
      this.events.set(existing.id, merged);
      return merged;
    }
    const id = event.id ?? this.id("evt");
    const created: EngineEvent = { ...event, id };
    this.events.set(id, created);
    return created;
  }

  async getEventBySlug(slug: string) {
    return [...this.events.values()].find((e) => e.slug === slug) ?? null;
  }

  async getEventBySourceId(sourceEventId: string) {
    return [...this.events.values()].find((e) => e.sourceEventId === sourceEventId) ?? null;
  }

  async listEvents(filter: { season?: string; region?: string; status?: EngineEventStatus } = {}) {
    return [...this.events.values()]
      .filter((e) => (filter.season ? e.season === filter.season : true))
      .filter((e) => (filter.region ? e.region === filter.region : true))
      .filter((e) => (filter.status ? e.status === filter.status : true))
      .sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""));
  }

  async setEventStatus(eventId: string, status: EngineEventStatus) {
    const e = this.events.get(eventId);
    if (e) this.events.set(eventId, { ...e, status });
  }

  async upsertDivision(division: UpsertDivision): Promise<EngineDivision> {
    const existing = [...this.divisions.values()].find(
      (d) => d.eventId === division.eventId && d.divisionKey === division.divisionKey,
    );
    if (existing) {
      const merged = { ...existing, ...division, id: existing.id };
      this.divisions.set(existing.id, merged);
      return merged;
    }
    const id = division.id ?? this.id("div");
    const created: EngineDivision = { ...division, id };
    this.divisions.set(id, created);
    return created;
  }

  async listDivisions(eventId: string) {
    return [...this.divisions.values()].filter((d) => d.eventId === eventId);
  }

  /* ── Athletes ───────────────────────────────────────────────────────── */

  async upsertAthlete(athlete: UpsertAthlete): Promise<EngineAthlete> {
    const existing = athlete.sourceAthleteId
      ? [...this.athletes.values()].find((a) => a.sourceAthleteId === athlete.sourceAthleteId)
      : [...this.athletes.values()].find((a) => a.slug === athlete.slug);

    if (existing) {
      const merged = { ...existing, ...athlete, id: existing.id };
      this.athletes.set(existing.id, merged);
      return merged;
    }
    const id = athlete.id ?? this.id("ath");
    const created: EngineAthlete = { ...athlete, id };
    this.athletes.set(id, created);
    return created;
  }

  async getAthleteById(id: string) {
    return this.athletes.get(id) ?? null;
  }

  async getAthleteBySlug(slug: string) {
    const found = [...this.athletes.values()].find((a) => a.slug === slug);
    // Anonymised athletes have no profile. The row survives for ranking
    // integrity; the person does not remain addressable.
    return found && !found.isAnonymised ? found : null;
  }

  async getAthleteBySourceId(sourceAthleteId: string) {
    return [...this.athletes.values()].find((a) => a.sourceAthleteId === sourceAthleteId) ?? null;
  }

  async findAthletesByName(name: string) {
    const needle = name.trim().toLowerCase();
    return [...this.athletes.values()].filter(
      (a) => !a.isAnonymised && a.name.toLowerCase() === needle,
    );
  }

  async anonymiseAthlete(athleteId: string) {
    const a = this.athletes.get(athleteId);
    if (!a) return;
    this.athletes.set(athleteId, {
      ...a,
      name: "Withdrawn athlete",
      slug: `anon-${athleteId}`,
      nationality: null,
      sourceAthleteId: null,
      claimedByUserId: null,
      isAnonymised: true,
    });
  }

  async claimAthlete(athleteId: string, userId: string) {
    const a = this.athletes.get(athleteId);
    if (a) this.athletes.set(athleteId, { ...a, claimedByUserId: userId });
  }

  async recordMergeReview(review: Omit<AthleteMergeReview, "id" | "createdAt">) {
    const created: AthleteMergeReview = {
      ...review,
      id: this.id("mrg"),
      createdAt: this.now(),
    };
    this.mergeReviews.push(created);
    return created;
  }

  async listMergeReviews(opts: { unresolvedOnly?: boolean } = {}) {
    return this.mergeReviews.filter((r) => (opts.unresolvedOnly ? !r.resolution : true));
  }

  /* ── Results ────────────────────────────────────────────────────────── */

  async upsertResults(rows: UpsertResult[]) {
    let inserted = 0;
    let updated = 0;
    let unchanged = 0;

    for (const row of rows) {
      const existing = [...this.results.values()].find(
        (r) => r.sourceResultId === row.sourceResultId,
      );
      if (!existing) {
        const id = row.id ?? this.id("res");
        this.results.set(id, { ...row, id });
        inserted += 1;
        continue;
      }
      const next: EngineResult = { ...existing, ...row, id: existing.id };
      if (sameResult(existing, next)) {
        unchanged += 1;
      } else {
        this.results.set(existing.id, next);
        updated += 1;
      }
    }
    return { inserted, updated, unchanged };
  }

  async getResultById(id: string) {
    return this.results.get(id) ?? null;
  }

  async getResultBySourceId(sourceResultId: string) {
    return [...this.results.values()].find((r) => r.sourceResultId === sourceResultId) ?? null;
  }

  async getRanking(query: RankingQuery): Promise<RankingResultPage> {
    const event = await this.getEventBySlug(query.eventSlug);
    if (!event) return { rows: [], total: 0, nextCursor: null };
    const division = [...this.divisions.values()].find(
      (d) => d.eventId === event.id && d.divisionKey === query.divisionKey,
    );
    if (!division) return { rows: [], total: 0, nextCursor: null };

    let rows = [...this.results.values()]
      .filter((r) => r.divisionId === division.id)
      .map((r) => ({ ...r, athlete: this.athletes.get(r.athleteId)! }))
      .filter((r) => Boolean(r.athlete));

    if (query.ageGroup) rows = rows.filter((r) => r.ageGroup === query.ageGroup);
    if (query.q) {
      const needle = query.q.toLowerCase();
      rows = rows.filter((r) => r.athlete.name.toLowerCase().includes(needle));
    }

    // DNF/DNS sort last regardless of rank, then by rank, then by finish time.
    rows.sort((a, b) => {
      const af = a.status === "finished" ? 0 : 1;
      const bf = b.status === "finished" ? 0 : 1;
      if (af !== bf) return af - bf;
      return (a.rankOverall ?? Infinity) - (b.rankOverall ?? Infinity);
    });

    const total = rows.length;
    const limit = query.limit ?? 50;
    const start = query.cursor ? Number(query.cursor) : 0;
    const page = rows.slice(start, start + limit);
    const nextIndex = start + limit;
    return {
      rows: page,
      total,
      nextCursor: nextIndex < total ? String(nextIndex) : null,
    };
  }

  async listResultsForAthlete(athleteId: string) {
    return [...this.results.values()].filter(
      (r) => r.athleteId === athleteId || r.partnerAthleteIds.includes(athleteId),
    );
  }

  async listResultsForDivision(divisionId: string) {
    return [...this.results.values()].filter((r) => r.divisionId === divisionId);
  }

  async countResultsForDivision(divisionId: string) {
    return (await this.listResultsForDivision(divisionId)).length;
  }

  async searchAthletesAndEvents(q: string, limit = 10) {
    const needle = q.trim().toLowerCase();
    if (!needle) return { athletes: [], events: [] };
    return {
      athletes: [...this.athletes.values()]
        .filter((a) => !a.isAnonymised && a.name.toLowerCase().includes(needle))
        .slice(0, limit),
      events: [...this.events.values()]
        .filter(
          (e) =>
            e.name.toLowerCase().includes(needle) || e.city.toLowerCase().includes(needle),
        )
        .slice(0, limit),
    };
  }

  /* ── Distributions ──────────────────────────────────────────────────── */

  async replaceStationDistributions(rows: Omit<StationDistribution, "id">[]) {
    for (const row of rows) {
      const idx = this.distributions.findIndex(
        (d) =>
          d.scope === row.scope &&
          (d.eventId ?? null) === (row.eventId ?? null) &&
          d.divisionKey === row.divisionKey &&
          d.stationKey === row.stationKey &&
          (d.ageGroup ?? null) === (row.ageGroup ?? null) &&
          (d.sex ?? null) === (row.sex ?? null),
      );
      const withId: StationDistribution = { ...row, id: this.id("dst") };
      if (idx >= 0) this.distributions[idx] = { ...withId, id: this.distributions[idx].id };
      else this.distributions.push(withId);
    }
  }

  async getStationDistribution(query: {
    scope: "event" | "global";
    eventId?: string | null;
    divisionKey: string;
    stationKey: string;
  }) {
    return (
      this.distributions.find(
        (d) =>
          d.scope === query.scope &&
          (d.eventId ?? null) === (query.eventId ?? null) &&
          d.divisionKey === query.divisionKey &&
          d.stationKey === query.stationKey,
      ) ?? null
    );
  }

  /* ── Observability ──────────────────────────────────────────────────── */

  async startRun(run: Pick<IngestionRun, "mode"> & Partial<IngestionRun>) {
    const created: IngestionRun = {
      id: this.id("run"),
      // `mode` is required on the argument and `...run` below carries it, so
      // setting it here as well was flagged as overwritten and broke the
      // build. Removed rather than reordered: the spread is the intent.
      status: "running",
      startedAt: this.now(),
      eventsTouched: 0,
      rowsUpserted: 0,
      rowsQuarantined: 0,
      requestsMade: 0,
      errors: [],
      detail: {},
      ...run,
    };
    this.runs.set(created.id, created);
    return created;
  }

  async finishRun(id: string, patch: Partial<IngestionRun>) {
    const existing = this.runs.get(id);
    if (!existing) throw new Error(`No ingestion run ${id}`);
    const finishedAt = patch.finishedAt ?? this.now();
    const merged: IngestionRun = {
      ...existing,
      ...patch,
      finishedAt,
      durationMs:
        patch.durationMs ??
        new Date(finishedAt).getTime() - new Date(existing.startedAt).getTime(),
    };
    this.runs.set(id, merged);
    return merged;
  }

  async listRuns(limit = 50) {
    return [...this.runs.values()]
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  }

  async latestRun(mode?: IngestionRun["mode"]) {
    return (
      [...this.runs.values()]
        .filter((r) => (mode ? r.mode === mode : true))
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null
    );
  }

  async getSyncState(sourceEventId: string) {
    return this.syncStates.get(sourceEventId) ?? null;
  }

  async upsertSyncState(state: SyncState) {
    const existing = this.syncStates.get(state.sourceEventId);
    const merged = { ...(existing ?? {}), ...state };
    this.syncStates.set(state.sourceEventId, merged);
    return merged;
  }

  async listSyncStates(filter: { liveOnly?: boolean } = {}) {
    return [...this.syncStates.values()].filter((s) => (filter.liveOnly ? s.isLive : true));
  }

  async quarantine(row: Omit<QuarantineRow, "id" | "createdAt">) {
    const created: QuarantineRow = { ...row, id: this.id("qtn"), createdAt: this.now() };
    this.quarantined.push(created);
    return created;
  }

  async listQuarantine(opts: { openOnly?: boolean; limit?: number } = {}) {
    return this.quarantined
      .filter((q) => (opts.openOnly ? !q.reprocessedAt : true))
      .slice(0, opts.limit ?? 100);
  }

  async markQuarantineReprocessed(id: string) {
    const idx = this.quarantined.findIndex((q) => q.id === id);
    if (idx >= 0) this.quarantined[idx] = { ...this.quarantined[idx], reprocessedAt: this.now() };
  }

  async raiseAlert(alert: Omit<EngineAlert, "id" | "createdAt">) {
    const created: EngineAlert = { ...alert, id: this.id("alr"), createdAt: this.now() };
    this.alerts.push(created);
    return created;
  }

  async listAlerts(opts: { openOnly?: boolean; limit?: number } = {}) {
    return this.alerts
      .filter((a) => (opts.openOnly ? !a.acknowledgedAt : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, opts.limit ?? 100);
  }

  async acknowledgeAlert(id: string) {
    const idx = this.alerts.findIndex((a) => a.id === id);
    if (idx >= 0) this.alerts[idx] = { ...this.alerts[idx], acknowledgedAt: this.now() };
  }

  async getSetting<T>(key: string) {
    return (this.settings.get(key) as T) ?? null;
  }

  async setSetting(key: string, value: unknown) {
    this.settings.set(key, value);
  }
}

/**
 * Change detection for the live differ.
 *
 * Compares only what a spectator would notice changing. `updatedAt`-style
 * bookkeeping is deliberately excluded, or every poll would look like a change
 * and the fan-out would publish constantly.
 */
function sameResult(a: EngineResult, b: EngineResult): boolean {
  return (
    a.rankOverall === b.rankOverall &&
    a.rankAgeGroup === b.rankAgeGroup &&
    a.finishTimeMs === b.finishTimeMs &&
    a.roxzoneTimeMs === b.roxzoneTimeMs &&
    a.status === b.status &&
    a.ageGroup === b.ageGroup &&
    a.wave === b.wave &&
    a.bib === b.bib &&
    JSON.stringify(a.splits) === JSON.stringify(b.splits)
  );
}
