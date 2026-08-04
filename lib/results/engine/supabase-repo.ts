/**
 * The production `ResultsRepository`, over Supabase Postgres.
 *
 * Connects through `supabase-client.ts`, which points at the **results**
 * project rather than the application's — see that file for why they are
 * separate.
 *
 * The behavioural tests run against `MemoryResultsRepository`, which implements
 * the same interface with the same semantics; `scripts/verify-results-repo.mjs`
 * exercises this implementation against the real database.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { resultsSupabase } from "./supabase-client";
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
  source_event_ids: string[] | null;
  source_season_path: string | null; is_demo: boolean; last_synced_at: string | null;
};

const toEvent = (r: EventRow): EngineEvent => ({
  id: r.id, slug: r.slug, name: r.name, city: r.city, country: r.country,
  countryIso: r.country_iso, region: r.region, season: r.season, year: r.year,
  venue: r.venue, status: r.status, startDatetime: r.start_datetime,
  endDatetime: r.end_datetime, tzOffsetMinutes: r.tz_offset_minutes,
  startDate: r.start_date, endDate: r.end_date, athleteCount: r.athlete_count,
  sourceEventId: r.source_event_id, sourceEventIds: r.source_event_ids ?? [],
  sourceSeasonPath: r.source_season_path,
  isDemo: r.is_demo, lastSyncedAt: r.last_synced_at,
});

const fromEvent = (e: UpsertEvent) => ({
  slug: e.slug, name: e.name, city: e.city, country: e.country,
  country_iso: e.countryIso, region: e.region, season: e.season, year: e.year,
  venue: e.venue ?? null, status: e.status, start_datetime: e.startDatetime ?? null,
  end_datetime: e.endDatetime ?? null, tz_offset_minutes: e.tzOffsetMinutes,
  start_date: e.startDate ?? null, end_date: e.endDate ?? null,
  athlete_count: e.athleteCount, source_event_id: e.sourceEventId ?? null,
  source_event_ids: e.sourceEventIds ?? (e.sourceEventId ? [e.sourceEventId] : []),
  source_season_path: e.sourceSeasonPath ?? null, is_demo: e.isDemo,
  last_synced_at: e.lastSyncedAt ?? null,
});

type DivisionRow = {
  id: string; event_id: string; division_key: string; display_name: string;
  entrant_count: number; published_entrant_count: number | null;
  source_division_id: string | null; last_seen_hash: string | null;
  last_synced_at: string | null;
};

const toDivision = (r: DivisionRow): EngineDivision => ({
  id: r.id, eventId: r.event_id, divisionKey: r.division_key,
  displayName: r.display_name, entrantCount: r.entrant_count,
  publishedEntrantCount: r.published_entrant_count,
  sourceDivisionId: r.source_division_id,
  lastSeenHash: r.last_seen_hash,
  lastSyncedAt: r.last_synced_at,
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

/**
 * Supabase rejects with a `PostgrestError`-shaped **object**, not an `Error`.
 *
 * Thrown as-is it fails `instanceof Error`, stringifies to "[object Object]",
 * and every layer above reports a useless message — which is exactly what
 * production showed: a 500 reading `{"error":"[object Object]"}` for what was
 * really a paused database. Every error out of this file is a real `Error`
 * carrying the message, code, details and hint.
 */
export function toRepositoryError(error: unknown, context: string): Error {
  if (error instanceof Error) {
    error.message = `${context}: ${error.message}`;
    return error;
  }
  const e = (error ?? {}) as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  };
  const parts = [
    e.message ?? "unknown database error",
    e.code ? `code=${e.code}` : null,
    e.details ?? null,
    e.hint ?? null,
  ].filter(Boolean);
  const wrapped = new Error(`${context}: ${parts.join(" · ")}`);
  wrapped.name = "RepositoryError";
  return wrapped;
}

/**
 * Athletes written per statement.
 *
 * Halved from 200 after the trigram index on `name` made each write ten times
 * more expensive and 200-row batches began timing out. `upsertAthletes` halves
 * again on a timeout, so this is a starting point rather than a limit.
 */
