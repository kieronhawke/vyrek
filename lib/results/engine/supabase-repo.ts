/**
 * The production `ResultsRepository`, over Supabase Postgres.
 *
 * ⚠️ Unverified against a live database. The Supabase project was paused while
 * this was written — `iiezxhzbissemvsfytwl.supabase.co` does not resolve — so
 * this compiles and matches `0101_results_engine.sql` column for column, but no
 * query here has been executed. `ACTION-REQUIRED.md` step 2 is to restore the
 * project and run `scripts/verify-results-repo.mjs`, which exercises every
 * method against the real database and is the thing that turns this comment
 * into a green tick.
 *
 * The behavioural tests all run against `MemoryResultsRepository`, which
 * implements the same interface with the same semantics. That proves the
 * *engine*; this file is the part that still needs a database to prove.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/admin";
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

/* Row shapes: snake_case in the database, camelCase in the engine. The mapping
   lives here and nowhere else. */

type EventRow = {
  id: string; slug: string; name: string; city: string; country: string;
  country_iso: string; region: string; season: string; year: number;
  venue: string | null; status: EngineEventStatus; start_datetime: string | null;
  end_datetime: string | null; tz_offset_minutes: number; start_date: string | null;
  end_date: string | null; athlete_count: number; source_event_id: string | null;
  source_season_path: string | null; is_demo: boolean; last_synced_at: string | null;
};

const toEvent = (r: EventRow): EngineEvent => ({
  id: r.id, slug: r.slug, name: r.name, city: r.city, country: r.country,
  countryIso: r.country_iso, region: r.region, season: r.season, year: r.year,
  venue: r.venue, status: r.status, startDatetime: r.start_datetime,
  endDatetime: r.end_datetime, tzOffsetMinutes: r.tz_offset_minutes,
  startDate: r.start_date, endDate: r.end_date, athleteCount: r.athlete_count,
  sourceEventId: r.source_event_id, sourceSeasonPath: r.source_season_path,
  isDemo: r.is_demo, lastSyncedAt: r.last_synced_at,
});

const fromEvent = (e: UpsertEvent) => ({
  slug: e.slug, name: e.name, city: e.city, country: e.country,
  country_iso: e.countryIso, region: e.region, season: e.season, year: e.year,
  venue: e.venue ?? null, status: e.status, start_datetime: e.startDatetime ?? null,
  end_datetime: e.endDatetime ?? null, tz_offset_minutes: e.tzOffsetMinutes,
  start_date: e.startDate ?? null, end_date: e.endDate ?? null,
  athlete_count: e.athleteCount, source_event_id: e.sourceEventId ?? null,
  source_season_path: e.sourceSeasonPath ?? null, is_demo: e.isDemo,
  last_synced_at: e.lastSyncedAt ?? null,
});

type DivisionRow = {
  id: string; event_id: string; division_key: string; display_name: string;
  entrant_count: number; published_entrant_count: number | null;
  source_division_id: string | null;
};

const toDivision = (r: DivisionRow): EngineDivision => ({
  id: r.id, eventId: r.event_id, divisionKey: r.division_key,
  displayName: r.display_name, entrantCount: r.entrant_count,
  publishedEntrantCount: r.published_entrant_count,
  sourceDivisionId: r.source_division_id,
});

type AthleteRow = {
  id: string; slug: string; name: string; nationality: string | null;
  gender: string | null; source_athlete_id: string | null;
  claimed_by_user_id: string | null; is_demo: boolean; is_anonymised: boolean;
  identity_confidence: number; needs_identity_review: boolean;
};

const toAthlete = (r: AthleteRow): EngineAthlete => ({
  id: r.id, slug: r.slug, name: r.name, nationality: r.nationality,
  gender: r.gender, sourceAthleteId: r.source_athlete_id,
  claimedByUserId: r.claimed_by_user_id, isDemo: r.is_demo,
  isAnonymised: r.is_anonymised, identityConfidence: r.identity_confidence,
  needsIdentityReview: r.needs_identity_review,
});

