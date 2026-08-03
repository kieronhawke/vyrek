-- ============================================================================
-- 0101 — RESULTS DATA ENGINE
-- docs/suv-results-data-engine-prompt.md §4, §9, §11, §13.
--
-- Written while Supabase is paused (the project subdomain does not resolve),
-- so like 0100 this has not been run yet. It is idempotent and safe to apply
-- to an empty or partially-applied database.
--
-- ⚠️ marks UK GDPR obligations. Results are personal data: names,
-- nationalities and age groups about identifiable people who did not sign up
-- to be in our database. The erasure path anonymises rather than deletes, so
-- rankings keep their integrity while the person leaves the record.
-- ============================================================================

create extension if not exists "pgcrypto";

-- Shared updated_at trigger. 0100 defines this; repeated here so 0101 can be
-- applied standalone against a fresh database.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── ENUMS ───────────────────────────────────────────────────────────────

do $$ begin
  create type event_status as enum ('upcoming','live','final','updates_paused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type result_status as enum ('finished','dnf','dns','dq');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ingestion_mode as enum ('catalog','backfill','live','reconcile','manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ingestion_status as enum ('running','ok','partial','error');
exception when duplicate_object then null; end $$;

do $$ begin
  create type alert_severity as enum ('info','warning','critical');
exception when duplicate_object then null; end $$;

-- ── EVENTS ──────────────────────────────────────────────────────────────

create table if not exists results_events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                       -- s9-2026-manchester
  name text not null,
  city text not null,
  country text not null,
  country_iso text not null,
  region text not null,
  season text not null,                            -- s9
  year int not null,
  venue text,
  status event_status not null default 'upcoming',

  -- Timezone-aware arming (§13). start_datetime is the real local start moment
  -- stored in UTC; tz_offset_minutes preserves what local time that was, so a
  -- Sydney event arms at its local start and not on a naive UTC calendar day.
  start_datetime timestamptz,
  end_datetime timestamptz,
  tz_offset_minutes int not null default 0,
  start_date date,
  end_date date,

  athlete_count int not null default 0,

  -- The mika weekend id. One weekend maps to many source division codes, so
  -- this is the weekend, not the division. See SOURCE.md §3.
  source_event_id text unique,
  source_season_path text,

  is_demo boolean not null default false,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists results_events_status_idx on results_events (status);
create index if not exists results_events_season_idx on results_events (season);
create index if not exists results_events_region_idx on results_events (region);
create index if not exists results_events_start_idx on results_events (start_datetime);

drop trigger if exists results_events_updated on results_events;
create trigger results_events_updated before update on results_events
  for each row execute function set_updated_at();

-- ── DIVISIONS ───────────────────────────────────────────────────────────

create table if not exists results_divisions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references results_events(id) on delete cascade,
  division_key text not null,                      -- open-men, pro-doubles-women
  display_name text not null,
  entrant_count int not null default 0,

  -- What the event page published, for the completeness checksum (§13).
  -- Null means the source did not publish a count for this division.
  published_entrant_count int,

  -- Full source code including division prefix and race day: HPRO_LR3MS4JI163A
  source_division_id text,

  -- Content hash of this division's last fetched board.
  --
  -- Per division, not per event: one race weekend has a source id per race day
  -- and many divisions under each. Hashing at event level means every division
  -- overwrites the previous one's hash, the "unchanged" check never matches,
  -- and every poll rewrites every row.
  last_seen_hash text,
  last_synced_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, division_key)
);

create unique index if not exists results_divisions_source_idx
  on results_divisions (source_division_id) where source_division_id is not null;

drop trigger if exists results_divisions_updated on results_divisions;
create trigger results_divisions_updated before update on results_divisions
  for each row execute function set_updated_at();

-- ── ATHLETES ────────────────────────────────────────────────────────────
-- ⚠️ Personal data. See results_anonymise_athlete() at the end of this file.

create table if not exists results_athletes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  nationality text,
  gender text,

  source_athlete_id text,
  claimed_by_user_id uuid,
  is_demo boolean not null default false,

  -- ⚠️ Erasure. Anonymised rows keep their results for ranking integrity but
  -- carry no identifying information and are excluded from search and profiles.
  is_anonymised boolean not null default false,
  anonymised_at timestamptz,

  -- Identity resolution (§13). Confidence below the auto-merge threshold parks
  -- the athlete in results_athlete_merge_reviews instead of merging.
  identity_confidence numeric(3,2) not null default 1.00,
  needs_identity_review boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists results_athletes_source_idx
  on results_athletes (source_athlete_id) where source_athlete_id is not null;