const ATHLETE_BATCH = 100;

/** Results written per statement. Halved further on a timeout. */
const RESULT_BATCH = 200;

/**
 * Upsert in batches, halving any batch that runs out of time.
 *
 * ⚠️ Two separate lessons live here.
 *
 * The first is that a batch has to be bounded at all: `upsertResults` sent
 * every changed row of a division in one statement, which for Rotterdam's open
 * men is 2,721 rows each carrying a `splits` JSONB blob of eighteen segments.
 *
 * The second is that no fixed bound is right. Writing an indexed column costs
 * roughly ten times what writing an unindexed one does — measured on
 * `results_athletes.name` after the trigram index landed, 1,030ms against
 * 102ms per 200 rows — so a size chosen against an idle database fails against
 * a loaded one. Halving on timeout adapts instead of guessing, down to a single
 * row before it gives up.
 *
 * Anything that is not a timeout (57014) is a real error and is rethrown at
 * once, so a bad row is not retried sixty-four times on its way to failing.
 */
async function upsertInBatches<T>(
  rows: T[],
  size: number,
  write: (batch: T[]) => PromiseLike<{ error: unknown }>,
  context: string,
): Promise<void> {
  const run = async (batch: T[]): Promise<void> => {
    if (batch.length === 0) return;
    const { error } = await write(batch);
    if (!error) return;

    const timedOut = (error as { code?: string }).code === "57014";
    if (!timedOut || batch.length === 1) throw toRepositoryError(error, context);

    const half = Math.ceil(batch.length / 2);
    await run(batch.slice(0, half));
    await run(batch.slice(half));
  };

  for (let i = 0; i < rows.length; i += size) await run(rows.slice(i, i + size));
}

export class SupabaseResultsRepository implements ResultsRepository {
  constructor(private db: SupabaseClient = resultsSupabase()) {}

  private async one<T>(query: PromiseLike<{ data: unknown; error: unknown }>): Promise<T | null> {
    const { data, error } = await query;
    if (error) throw toRepositoryError(error, "results query failed");
    return (data as T) ?? null;
  }

  /** One request. Correct only where the caller has bounded the result itself. */
  private async many<T>(query: PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
    const { data, error } = await query;
    if (error) throw toRepositoryError(error, "results query failed");
    return (data as T[]) ?? [];
  }

  /**
   * Every matching row, not the first page of them.
   *
   * ⚠️ PostgREST caps an unbounded response at `max-rows` — 1,000 on Supabase —
   * and says nothing about having done so. A truncated read is indistinguishable
   * from a small table, which is the worst failure available to a store whose
   * whole job is to be complete.
   *
   * It was wrong in both directions and silent in both. `listAllDivisions` saw
   * 1,000 of 2,692, so the backfill could not see a third of its own work. And
   * division reads stopped at 1,000 rows, so `entrantCount` for every large
   * board was written as exactly 1,000 — which is what the completeness alerts
   * were reporting ("stored 1000 against a published 1620"). They were right,
   * and they were describing our own read, not the source.
   *
   * ⚠️ Takes a *factory*, not a query. A PostgREST builder cannot be re-ranged
   * and re-awaited: calling `.range()` on one that has already run yields the
   * same first page again, so paging over a single builder never terminates.
   * The factory produces a fresh builder per page, which is the only way this
   * is safe.
   */
  private async manyAll<T>(
    build: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
  ): Promise<T[]> {
    const PAGE = 1000;
    // 500 pages is half a million rows from one division — far past anything
    // real, and a bound is what stops a paging bug becoming a hung request.
    const MAX_PAGES = 500;
    const out: T[] = [];

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const from = page * PAGE;
      const { data, error } = await build(from, from + PAGE - 1);
      if (error) throw toRepositoryError(error, "results query failed");
      const rows = (data as T[]) ?? [];
      out.push(...rows);
      if (rows.length < PAGE) return out;
    }