type ResultRow = {
  id: string; event_id: string; division_id: string; athlete_id: string;
  source_result_id: string; rank_overall: number | null; rank_age_group: number | null;
  age_group: string | null; sex: string | null; finish_time_ms: number | null;
  roxzone_time_ms: number | null; status: EngineResult["status"]; wave: string | null;
  bib: string | null; splits: EngineResult["splits"]; partner_athlete_ids: string[];
  is_demo: boolean;
};

const toResult = (r: ResultRow): EngineResult => ({
  id: r.id, eventId: r.event_id, divisionId: r.division_id, athleteId: r.athlete_id,
  sourceResultId: r.source_result_id, rankOverall: r.rank_overall,
  rankAgeGroup: r.rank_age_group, ageGroup: r.age_group, sex: r.sex,
  finishTimeMs: r.finish_time_ms, roxzoneTimeMs: r.roxzone_time_ms, status: r.status,
  wave: r.wave, bib: r.bib, splits: r.splits ?? { runs: [], stations: [] },
  partnerAthleteIds: r.partner_athlete_ids ?? [], isDemo: r.is_demo,
});

const fromResult = (r: UpsertResult) => ({
  event_id: r.eventId, division_id: r.divisionId, athlete_id: r.athleteId,
  source_result_id: r.sourceResultId, rank_overall: r.rankOverall ?? null,
  rank_age_group: r.rankAgeGroup ?? null, age_group: r.ageGroup ?? null,
  sex: r.sex ?? null, finish_time_ms: r.finishTimeMs ?? null,
  roxzone_time_ms: r.roxzoneTimeMs ?? null, status: r.status, wave: r.wave ?? null,
  bib: r.bib ?? null, splits: r.splits, partner_athlete_ids: r.partnerAthleteIds,
  is_demo: r.isDemo,
});

export class SupabaseResultsRepository implements ResultsRepository {
  constructor(private db: SupabaseClient = supabaseAdmin()) {}

  private async one<T>(query: PromiseLike<{ data: unknown; error: unknown }>): Promise<T | null> {
    const { data, error } = await query;
    if (error) throw error;
    return (data as T) ?? null;
  }

  private async many<T>(query: PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
    const { data, error } = await query;
    if (error) throw error;
    return (data as T[]) ?? [];
  }

  /* ── Events ───────────────────────────────────────────────────────── */

  async upsertEvent(event: UpsertEvent): Promise<EngineEvent> {
    const row = await this.one<EventRow>(
      this.db
        .from("results_events")
        .upsert(fromEvent(event), { onConflict: "slug" })
        .select()
        .single(),
    );
    if (!row) throw new Error(`Failed to upsert event ${event.slug}`);
    return toEvent(row);
  }

  async getEventBySlug(slug: string) {
    const row = await this.one<EventRow>(
      this.db.from("results_events").select().eq("slug", slug).maybeSingle(),
    );
    return row ? toEvent(row) : null;
  }

  async getEventBySourceId(sourceEventId: string) {
    const row = await this.one<EventRow>(
      this.db.from("results_events").select().eq("source_event_id", sourceEventId).maybeSingle(),
    );
    return row ? toEvent(row) : null;
  }

  async listEvents(filter: { season?: string; region?: string; status?: EngineEventStatus } = {}) {
    let query = this.db.from("results_events").select().order("start_date", { ascending: false });
    if (filter.season) query = query.eq("season", filter.season);
    if (filter.region) query = query.eq("region", filter.region);
    if (filter.status) query = query.eq("status", filter.status);
    return (await this.many<EventRow>(query)).map(toEvent);
  }

  async setEventStatus(eventId: string, status: EngineEventStatus) {
    const { error } = await this.db
      .from("results_events")
      .update({ status })
      .eq("id", eventId);
    if (error) throw error;
  }

  async upsertDivision(division: UpsertDivision): Promise<EngineDivision> {
    const row = await this.one<DivisionRow>(
      this.db
        .from("results_divisions")
        .upsert(
          {
            event_id: division.eventId,
            division_key: division.divisionKey,
            display_name: division.displayName,
            entrant_count: division.entrantCount,
            published_entrant_count: division.publishedEntrantCount ?? null,
            source_division_id: division.sourceDivisionId ?? null,
          },
          { onConflict: "event_id,division_key" },
        )
        .select()
        .single(),
    );
    if (!row) throw new Error(`Failed to upsert division ${division.divisionKey}`);
    return toDivision(row);
  }

