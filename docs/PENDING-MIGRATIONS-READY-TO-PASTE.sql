-- =====================================================================
-- VYREK PENDING MIGRATIONS — ready to paste into Supabase SQL Editor
-- =====================================================================
--
-- Project: iiezxhzbissemvsfytwl.supabase.co
-- Generated: 2026-05-24
--
-- This file contains migrations 0002, 0003, 0004, 0005 concatenated in
-- order. Migration 0001 is already applied on production (verified via
-- PostgREST OpenAPI introspection — customers, subscriptions,
-- quiz_responses, referrals, abandoned_plans, waitlist all exist).
--
-- USAGE:
--   1. Go to https://supabase.com/dashboard/project/iiezxhzbissemvsfytwl/sql/new
--   2. Paste the entire contents of this file
--   3. Click Run (or press Cmd+Enter)
--   4. Verify success in the result panel
--
-- These migrations unblock:
--   - Quiz V3 progress + completions (0002)
--   - Partner Programme: applications, partners, referrals, payouts (0003)
--   - Admin observability: event log + admin_users (0004)
--   - Live presence pings for the active count (0005)
--
-- None of these block the paid trial conversion funnel — that already
-- works on the 0001 schema. These add the additional features.
--
-- =====================================================================

-- Quiz V3 additions (Phase 1 / docs/vyrek-quiz-v3-brief.md + addendum)
--
-- Adds:
--   1. Supabase Auth linkage (`auth_user_id`) to customers
--   2. Marketing opt-in flag captured on Screen 15
--   3. Doubles upgrade interest flag for "solo-partner-later" path
--   4. Calibration columns on quiz_responses for fast plan generation reads
--   5. Subscriptions doubles_upgrade_interest mirror for marketing
--
-- Idempotent: safe to re-run.

-- ─── customers additions ────────────────────────────────
alter table customers
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists marketing_opt_in boolean default false,
  add column if not exists doubles_upgrade_interest boolean default false;

create index if not exists customers_auth_user_id_idx
  on customers(auth_user_id);

-- ─── quiz_responses additions ───────────────────────────
-- Calibration columns are duplicated out of the answers jsonb for fast joins
-- and for the plan-generator to avoid parsing jsonb at request time.
alter table quiz_responses
  add column if not exists sex          text,
  add column if not exists weight_kg    numeric(5,2),
  add column if not exists weight_unit  text,
  add column if not exists programme    text,
  add column if not exists partner_mode text;

-- ─── abandoned_plans linkage ────────────────────────────
alter table abandoned_plans
  add column if not exists customer_id uuid references customers(id) on delete cascade,
  add column if not exists scheduled_for timestamptz;

create index if not exists abandoned_plans_customer_id_idx
  on abandoned_plans(customer_id);
create index if not exists abandoned_plans_scheduled_for_idx
  on abandoned_plans(scheduled_for)
  where recovered_at is null;
-- Vyrek Partner Programme (Phase B3 Part 11)
-- Flat tiered recurring commission only (30/40/50% by active referrals).
-- No flat sign-up bounty (the legacy `referrals` table in 0001 was for the
-- old £20 bounty referral model; the new model is partner-based recurring
-- and lives entirely in these tables).

-- ─── partner_applications ───────────────────────────────
create table if not exists partner_applications (
  id                    uuid primary key default gen_random_uuid(),
  email                 text not null,
  name                  text not null,
  country               text not null,
  platform              text not null,
  follower_count        text not null,
  content_description   text not null,
  why_vyrek             text not null,
  primary_url           text not null,
  past_affiliate        text,
  promotion_methods     text[] not null,
  status                text not null default 'pending', -- pending | approved | rejected | needs_info
  reviewed_by           uuid,
  reviewed_at           timestamptz,
  rejection_reason      text,
  created_at            timestamptz default now()
);

create index if not exists partner_applications_status_idx     on partner_applications(status);
create index if not exists partner_applications_created_at_idx on partner_applications(created_at desc);

-- ─── partners (approved + onboarded) ────────────────────
create table if not exists partners (
  id                              uuid primary key default gen_random_uuid(),
  auth_user_id                    uuid unique,
  application_id                  uuid references partner_applications(id),
  email                           text not null,
  name                            text not null,
  partner_code                    text unique not null,
  bank_account_name_encrypted     text,
  bank_sort_code_encrypted        text,
  bank_account_number_encrypted   text,
  address                         text,
  vat_number                      text,
  tier                            text default 'starter', -- starter | growth | elite
  total_referrals                 integer default 0,
  active_subscribers              integer default 0,
  lifetime_earnings_pence         bigint default 0,
  pending_payout_pence            bigint default 0,
  terms_accepted_at               timestamptz not null default now(),
  suspended_at                    timestamptz,
  suspension_reason               text,
  created_at                      timestamptz default now()
);