    return out;
  }

  /* ── Events ───────────────────────────────────────────────────────── */

  /**
   * Upsert an event, keyed on the source id first and the slug second.
   *
   * ⚠️ Both columns are unique, and they can disagree. `source_event_id` is the
   * timing provider's stable weekend id; `slug` is derived from the label,
   * which is not stable — the same weekend catalogued from a different season
   * page can produce a different city and therefore a different slug.
   *
   * Upserting on `slug` alone then crashed the whole season sync on a duplicate
   * `source_event_id`, which is how one relabelled event took down an entire
   * backfill run. Found by running a real backfill, not by any test.
   *
   * The source id wins because it is the thing that cannot change. A slug can
   * be corrected; an identity cannot be guessed.
   */
  async upsertEvent(event: UpsertEvent): Promise<EngineEvent> {
    // Slug first: season, year and city are what an athlete means by "the
    // event". A weekend id identifies one race *day* within it, so several
    // belong to one event and none can be the key.
    const existing =
      (await this.getEventBySlug(event.slug)) ??
      (event.sourceEventId ? await this.getEventBySourceId(event.sourceEventId) : null);

    if (existing) {
      const ids = new Set([
        ...(existing.sourceEventIds ?? []),
        ...(event.sourceEventIds ?? []),
        ...(event.sourceEventId ? [event.sourceEventId] : []),
      ]);
      const row = await this.one<EventRow>(
        this.db
          .from("results_events")
          .update({
            ...fromEvent(event),
            // Widened, never narrowed: a later sync that saw only Sunday must
            // not erase Saturday.
            source_event_ids: [...ids],
            source_event_id: existing.sourceEventId ?? event.sourceEventId ?? null,
          })
          .eq("id", existing.id)
          .select()
          .single(),
      );
      if (!row) throw new Error(`Failed to update event ${event.slug}`);
      return toEvent(row);
    }

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
    const rows = await this.many<EventRow>(
      this.db.from("results_events").select().contains("source_event_ids", [sourceEventId]).limit(1),
    );
    return rows[0] ? toEvent(rows[0]) : null;
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
    if (error) throw toRepositoryError(error, "results write failed");
  }

  /**
   * Divisions carry the same hazard: `source_division_id` is unique, and so is
   * `(event_id, division_key)`. A division that moves between events — which a
   * relabelled weekend can cause — would collide the same way.
   */
  async upsertDivision(division: UpsertDivision): Promise<EngineDivision> {
    if (division.sourceDivisionId) {
      const found = await this.one<DivisionRow>(
        this.db
          .from("results_divisions")
          .select()
          .eq("source_division_id", division.sourceDivisionId)
          .maybeSingle(),
      );
      if (found) {
        const updated = await this.one<DivisionRow>(
          this.db
            .from("results_divisions")
            .update({
              event_id: division.eventId,
              division_key: division.divisionKey,
              display_name: division.displayName,
              entrant_count: division.entrantCount,
              published_entrant_count: division.publishedEntrantCount ?? null,
              last_seen_hash: division.lastSeenHash ?? null,
              last_synced_at: division.lastSyncedAt ?? null,
            })
            .eq("id", found.id)
            .select()
            .single(),
        );
        if (!updated) throw new Error(`Failed to update division ${division.divisionKey}`);
        return toDivision(updated);
      }
    }

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
            last_seen_hash: division.lastSeenHash ?? null,
            last_synced_at: division.lastSyncedAt ?? null,
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

  async listAllDivisions() {
    const out: DivisionRow[] = [];
    for (let from = 0; ; from += 1000) {
      const page = await this.many<DivisionRow>(
        this.db.from("results_divisions").select().range(from, from + 999),
      );
      out.push(...page);
      if (page.length < 1000) break;
    }
    return out.map(toDivision);
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

  async getAthletesBySourceIds(sourceAthleteIds: string[]) {
    if (sourceAthleteIds.length === 0) return [];
    const found: AthleteRow[] = [];
    // Chunked: a very long `in` list makes an unwieldy URL and PostgREST will
    // refuse it. 200 keeps the request comfortable and still turns a division
    // into two or three round trips rather than hundreds.
    for (let i = 0; i < sourceAthleteIds.length; i += 200) {
      found.push(
        ...(await this.many<AthleteRow>(
          this.db
            .from("results_athletes")
            .select()
            .in("source_athlete_id", sourceAthleteIds.slice(i, i + 200)),
        )),
      );
    }
    return found.map(toAthlete);
  }

  async findTakenSlugs(slugs: string[]) {
    const taken = new Set<string>();
    for (let i = 0; i < slugs.length; i += 200) {
      const rows = await this.many<{ slug: string }>(
        this.db.from("results_athletes").select("slug").in("slug", slugs.slice(i, i + 200)),
      );
      for (const r of rows) taken.add(r.slug);
    }
    return taken;
  }

  async upsertAthletes(input: UpsertAthlete[]) {
    if (input.length === 0) return [];
    // Same hazard as results: one repeated slug fails the whole statement.
    const bySlug = new Map<string, UpsertAthlete>();
    for (const a of input) bySlug.set(a.slug, a);
    let athletes = [...bySlug.values()];

    // ⚠️ `slug` is not the only unique key on this table.
    //
    // `results_athletes_source_idx` is a UNIQUE partial index on
    // `source_athlete_id`, and the upsert below declares `ON CONFLICT (slug)`.
    // So an athlete already stored under one slug, arriving with a different
    // one — which happens whenever the source changes the spelling of a name —
    // is an INSERT that violates a constraint the conflict clause does not
    // cover. Postgres fails the whole statement, and a division dies with it.
    // That is exactly what happened to Sports Direct HYROX London 2024.
    //
    // Resolving the source id to its stored slug first turns that insert back
    // into the update it always was. The new name still lands; only the slug is
    // held stable, which is right anyway — a slug is a URL, and an athlete's
    // page should not move because a timing operator corrected their spelling.
    const sourceIds = athletes
      .map((a) => a.sourceAthleteId)
      .filter((id): id is string => Boolean(id));

    if (sourceIds.length > 0) {
      const known = await this.getAthletesBySourceIds(sourceIds);
      const slugBySourceId = new Map(known.map((a) => [a.sourceAthleteId as string, a.slug]));

      const remapped = new Map<string, UpsertAthlete>();
      for (const a of athletes) {
        const stored = a.sourceAthleteId ? slugBySourceId.get(a.sourceAthleteId) : undefined;
        const athlete = stored && stored !== a.slug ? { ...a, slug: stored } : a;
        // Remapping can collide two incoming rows onto one stored slug; the
        // dedupe has to happen again afterwards or the statement fails on the
        // repeat instead.
        remapped.set(athlete.slug, athlete);
      }
      athletes = [...remapped.values()];
    }

    const toRow = (a: UpsertAthlete) => ({
      slug: a.slug,
      name: a.name,
      nationality: a.nationality ?? null,
      gender: a.gender ?? null,
      source_athlete_id: a.sourceAthleteId ?? null,
      claimed_by_user_id: a.claimedByUserId ?? null,
      is_demo: a.isDemo,
      is_anonymised: a.isAnonymised,
      identity_confidence: a.identityConfidence,
      needs_identity_review: a.needsIdentityReview,
    });

    // Athletes come back out, because the caller needs their ids to build
    // result rows — so this collects rather than only writing. Batching and the
    // halving retry are `upsertInBatches`'s job; see it for why no fixed size
    // is right.
    const out: AthleteRow[] = [];
    await upsertInBatches(
      athletes,
      ATHLETE_BATCH,
      async (batch) => {
        const { data, error } = await this.db
          .from("results_athletes")
          .upsert(batch.map(toRow), { onConflict: "slug" })
          .select();
        if (!error) out.push(...((data ?? []) as AthleteRow[]));
        return { error };
      },
      "athlete batch upsert failed",
    );
    return out.map(toAthlete);
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
    if (error) throw toRepositoryError(error, "results write failed");
  }

  async claimAthlete(athleteId: string, userId: string) {
    const { error } = await this.db
      .from("results_athletes")
      .update({ claimed_by_user_id: userId })
      .eq("id", athleteId);
    if (error) throw toRepositoryError(error, "results write failed");
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
  async upsertResults(input: UpsertResult[]) {
    if (input.length === 0) return { inserted: 0, updated: 0, unchanged: 0 };

    // ⚠️ Deduplicated on the conflict key before anything is sent.
    //
    // Postgres refuses an ON CONFLICT statement that would touch the same row
    // twice — "cannot affect row a second time" — and it fails the *whole*
    // command, so one repeated id costs an entire division. A source id
    // appearing twice means the same entry appeared twice on the board, so the
    // later one wins rather than the pair being an error.
    const byId = new Map<string, UpsertResult>();
    for (const row of input) byId.set(row.sourceResultId, row);
    const rows = [...byId.values()];

    // Chunked. PostgREST filters travel in the URL, and a 638-entrant board
    // makes an `in` list long enough to be rejected outright as a 400 — which
    // is what a whole division silently failing to store looked like from the
    // outside.
    const ids = rows.map((r) => r.sourceResultId);
    const existing: ResultRow[] = [];
    for (let i = 0; i < ids.length; i += 150) {
      existing.push(
        ...(await this.many<ResultRow>(
          this.db.from("results_results").select().in("source_result_id", ids.slice(i, i + 150)),
        )),
      );
    }
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

    // Bounded and adaptive — see `upsertInBatches`. This was one statement for
    // the whole division, which is 2,721 rows of splits JSONB on a big board.
    await upsertInBatches(
      changed.map(fromResult),
      RESULT_BATCH,
      (batch) =>
        this.db.from("results_results").upsert(batch, { onConflict: "source_result_id" }),
      "results write failed",
    );

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
    if (error) throw toRepositoryError(error, "results write failed");

    const rows = ((data ?? []) as (ResultRow & { athlete: AthleteRow })[]).map((r) => ({
      ...toResult(r),
      athlete: toAthlete(r.athlete),
    }));

    const total = count ?? rows.length;
    const next = offset + limit;
    return { rows, total, nextCursor: next < total ? String(next) : null };
  }

  async listResultsForAthlete(athleteId: string) {
    const own = await this.manyAll<ResultRow>((from, to) =>
      this.db.from("results_results").select().eq("athlete_id", athleteId).range(from, to),
    );
    const partnered = await this.manyAll<ResultRow>((from, to) =>
      this.db
        .from("results_results")
        .select()
        .contains("partner_athlete_ids", [athleteId])
        .range(from, to),
    );
    const byId = new Map([...own, ...partnered].map((r) => [r.id, r]));
    return [...byId.values()].map(toResult);
  }

  async countResultsForAthlete(athleteId: string) {
    // Ids only. The search box shows a race count next to each name, and
    // building it from `listResultsForAthlete` pulled every column of every race
    // — splits included — to call `.length` on the array.
    const [own, partnered] = await Promise.all([
      this.manyAll<{ id: string }>((from, to) =>
        this.db.from("results_results").select("id").eq("athlete_id", athleteId).range(from, to),
      ),
      this.manyAll<{ id: string }>((from, to) =>
        this.db
          .from("results_results")
          .select("id")
          .contains("partner_athlete_ids", [athleteId])
          .range(from, to),
      ),
    ]);
    // Deduped rather than summed: a doubles row can list the athlete in both
    // places, and counting it twice would inflate the race count.
    return new Set([...own, ...partnered].map((r) => r.id)).size;
  }

  async listResultsForDivision(divisionId: string) {
    return (
      await this.manyAll<ResultRow>(
        (from, to) =>
          this.db.from("results_results").select().eq("division_id", divisionId).range(from, to),
      )
    ).map(toResult);
  }

  async getDivisionSummary(divisionId: string) {
    // Four narrow reads in parallel, none of which touches `splits`.
    const [total, finisherCount, leaderRows, waveRows] = await Promise.all([
      this.countResultsForDivision(divisionId),
      (async () => {
        const { count, error } = await this.db
          .from("results_results")
          .select("id", { count: "exact", head: true })
          .eq("division_id", divisionId)
          .eq("status", "finished")
          .not("finish_time_ms", "is", null);
        if (error) throw toRepositoryError(error, "division summary failed");
        return count ?? 0;
      })(),
      this.many<{ athlete_id: string; finish_time_ms: number | null }>(
        this.db
          .from("results_results")
          .select("athlete_id,finish_time_ms")
          .eq("division_id", divisionId)
          .eq("status", "finished")
          .not("finish_time_ms", "is", null)
          .order("finish_time_ms", { ascending: true })
          .limit(1),
      ),
      this.manyAll<{ wave: string | null }>((from, to) =>
        this.db.from("results_results").select("wave").eq("division_id", divisionId).range(from, to),
      ),
    ]);

    const leader = leaderRows[0]
      ? { athleteId: leaderRows[0].athlete_id, finishTimeMs: leaderRows[0].finish_time_ms }
      : null;

    return { total, finisherCount, leader, waves: waveRows.map((r) => r.wave) };
  }

  async listStartersForDivision(divisionId: string) {
    // One join, four columns. The athlete arrives with the row rather than
    // being fetched per row.
    const rows = await this.manyAll<{
      wave: string | null;
      age_group: string | null;
      athlete: {
        slug: string; name: string; nationality: string | null; is_anonymised: boolean;
      } | null;
    }>(
      (from, to) =>
        this.db
          .from("results_results")
          .select("wave,age_group,athlete:results_athletes!inner(slug,name,nationality,is_anonymised)")
          .eq("division_id", divisionId)
          .range(from, to),
    );

    return rows
      .filter((r) => r.athlete)
      .map((r) => ({
        wave: r.wave,
        ageGroup: r.age_group,
        slug: r.athlete!.slug,
        name: r.athlete!.name,
        nationality: r.athlete!.nationality,
        isAnonymised: r.athlete!.is_anonymised,
      }));
  }

  async getDivisionRecords() {
    // ⚠️ One database call, not thirty-six.
    //
    // "the fastest finish in each division" is a `DISTINCT ON`, and the database
    // is the only thing that can plan it. Assembling it from the application —
    // per division key, `division_id IN (…) ORDER BY finish_time_ms LIMIT 1` —
    // cannot use an index without merging ~75 divisions each time, and it hit
    // PostgREST's statement timeout whenever the backfill was writing. The page
    // then degraded to the demo tier, which has no records at all, so the record
    // board rendered "No records yet" against half a million results.
    //
    // The function carries its own statement timeout, because the honest cost of
    // sorting 515,370 rows is around twenty seconds and that is fine for the
    // worker that calls it. See migration 0104.
    const rows = await this.many<{
      division_key: string;
      division_label: string;
      athlete_id: string;
      finish_time_ms: number;
      event_id: string;
    }>(this.db.rpc("results_division_records"));

    return rows.map((r) => ({
      divisionKey: r.division_key,
      divisionLabel: r.division_label,
      athleteId: r.athlete_id,
      finishTimeMs: r.finish_time_ms,
      eventId: r.event_id,
    }));
  }

  async listResultsWithSplitsForDivision(divisionId: string) {
    // `splits` defaults to `{}`, so "has splits" is "is not the empty object".
    return (
      await this.manyAll<ResultRow>((from, to) =>
        this.db
          .from("results_results")
          .select()
          .eq("division_id", divisionId)
          .neq("splits", "{}")
          .range(from, to),
      )
    ).map(toResult);
  }

  async countResultsForDivision(divisionId: string) {
    const { count, error } = await this.db
      .from("results_results")
      .select("id", { count: "exact", head: true })
      .eq("division_id", divisionId);
    if (error) throw toRepositoryError(error, "results write failed");
    return count ?? 0;
  }

  /** One column. See the interface docstring for why this is not a map(). */
  async listFinishTimesForDivision(divisionId: string) {
    const rows = await this.manyAll<{ finish_time_ms: number | null }>((from, to) =>
      this.db
        .from("results_results")
        .select("finish_time_ms")
        .eq("division_id", divisionId)
        .eq("status", "finished")
        .order("finish_time_ms", { ascending: true })
        .range(from, to),
    );
    return rows
      .map((r) => r.finish_time_ms)
      .filter((v): v is number => typeof v === "number")
      .map((ms) => Math.round(ms / 1000));
  }

  async searchAthletesAndEvents(q: string, limit = 10) {
    // Both halves at once: they are independent, and run in series they added
    // their latencies together on the one call a user waits on.
    //
    // The contains-match is only viable because of the trigram indexes in
    // migration 0103 — a leading wildcard cannot use a btree, so this was a
    // sequential scan of 883,167 athletes per keystroke.
    const [athleteRows, eventRows] = await Promise.all([
      this.many<AthleteRow>(
        this.db
          .from("results_athletes")
          .select()
          .ilike("name", `%${q}%`)
          .eq("is_anonymised", false)
          .limit(limit),
      ),
      this.many<EventRow>(
        this.db
          .from("results_events")
          .select()
          .or(`name.ilike.%${q}%,city.ilike.%${q}%`)
          .limit(limit),
      ),
    ]);

    return { athletes: athleteRows.map(toAthlete), events: eventRows.map(toEvent) };
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
    if (error) throw toRepositoryError(error, "results write failed");
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
    if (error) throw toRepositoryError(error, "results write failed");
  }

  async raiseAlert(alert: Omit<EngineAlert, "id" | "createdAt">) {
    // Deduplicated against open alerts: the catalogue raises the same message
    // every run, and a console of a hundred identical rows is a console nobody
    // reads. The occurrence count carries how persistent it is.
    const open = await this.one<Record<string, unknown>>(
      this.db
        .from("results_alerts")
        .select()
        .eq("kind", alert.kind)
        .eq("message", alert.message)
        .is("acknowledged_at", null)
        .limit(1)
        .maybeSingle(),
    );

    if (open) {
      const previous = (open.detail as { occurrences?: number } | null)?.occurrences ?? 1;
      const updated = await this.one<Record<string, unknown>>(
        this.db
          .from("results_alerts")
          .update({
            detail: { ...alert.detail, occurrences: previous + 1, lastSeenAt: new Date().toISOString() },
            severity: alert.severity,
          })
          .eq("id", open.id as string)
          .select()
          .single(),
      );
      if (updated) return toAlert(updated);
    }

    const row = await this.one<Record<string, unknown>>(
      this.db
        .from("results_alerts")
        .insert({
          kind: alert.kind,
          severity: alert.severity,
          message: alert.message,
          detail: { ...alert.detail, occurrences: 1 },
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
    if (error) throw toRepositoryError(error, "results write failed");
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
    if (error) throw toRepositoryError(error, "results write failed");
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
/**
 * Has anything about this row actually changed?
 *
 * ⚠️ **Who the row belongs to counts as a change.** This compared ranks, times,
 * status and splits, and not `athleteId` or `partnerAthleteIds` — so a re-pull
 * that resolved a row to a *different athlete* saw "unchanged" and wrote
 * nothing.
 *
 * That made the identity fix unshippable without anyone noticing. Partner ids
 * were re-scoped to their division to stop one synthetic athlete absorbing a
 * different person at every event, 1,486 divisions were queued to re-pull under
 * the corrected derivation, and the first round reported `+0 rows` — correctly,
 * by its own definition, having recomputed every id and discarded them all.
 *
 * A leaderboard is a list of names. A row whose name changed is a changed row.
 */
function materiallyDifferent(prior: EngineResult, next: UpsertResult): boolean {
  const partnersChanged =
    prior.partnerAthleteIds.length !== next.partnerAthleteIds.length ||
    prior.partnerAthleteIds.some((id, i) => id !== next.partnerAthleteIds[i]);

  return (
    prior.athleteId !== next.athleteId ||
    partnersChanged ||
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