  async listDivisions(eventId: string) {
    return (
      await this.many<DivisionRow>(
        this.db.from("results_divisions").select().eq("event_id", eventId),
      )
    ).map(toDivision);
  }

  /* ── Athletes ─────────────────────────────────────────────────────── */

  async upsertAthlete(athlete: UpsertAthlete): Promise<EngineAthlete> {
    const row = await this.one<AthleteRow>(
      this.db
        .from("results_athletes")
        .upsert(
          {
            slug: athlete.slug,
            name: athlete.name,
            nationality: athlete.nationality ?? null,
            gender: athlete.gender ?? null,
            source_athlete_id: athlete.sourceAthleteId ?? null,
            claimed_by_user_id: athlete.claimedByUserId ?? null,
            is_demo: athlete.isDemo,
            is_anonymised: athlete.isAnonymised,
            identity_confidence: athlete.identityConfidence,
            needs_identity_review: athlete.needsIdentityReview,
          },
          { onConflict: "slug" },
        )
        .select()
        .single(),
    );
    if (!row) throw new Error(`Failed to upsert athlete ${athlete.slug}`);
    return toAthlete(row);
  }

  async getAthleteById(id: string) {
    const row = await this.one<AthleteRow>(
      this.db.from("results_athletes").select().eq("id", id).maybeSingle(),
    );
    return row ? toAthlete(row) : null;
  }

  async getAthleteBySlug(slug: string) {
    const row = await this.one<AthleteRow>(
      this.db
        .from("results_athletes")
        .select()
        .eq("slug", slug)
        .eq("is_anonymised", false)
        .maybeSingle(),
    );
    return row ? toAthlete(row) : null;
  }

  async getAthleteBySourceId(sourceAthleteId: string) {
    const row = await this.one<AthleteRow>(
      this.db
        .from("results_athletes")
        .select()
        .eq("source_athlete_id", sourceAthleteId)
        .maybeSingle(),
    );
    return row ? toAthlete(row) : null;
  }

  async findAthletesByName(name: string) {
    return (
      await this.many<AthleteRow>(
        this.db
          .from("results_athletes")
          .select()
          .ilike("name", name)
          .eq("is_anonymised", false)
          .limit(25),
      )
    ).map(toAthlete);
  }

  async anonymiseAthlete(athleteId: string) {
    // The SQL function, not an update here: erasure logic lives in one place
    // and is auditable as a single migration.
    const { error } = await this.db.rpc("results_anonymise_athlete", { target: athleteId });
    if (error) throw error;
  }

  async claimAthlete(athleteId: string, userId: string) {
    const { error } = await this.db
      .from("results_athletes")
      .update({ claimed_by_user_id: userId })
      .eq("id", athleteId);
    if (error) throw error;
  }

  async recordMergeReview(review: Omit<AthleteMergeReview, "id" | "createdAt">) {
    const row = await this.one<{
      id: string; athlete_id: string; candidate_athlete_id: string;
      confidence: number; signals: Record<string, unknown>;
      resolution: string | null; resolved_at: string | null; created_at: string;
    }>(
      this.db
        .from("results_athlete_merge_reviews")
        .insert({
          athlete_id: review.athleteId,
          candidate_athlete_id: review.candidateAthleteId,
          confidence: review.confidence,
          signals: review.signals,
        })
        .select()
        .single(),
    );
    if (!row) throw new Error("Failed to record merge review");
    return {
      id: row.id, athleteId: row.athlete_id, candidateAthleteId: row.candidate_athlete_id,
      confidence: row.confidence, signals: row.signals,
      resolution: row.resolution as AthleteMergeReview["resolution"],
      resolvedAt: row.resolved_at, createdAt: row.created_at,
    };
  }

  async listMergeReviews(opts: { unresolvedOnly?: boolean } = {}) {
    let query = this.db
      .from("results_athlete_merge_reviews")
      .select()
      .order("created_at", { ascending: false });
    if (opts.unresolvedOnly) query = query.is("resolution", null);
    return (
      await this.many<{
        id: string; athlete_id: string; candidate_athlete_id: string;
        confidence: number; signals: Record<string, unknown>;
        resolution: string | null; resolved_at: string | null; created_at: string;
      }>(query)
    ).map((row) => ({
      id: row.id, athleteId: row.athlete_id, candidateAthleteId: row.candidate_athlete_id,
      confidence: row.confidence, signals: row.signals,
      resolution: row.resolution as AthleteMergeReview["resolution"],
      resolvedAt: row.resolved_at, createdAt: row.created_at,
    }));
  }