create index if not exists results_athletes_name_idx on results_athletes (lower(name));
create index if not exists results_athletes_review_idx
  on results_athletes (needs_identity_review) where needs_identity_review;

drop trigger if exists results_athletes_updated on results_athletes;
create trigger results_athletes_updated before update on results_athletes
  for each row execute function set_updated_at();

-- ── RESULTS ─────────────────────────────────────────────────────────────

create table if not exists results_results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references results_events(id) on delete cascade,
  division_id uuid not null references results_divisions(id) on delete cascade,
  athlete_id uuid not null references results_athletes(id) on delete cascade,

  -- The idempotency key. Every upsert keys on this, so any sync can be re-run
  -- at any time with zero risk of duplicates (§9, §11 "recovery is just run it
  -- again").
  source_result_id text not null,

  rank_overall int,
  rank_age_group int,
  age_group text,
  sex text,
  finish_time_ms bigint,
  roxzone_time_ms bigint,
  status result_status not null default 'finished',
  wave text,
  bib text,

  -- Ordered runs and stations: { runs: [{key,time_ms}], stations: [...] }.
  -- JSONB on the row so the race strip renders from one read.
  splits jsonb not null default '{}'::jsonb,

  -- Doubles and relay: the other athletes on the row. See SOURCE.md §8.
  partner_athlete_ids uuid[] not null default '{}',

  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (source_result_id)
);

create index if not exists results_results_event_idx on results_results (event_id);
create index if not exists results_results_division_rank_idx
  on results_results (division_id, rank_overall);
create index if not exists results_results_athlete_idx on results_results (athlete_id);
create index if not exists results_results_finish_idx on results_results (finish_time_ms);

drop trigger if exists results_results_updated on results_results;
create trigger results_results_updated before update on results_results
  for each row execute function set_updated_at();

-- ── STATION DISTRIBUTIONS ───────────────────────────────────────────────
-- Precomputed so the percentile engine reads instantly rather than aggregating
-- 76k rows per request. Rebuilt after every successful event sync (§9).

create table if not exists results_station_distributions (
  id uuid primary key default gen_random_uuid(),
  scope text not null,                             -- 'event' | 'global'
  event_id uuid references results_events(id) on delete cascade,
  division_key text not null,
  station_key text not null,
  age_group text,
  sex text,

  sample_count int not null default 0,
  median_ms bigint,
  mean_ms bigint,
  -- p1, p5, p10, p25, p50, p75, p90, p99 as { "p5": 123456, ... }
  percentiles jsonb not null default '{}'::jsonb,

  computed_at timestamptz not null default now()
);

-- ⚠️ NULLS NOT DISTINCT, and it matters.
--
-- `age_group` and `sex` are null on every whole-division distribution. Postgres
-- treats nulls as distinct in a unique constraint by default, so `on conflict`
-- never matches and each recompute inserts a fresh set instead of updating —
-- distributions double on every event sync, and `getStationDistribution` then
-- errors, because it expects at most one row.
--
-- Found against a real database: an in-memory store compares `null === null`
-- and is perfectly happy, so no amount of unit testing would have shown it.
do $$ begin
  alter table results_station_distributions
    drop constraint if exists results_station_distributions_scope_event_id_division_key_s_key;
  alter table results_station_distributions
    drop constraint if exists results_station_distributions_unique;
  alter table results_station_distributions
    add constraint results_station_distributions_unique
    unique nulls not distinct (scope, event_id, division_key, station_key, age_group, sex);
exception when duplicate_table or duplicate_object then null; end $$;

create index if not exists results_station_dist_lookup_idx
  on results_station_distributions (scope, division_key, station_key);

-- ── OBSERVABILITY ───────────────────────────────────────────────────────

create table if not exists results_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  mode ingestion_mode not null,
  status ingestion_status not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms int,
  events_touched int not null default 0,
  rows_upserted int not null default 0,
  rows_quarantined int not null default 0,
  requests_made int not null default 0,
  errors jsonb not null default '[]'::jsonb,
  detail jsonb not null default '{}'::jsonb,
  trigger_source text
);

