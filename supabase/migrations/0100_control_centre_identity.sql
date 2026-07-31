-- ============================================================================
-- 0100 — IDENTITY, LEADS, CLIENT PROFILE, AUDIT
-- docs/build-pack/spec/15. Phase A.
--
-- Written before Supabase is unpaused so it can be applied and reviewed the
-- moment it is. Nothing here has been run yet.
--
-- Every table: id uuid pk, created_at, updated_at. Soft delete where noted.
-- ⚠️ marks UK GDPR obligations that are designed in, not added later.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- Shared updated_at trigger, rather than repeating it per table.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── IDENTITY & ACCESS ───────────────────────────────────────────────────

create type user_role as enum ('owner','coach','staff','readonly');

create table users (
  id uuid primary key default gen_random_uuid(),
  email citext unique not null,
  name text not null,
  phone text,
  avatar_url text,
  role user_role not null default 'readonly',
  two_factor_enabled boolean not null default false,
  last_login_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type hub_status as enum ('none','trialing','active','past_due','cancelled');
create type entitlement_status as enum ('none','active','paused');
create type one_to_one_tier as enum ('coaching','elite');

create table accounts (
  id uuid primary key default gen_random_uuid(),
  email citext unique not null,
  name text not null,
  phone text,
  avatar_url text,
  dob date,
  timezone text not null default 'Europe/London',
  country text,
  city text,
  coach_id uuid references users(id),
  hub_status hub_status not null default 'none',
  programming_status entitlement_status not null default 'none',
  one_to_one_status entitlement_status not null default 'none',
  one_to_one_tier one_to_one_tier,
  stripe_customer_id text unique,
  sms_opt_in boolean not null default false,
  sms_opt_in_at timestamptz,
  sms_opt_out_at timestamptz,
  email_marketing_opt_in boolean not null default false,
  -- ⚠️ Article 9 explicit consent, captured separately from general T&Cs.
  health_consent_at timestamptz,
  health_consent_version text,
  -- ⚠️ HARD-RULES §9: erasure anonymises, it never hard-deletes, because
  -- financial records must survive six years for HMRC.
  deleted_at timestamptz,
  anonymised_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sessions_auth (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  account_id uuid references accounts(id) on delete cascade,
  token_hash text not null,
  ip inet,
  user_agent text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessions_auth_one_subject
    check (num_nonnulls(user_id, account_id) = 1)
);

-- ── LEADS ───────────────────────────────────────────────────────────────

create type lead_segment as enum ('beginner','hyrox','faster','unsure');
create type lead_status as enum
  ('new','contacted','qualified','call_booked','trial','won','lost');
-- spec/12 §3: "Downsold to Hub" is a POSITIVE outcome, not a lost lead.
create type call_outcome as enum
  ('signed_1to1','signed_programming','downsold_hub','follow_up',
   'not_a_fit','no_show');

create table leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email citext,
  phone text,
  source text,
  campaign text,
  referrer_url text,
  landing_page text,
  segment lead_segment,
  status lead_status not null default 'new',
  call_outcome call_outcome,
  lost_reason text,
  converted_account_id uuid references accounts(id),
  first_contacted_at timestamptz,
  assigned_to uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table quiz_responses (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  account_id uuid references accounts(id) on delete cascade,
  branch lead_segment,
  answers jsonb not null default '{}'::jsonb,
  completed boolean not null default false,
  abandoned_at_screen int,
  predicted_finish_seconds int,
  percentile numeric,
  -- spec/12 §4: the one-page brief Ben reads before the call.
  call_prep_sheet jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table leads add column quiz_response_id uuid references quiz_responses(id);

-- ── CLIENT PROFILE ──────────────────────────────────────────────────────

create table client_profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references accounts(id) on delete cascade,
  goal text,
  target_race_id uuid,
  target_time_seconds int,
  training_days_per_week int,
  session_length_minutes int,
  gym_name text,
  equipment jsonb not null default '{}'::jsonb,
  unavailable_days text[],
  running_background jsonb,
  strength_background jsonb,
  weak_stations text[],
  -- ⚠️ Article 9 special category data. Encrypted at rest by the
  -- application layer before insert; the column holds ciphertext, never
  -- plaintext. Every READ writes to data_access_log.
  injuries_encrypted bytea,
  conditions_encrypted bytea,
  medications_encrypted bytea,
  limitations_encrypted bytea,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type billing_method as enum ('stripe_auto','stripe_manual','offline');
create type programming_cadence as enum ('weekly','fortnightly','monthly','race_led');
create type programming_state as enum
  ('current','due_soon','overdue','awaiting_race_debrief');

create table client_commercials (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references accounts(id) on delete cascade,
  monthly_rate_pence int,
  currency char(3) not null default 'GBP',
  billing_method billing_method not null default 'stripe_auto',
  billing_next_date date,
  programming_cadence programming_cadence not null default 'monthly',
  -- spec/10 §4: the field Ben asked for by name. Drives Coach Mode, the
  -- automation rules and the client's own view.
  programmed_until date,
  programming_status programming_state not null default 'current',
  -- spec/10 §6: grandfathered rates, so nobody later "corrects" them.
  rate_locked boolean not null default false,
  rate_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  author_id uuid not null references users(id),
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_one_subject check (num_nonnulls(account_id, lead_id) = 1)
);

-- ── AUDIT — APPEND ONLY ─────────────────────────────────────────────────

create type actor_type as enum ('user','account','system');

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_type actor_type not null,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  reason text,
  ip_address inet,
  user_agent text,
  occurred_at timestamptz not null default now()
);

-- spec/15 and spec/16 §7: "audit_log rejects UPDATE and DELETE at the
-- database level". Enforced here rather than in application code, because
-- an application-only rule is one forgotten service-role query away from
-- being untrue, and this table is both an internal control and a GDPR
-- accountability asset.
create or replace function audit_log_is_append_only()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_log is append-only: % is not permitted', tg_op;
end $$;

create trigger audit_log_no_update
  before update on audit_log
  for each row execute function audit_log_is_append_only();

create trigger audit_log_no_delete
  before delete on audit_log
  for each row execute function audit_log_is_append_only();

-- ⚠️ Article 9: access logging on every READ of health fields, not just
-- writes. Written by the application's health-data accessor.
create table data_access_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  account_id uuid not null references accounts(id) on delete cascade,
  fields_accessed text[] not null,
  reason text,
  occurred_at timestamptz not null default now()
);

-- ── INDEXES — spec/15 says do not skip ──────────────────────────────────

create index on accounts (hub_status) where deleted_at is null;
create index on accounts (coach_id) where deleted_at is null;
create index on client_commercials (programmed_until);
create index on client_commercials (billing_next_date);
create index on leads (status, created_at desc);
create index on notes (account_id, created_at desc);
create index on audit_log (entity_type, entity_id, occurred_at desc);
create index on data_access_log (account_id, occurred_at desc);

-- ── updated_at triggers ─────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'users','accounts','sessions_auth','leads','quiz_responses',
    'client_profiles','client_commercials','notes'
  ] loop
    execute format(
      'create trigger %I_set_updated_at before update on %I
         for each row execute function set_updated_at()', t, t);
  end loop;
end $$;