  /* ── Results ──────────────────────────────────────────────────────── */

  /**
   * Idempotent on `source_result_id`.
   *
   * Reads the existing rows first so the return value can distinguish inserted
   * from updated from unchanged — the live differ publishes on that, and an
   * upsert alone cannot tell you which of the three happened.
   */
  async upsertResults(rows: UpsertResult[]) {
    if (rows.length === 0) return { inserted: 0, updated: 0, unchanged: 0 };

    const ids = rows.map((r) => r.sourceResultId);
    const existing = await this.many<ResultRow>(
      this.db.from("results_results").select().in("source_result_id", ids),
    );
    const before = new Map(existing.map((r) => [r.source_result_id, toResult(r)]));

    const changed: UpsertResult[] = [];
    let inserted = 0;
    let updated = 0;
    let unchanged = 0;

    for (const row of rows) {
      const prior = before.get(row.sourceResultId);
      if (!prior) {
        inserted += 1;
        changed.push(row);
      } else if (materiallyDifferent(prior, row)) {
        updated += 1;
        changed.push(row);
      } else {
        unchanged += 1;
      }
    }

    if (changed.length > 0) {
      const { error } = await this.db
        .from("results_results")
        .upsert(changed.map(fromResult), { onConflict: "source_result_id" });
      if (error) throw error;
    }

    return { inserted, updated, unchanged };
  }

  async getResultById(id: string) {
    const row = await this.one<ResultRow>(
      this.db.from("results_results").select().eq("id", id).maybeSingle(),
    );
    return row ? toResult(row) : null;
  }

  async getResultBySourceId(sourceResultId: string) {
    const row = await this.one<ResultRow>(
      this.db
        .from("results_results")
        .select()
        .eq("source_result_id", sourceResultId)
        .maybeSingle(),
    );
    return row ? toResult(row) : null;
  }