create index if not exists results_runs_started_idx on results_ingestion_runs (started_at desc);
create index if not exists results_runs_mode_idx on results_ingestion_runs (mode, started_at desc);

-- Drives incremental sync and change detection. No ETag on the source, so
-- last_seen_hash is a content hash (SOURCE.md §6).
create table if not exists results_sync_state (
  source_event_id text primary key,
  event_id uuid references results_events(id) on delete cascade,
  last_seen_hash text,
  last_polled_at timestamptz,
  last_success_at timestamptz,
  is_live boolean not null default false,
  live_armed_at timestamptz,
  live_interval_seconds int not null default 20,
  consecutive_failures int not null default 0,
  updates_paused boolean not null default false,
  -- Post-race reconciliation: decaying re-sync window after an event finalises.
  reconcile_until timestamptz,
  reconcile_attempts int not null default 0,
  updated_at timestamptz not null default now()
);

drop trigger if exists results_sync_state_updated on results_sync_state;
create trigger results_sync_state_updated before update on results_sync_state
  for each row execute function set_updated_at();

-- Bad rows land here with their raw payload and never touch the live tables.
create table if not exists results_quarantine (
  id uuid primary key default gen_random_uuid(),
  source_event_id text,
  source_division_id text,
  source_result_id text,
  reason text not null,
  detail jsonb not null default '{}'::jsonb,
  raw_payload jsonb,
  ingestion_run_id uuid references results_ingestion_runs(id) on delete set null,
  reprocessed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists results_quarantine_created_idx on results_quarantine (created_at desc);
create index if not exists results_quarantine_open_idx
  on results_quarantine (created_at desc) where reprocessed_at is null;

-- Parser-shape sentinel, circuit breaker trips, completeness mismatches and
-- dead-man's-switch misses all raise here so the console has one place to read.
create table if not exists results_alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null,                              -- parser_shape | breaker | completeness | ...
  severity alert_severity not null default 'warning',
  message text not null,
  detail jsonb not null default '{}'::jsonb,
  source_event_id text,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists results_alerts_open_idx
  on results_alerts (created_at desc) where acknowledged_at is null;

-- Uncertain athlete matches park here rather than auto-merging. Merging two
-- people who share a name is a correctness failure, not a cosmetic one (§13).
create table if not exists results_athlete_merge_reviews (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references results_athletes(id) on delete cascade,
  candidate_athlete_id uuid not null references results_athletes(id) on delete cascade,
  confidence numeric(3,2) not null,
  signals jsonb not null default '{}'::jsonb,
  resolution text,                                 -- merged | rejected | null
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Operator-tunable settings with server-side floors. The 15s live floor is
-- enforced by the check constraint, not only by the UI (§12).
create table if not exists results_engine_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

insert into results_engine_settings (key, value)
values ('live_interval_seconds', '20'::jsonb)
on conflict (key) do nothing;

-- ⚠️ ERASURE. Anonymises rather than deletes: the result rows stay so ranks and
-- distributions remain correct, but nothing identifying survives, the athlete
-- drops out of search and their profile 404s.
create or replace function results_anonymise_athlete(target uuid)
returns void language plpgsql as $$
declare token text;
begin
  token := 'anon-' || substr(encode(gen_random_bytes(8), 'hex'), 1, 12);
  update results_athletes
     set name = 'Withdrawn athlete',
         slug = token,
         nationality = null,
         source_athlete_id = null,
         claimed_by_user_id = null,
         is_anonymised = true,
         anonymised_at = now()
   where id = target;
end $$;

-- ── RLS ─────────────────────────────────────────────────────────────────
-- Public reads go through our serving API on the service role, not the anon
-- key, so nothing here is world-readable by default. Operator tables are
-- service-role only, full stop.

alter table results_events enable row level security;
alter table results_divisions enable row level security;
alter table results_athletes enable row level security;
alter table results_results enable row level security;
alter table results_station_distributions enable row level security;
alter table results_ingestion_runs enable row level security;
alter table results_sync_state enable row level security;
alter table results_quarantine enable row level security;
alter table results_alerts enable row level security;
alter table results_athlete_merge_reviews enable row level security;
alter table results_engine_settings enable row level security;