create index if not exists partners_email_idx        on partners(email);
create index if not exists partners_partner_code_idx on partners(partner_code);

-- ─── partner_referrals ──────────────────────────────────
create table if not exists partner_referrals (
  id                         uuid primary key default gen_random_uuid(),
  partner_id                 uuid references partners(id) not null,
  customer_id                uuid references customers(id) not null,
  signed_up_at               timestamptz default now(),
  first_paid_at              timestamptz,
  cancelled_at               timestamptz,
  status                     text not null default 'trial', -- trial | paid | cancelled | clawed_back
  recurring_earnings_pence   bigint default 0,
  attribution_ip             text,
  attribution_user_agent     text,
  unique (partner_id, customer_id)
);

create index if not exists partner_referrals_partner_id_idx on partner_referrals(partner_id);
create index if not exists partner_referrals_status_idx     on partner_referrals(status);

-- ─── partner_payouts ────────────────────────────────────
create table if not exists partner_payouts (
  id              uuid primary key default gen_random_uuid(),
  partner_id      uuid references partners(id) not null,
  amount_pence    bigint not null,
  period_start    date not null,
  period_end      date not null,
  bacs_reference  text,
  status          text not null default 'pending', -- pending | paid | failed
  paid_at         timestamptz,
  created_at      timestamptz default now()
);

create index if not exists partner_payouts_partner_id_idx on partner_payouts(partner_id);
create index if not exists partner_payouts_status_idx     on partner_payouts(status);

-- ─── Row Level Security ─────────────────────────────────
alter table partner_applications enable row level security;
alter table partners             enable row level security;
alter table partner_referrals    enable row level security;
alter table partner_payouts      enable row level security;
-- Vyrek admin observability + partner attribution depth (Phase B3+).
-- Idempotent.

-- ─── partner_clicks ─────────────────────────────────────
-- One row per /p/<slug> visit. Used to compute CTR + the conversion
-- funnel (visit → signup → paid) per partner.
create table if not exists partner_clicks (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid references partners(id) on delete cascade,
  sub_id      text,                  -- ?sub=campaign-x query parameter
  ip          text,
  user_agent  text,
  referer     text,
  country     text,
  created_at  timestamptz default now()
);

create index if not exists partner_clicks_partner_id_idx
  on partner_clicks(partner_id);
create index if not exists partner_clicks_created_at_idx
  on partner_clicks(created_at desc);

-- ─── partner_referrals sub_id ───────────────────────────
-- Carry the ?sub= from the click through to the signup so partners can
-- see which content drove each referral.
alter table partner_referrals
  add column if not exists sub_id text;

-- ─── admin_events ───────────────────────────────────────
-- Append-only audit log of admin actions + significant system events
-- (subscription state changes, webhook outcomes). Renders as the
-- activity feed on the admin overview.
create table if not exists admin_events (
  id          uuid primary key default gen_random_uuid(),
  actor       text not null,         -- admin email or 'system'
  action      text not null,         -- e.g. 'partner.application.approved'
  target_kind text,                  -- 'partner_application', 'subscription', etc.
  target_id   text,
  metadata    jsonb,
  created_at  timestamptz default now()
);

create index if not exists admin_events_created_at_idx
  on admin_events(created_at desc);
create index if not exists admin_events_actor_idx on admin_events(actor);
create index if not exists admin_events_action_idx on admin_events(action);

-- ─── RLS ────────────────────────────────────────────────
alter table partner_clicks enable row level security;
alter table admin_events  enable row level security;

-- ─── Schema cache reload ────────────────────────────────
notify pgrst, 'reload schema';
-- Vyrek live-presence tracking (Phase B3 polish).
-- Records every active session with a sliding last_seen timestamp.
-- Anything older than 60 seconds is "stale" (user closed tab / lost
-- connection); the admin /live page filters on last_seen > now()-60s.

create table if not exists live_sessions (
  id              text primary key,                -- client-generated session id
  path            text not null,
  country         text,
  user_agent      text,
  referrer        text,
  customer_id     uuid references customers(id) on delete set null,
  customer_email  text,
  started_at      timestamptz not null default now(),
  last_seen       timestamptz not null default now()
);

create index if not exists live_sessions_last_seen_idx
  on live_sessions(last_seen desc);
create index if not exists live_sessions_path_idx on live_sessions(path);
create index if not exists live_sessions_customer_id_idx
  on live_sessions(customer_id);

alter table live_sessions enable row level security;

notify pgrst, 'reload schema';