  async getRanking(query: RankingQuery): Promise<RankingResultPage> {
    const event = await this.getEventBySlug(query.eventSlug);
    if (!event) return { rows: [], total: 0, nextCursor: null };
    const division = (await this.listDivisions(event.id)).find(
      (d) => d.divisionKey === query.divisionKey,
    );
    if (!division) return { rows: [], total: 0, nextCursor: null };

    const limit = query.limit ?? 50;
    const offset = query.cursor ? Number(query.cursor) : 0;

    let q = this.db
      .from("results_results")
      .select("*, athlete:results_athletes!inner(*)", { count: "exact" })
      .eq("division_id", division.id)
      .order("rank_overall", { ascending: true, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (query.ageGroup) q = q.eq("age_group", query.ageGroup);
    if (query.q) q = q.ilike("results_athletes.name", `%${query.q}%`);

    const { data, error, count } = await q;
    if (error) throw error;

    const rows = ((data ?? []) as (ResultRow & { athlete: AthleteRow })[]).map((r) => ({
      ...toResult(r),
      athlete: toAthlete(r.athlete),
    }));

    const total = count ?? rows.length;
    const next = offset + limit;
    return { rows, total, nextCursor: next < total ? String(next) : null };
  }

  async listResultsForAthlete(athleteId: string) {
    const own = await this.many<ResultRow>(
      this.db.from("results_results").select().eq("athlete_id", athleteId),
    );
    const partnered = await this.many<ResultRow>(
      this.db.from("results_results").select().contains("partner_athlete_ids", [athleteId]),
    );
    const byId = new Map([...own, ...partnered].map((r) => [r.id, r]));
    return [...byId.values()].map(toResult);
  }

  async listResultsForDivision(divisionId: string) {
    return (
      await this.many<ResultRow>(
        this.db.from("results_results").select().eq("division_id", divisionId),
      )
    ).map(toResult);
  }

  async countResultsForDivision(divisionId: string) {
    const { count, error } = await this.db
      .from("results_results")
      .select("id", { count: "exact", head: true })
      .eq("division_id", divisionId);
    if (error) throw error;
    return count ?? 0;
  }

  /** One column. See the interface docstring for why this is not a map(). */
  async listFinishTimesForDivision(divisionId: string) {
    const rows = await this.many<{ finish_time_ms: number | null }>(
      this.db
        .from("results_results")
        .select("finish_time_ms")
        .eq("division_id", divisionId)
        .eq("status", "finished")
        .order("finish_time_ms", { ascending: true }),
    );
    return rows
      .map((r) => r.finish_time_ms)
      .filter((v): v is number => typeof v === "number")
      .map((ms) => Math.round(ms / 1000));
  }

  async searchAthletesAndEvents(q: string, limit = 10) {
    const athletes = (
      await this.many<AthleteRow>(
        this.db
          .from("results_athletes")
          .select()
          .ilike("name", `%${q}%`)
          .eq("is_anonymised", false)
          .limit(limit),
      )
    ).map(toAthlete);

    const events = (
      await this.many<EventRow>(
        this.db
          .from("results_events")
          .select()
          .or(`name.ilike.%${q}%,city.ilike.%${q}%`)
          .limit(limit),
      )
    ).map(toEvent);

    return { athletes, events };
  }

  /* ── Distributions ────────────────────────────────────────────────── */

  async replaceStationDistributions(rows: Omit<StationDistribution, "id">[]) {
    if (rows.length === 0) return;
    const { error } = await this.db.from("results_station_distributions").upsert(
      rows.map((r) => ({
        scope: r.scope,
        event_id: r.eventId ?? null,
        division_key: r.divisionKey,
        station_key: r.stationKey,
        age_group: r.ageGroup ?? null,
        sex: r.sex ?? null,
        sample_count: r.sampleCount,
        median_ms: r.medianMs ?? null,
        mean_ms: r.meanMs ?? null,
        percentiles: r.percentiles,
        computed_at: r.computedAt,
      })),
      { onConflict: "scope,event_id,division_key,station_key,age_group,sex" },
    );
    if (error) throw error;
  }

  async getStationDistribution(query: {
    scope: "event" | "global";
    eventId?: string | null;
    divisionKey: string;
    stationKey: string;
  }) {
    let q = this.db
      .from("results_station_distributions")
      .select()
      .eq("scope", query.scope)
      .eq("division_key", query.divisionKey)
      .eq("station_key", query.stationKey);
    q = query.eventId ? q.eq("event_id", query.eventId) : q.is("event_id", null);

    const row = await this.one<{
      id: string; scope: "event" | "global"; event_id: string | null;
      division_key: string; station_key: string; age_group: string | null;
      sex: string | null; sample_count: number; median_ms: number | null;
      mean_ms: number | null; percentiles: Record<string, number>; computed_at: string;
    }>(q.maybeSingle());

    return row
      ? {
          id: row.id, scope: row.scope, eventId: row.event_id,
          divisionKey: row.division_key, stationKey: row.station_key,
          ageGroup: row.age_group, sex: row.sex, sampleCount: row.sample_count,
          medianMs: row.median_ms, meanMs: row.mean_ms,
          percentiles: row.percentiles, computedAt: row.computed_at,
        }
      : null;
  }

  /* ── Observability ────────────────────────────────────────────────── */

  async startRun(run: Pick<IngestionRun, "mode"> & Partial<IngestionRun>) {
    const row = await this.one<Record<string, unknown>>(
      this.db
        .from("results_ingestion_runs")
        .insert({ mode: run.mode, status: "running", trigger_source: run.triggerSource ?? null })
        .select()
        .single(),
    );
    if (!row) throw new Error("Failed to start ingestion run");
    return toRun(row);
  }

  async finishRun(id: string, patch: Partial<IngestionRun>) {
    const row = await this.one<Record<string, unknown>>(
      this.db
        .from("results_ingestion_runs")
        .update({
          status: patch.status ?? "ok",
          finished_at: patch.finishedAt ?? new Date().toISOString(),
          events_touched: patch.eventsTouched ?? 0,
          rows_upserted: patch.rowsUpserted ?? 0,
          rows_quarantined: patch.rowsQuarantined ?? 0,
          requests_made: patch.requestsMade ?? 0,
          errors: patch.errors ?? [],
          detail: patch.detail ?? {},
        })
        .eq("id", id)
        .select()
        .single(),
    );
    if (!row) throw new Error(`Failed to finish ingestion run ${id}`);
    return toRun(row);
  }

  async listRuns(limit = 50) {
    return (
      await this.many<Record<string, unknown>>(
        this.db
          .from("results_ingestion_runs")
          .select()
          .order("started_at", { ascending: false })
          .limit(limit),
      )
    ).map(toRun);
  }

  async latestRun(mode?: IngestionRun["mode"]) {
    let q = this.db
      .from("results_ingestion_runs")
      .select()
      .order("started_at", { ascending: false })
      .limit(1);
    if (mode) q = q.eq("mode", mode);
    const rows = await this.many<Record<string, unknown>>(q);
    return rows[0] ? toRun(rows[0]) : null;
  }

  async getSyncState(sourceEventId: string) {
    const row = await this.one<Record<string, unknown>>(
      this.db
        .from("results_sync_state")
        .select()
        .eq("source_event_id", sourceEventId)
        .maybeSingle(),
    );
    return row ? toSyncState(row) : null;
  }

  async upsertSyncState(state: SyncState) {
    const row = await this.one<Record<string, unknown>>(
      this.db
        .from("results_sync_state")
        .upsert(
          {
            source_event_id: state.sourceEventId,
            event_id: state.eventId ?? null,
            last_seen_hash: state.lastSeenHash ?? null,
            last_polled_at: state.lastPolledAt ?? null,
            last_success_at: state.lastSuccessAt ?? null,
            is_live: state.isLive,
            live_armed_at: state.liveArmedAt ?? null,
            live_interval_seconds: state.liveIntervalSeconds,
            consecutive_failures: state.consecutiveFailures,
            updates_paused: state.updatesPaused,
            reconcile_until: state.reconcileUntil ?? null,
            reconcile_attempts: state.reconcileAttempts,
          },
          { onConflict: "source_event_id" },
        )
        .select()
        .single(),
    );
    if (!row) throw new Error(`Failed to upsert sync state ${state.sourceEventId}`);
    return toSyncState(row);
  }

  async listSyncStates(filter: { liveOnly?: boolean } = {}) {
    let q = this.db.from("results_sync_state").select();
    if (filter.liveOnly) q = q.eq("is_live", true);
    return (await this.many<Record<string, unknown>>(q)).map(toSyncState);
  }

  async quarantine(row: Omit<QuarantineRow, "id" | "createdAt">) {
    const created = await this.one<Record<string, unknown>>(
      this.db
        .from("results_quarantine")
        .insert({
          source_event_id: row.sourceEventId ?? null,
          source_division_id: row.sourceDivisionId ?? null,
          source_result_id: row.sourceResultId ?? null,
          reason: row.reason,
          detail: row.detail,
          raw_payload: row.rawPayload ?? null,
          ingestion_run_id: row.ingestionRunId ?? null,
        })
        .select()
        .single(),
    );
    if (!created) throw new Error("Failed to quarantine row");
    return toQuarantine(created);
  }

  async listQuarantine(opts: { openOnly?: boolean; limit?: number } = {}) {
    let q = this.db
      .from("results_quarantine")
      .select()
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 100);
    if (opts.openOnly) q = q.is("reprocessed_at", null);
    return (await this.many<Record<string, unknown>>(q)).map(toQuarantine);
  }

  async markQuarantineReprocessed(id: string) {
    const { error } = await this.db
      .from("results_quarantine")
      .update({ reprocessed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  }

  async raiseAlert(alert: Omit<EngineAlert, "id" | "createdAt">) {
    const row = await this.one<Record<string, unknown>>(
      this.db
        .from("results_alerts")
        .insert({
          kind: alert.kind,
          severity: alert.severity,
          message: alert.message,
          detail: alert.detail,
          source_event_id: alert.sourceEventId ?? null,
        })
        .select()
        .single(),
    );
    if (!row) throw new Error("Failed to raise alert");
    return toAlert(row);
  }

  async listAlerts(opts: { openOnly?: boolean; limit?: number } = {}) {
    let q = this.db
      .from("results_alerts")
      .select()
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 100);
    if (opts.openOnly) q = q.is("acknowledged_at", null);
    return (await this.many<Record<string, unknown>>(q)).map(toAlert);
  }

  async acknowledgeAlert(id: string) {
    const { error } = await this.db
      .from("results_alerts")
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  }

  async getSetting<T>(key: string) {
    const row = await this.one<{ value: T }>(
      this.db.from("results_engine_settings").select("value").eq("key", key).maybeSingle(),
    );
    return row?.value ?? null;
  }

  async setSetting(key: string, value: unknown, updatedBy?: string) {
    const { error } = await this.db.from("results_engine_settings").upsert(
      { key, value, updated_by: updatedBy ?? null, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    if (error) throw error;
  }
}

function toRun(row: Record<string, unknown>): IngestionRun {
  return {
    id: row.id as string,
    mode: row.mode as IngestionRun["mode"],
    status: row.status as IngestionRun["status"],
    startedAt: row.started_at as string,
    finishedAt: (row.finished_at as string) ?? null,
    durationMs: (row.duration_ms as number) ?? null,
    eventsTouched: (row.events_touched as number) ?? 0,
    rowsUpserted: (row.rows_upserted as number) ?? 0,
    rowsQuarantined: (row.rows_quarantined as number) ?? 0,
    requestsMade: (row.requests_made as number) ?? 0,
    errors: (row.errors as IngestionRun["errors"]) ?? [],
    detail: (row.detail as Record<string, unknown>) ?? {},
    triggerSource: (row.trigger_source as string) ?? null,
  };
}

function toSyncState(row: Record<string, unknown>): SyncState {
  return {
    sourceEventId: row.source_event_id as string,
    eventId: (row.event_id as string) ?? null,
    lastSeenHash: (row.last_seen_hash as string) ?? null,
    lastPolledAt: (row.last_polled_at as string) ?? null,
    lastSuccessAt: (row.last_success_at as string) ?? null,
    isLive: Boolean(row.is_live),
    liveArmedAt: (row.live_armed_at as string) ?? null,
    liveIntervalSeconds: (row.live_interval_seconds as number) ?? 20,
    consecutiveFailures: (row.consecutive_failures as number) ?? 0,
    updatesPaused: Boolean(row.updates_paused),
    reconcileUntil: (row.reconcile_until as string) ?? null,
    reconcileAttempts: (row.reconcile_attempts as number) ?? 0,
  };
}

function toQuarantine(row: Record<string, unknown>): QuarantineRow {
  return {
    id: row.id as string,
    sourceEventId: (row.source_event_id as string) ?? null,
    sourceDivisionId: (row.source_division_id as string) ?? null,
    sourceResultId: (row.source_result_id as string) ?? null,
    reason: row.reason as string,
    detail: (row.detail as Record<string, unknown>) ?? {},
    rawPayload: row.raw_payload,
    ingestionRunId: (row.ingestion_run_id as string) ?? null,
    reprocessedAt: (row.reprocessed_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

function toAlert(row: Record<string, unknown>): EngineAlert {
  return {
    id: row.id as string,
    kind: row.kind as EngineAlert["kind"],
    severity: row.severity as EngineAlert["severity"],
    message: row.message as string,
    detail: (row.detail as Record<string, unknown>) ?? {},
    sourceEventId: (row.source_event_id as string) ?? null,
    acknowledgedAt: (row.acknowledged_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

/** Same comparison the memory repo uses, for the same reason. */
function materiallyDifferent(prior: EngineResult, next: UpsertResult): boolean {
  return (
    prior.rankOverall !== (next.rankOverall ?? null) ||
    prior.rankAgeGroup !== (next.rankAgeGroup ?? null) ||
    prior.finishTimeMs !== (next.finishTimeMs ?? null) ||
    prior.roxzoneTimeMs !== (next.roxzoneTimeMs ?? null) ||
    prior.status !== next.status ||
    prior.ageGroup !== (next.ageGroup ?? null) ||
    prior.wave !== (next.wave ?? null) ||
    prior.bib !== (next.bib ?? null) ||
    JSON.stringify(prior.splits) !== JSON.stringify(next.splits)
  );
}
