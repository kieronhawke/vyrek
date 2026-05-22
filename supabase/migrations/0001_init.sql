-- Vyrek Phase 1 schema (see build-brief v3 §18)
-- Single migration: creates all tables, indexes, and locks RLS down to
-- service-role only (Phase 1 writes everything via API routes using the
-- secret key — no anonymous client-side reads/writes).

-- ─── customers ──────────────────────────────────────────
create table customers (
  id                  uuid primary key,
  email               text unique not null,
  stripe_customer_id  text unique,
  referral_code       text unique,
  referred_by_code    text,
  bacs_sort_code      text,
  bacs_account_number text,
  created_at          timestamptz default now()
);

create index customers_stripe_customer_id_idx on customers(stripe_customer_id);
create index customers_referral_code_idx       on customers(referral_code);
create index customers_referred_by_code_idx    on customers(referred_by_code);

-- ─── quiz_responses ─────────────────────────────────────
create table quiz_responses (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  email       text not null,
  answers     jsonb not null,
  program     text not null,
  path        text not null,
  created_at  timestamptz default now()
);

create index quiz_responses_email_idx on quiz_responses(email);

-- ─── subscriptions ──────────────────────────────────────
create table subscriptions (
  id                     uuid primary key,
  customer_id            uuid references customers(id),
  stripe_subscription_id text unique,
  status                 text not null,
  trial_end              timestamptz,
  current_period_end     timestamptz,
  cancelled_at           timestamptz,
  cancellation_reason    text,
  created_at             timestamptz default now()
);

create index subscriptions_customer_id_idx on subscriptions(customer_id);

-- ─── referrals ──────────────────────────────────────────
create table referrals (
  id                  uuid primary key default gen_random_uuid(),
  referrer_id         uuid references customers(id),
  referee_id          uuid references customers(id),
  status              text not null,
  bounty_amount_pence integer default 2000,
  payable_at          timestamptz,
  paid_at             timestamptz,
  payment_reference   text,
  created_at          timestamptz default now(),
  unique (referee_id)
);

create index referrals_referrer_id_idx on referrals(referrer_id);
create index referrals_status_idx      on referrals(status);

-- ─── waitlist ───────────────────────────────────────────
create table waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  source     text,
  created_at timestamptz default now()
);

-- ─── abandoned_plans ────────────────────────────────────
create table abandoned_plans (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  quiz_uuid     uuid,
  program       text,
  recovered_at  timestamptz,
  created_at    timestamptz default now()
);

-- ─── Row Level Security ─────────────────────────────────
-- Enable RLS on every table. No policies are added in Phase 1,
-- which means the anon (publishable) key gets denied everything.
-- All access goes through API routes using the secret key, which
-- bypasses RLS. We'll add granular policies in Phase 2 once we
-- wire up Supabase Auth.

alter table customers       enable row level security;
alter table quiz_responses  enable row level security;
alter table subscriptions   enable row level security;
alter table referrals       enable row level security;
alter table waitlist        enable row level security;
alter table abandoned_plans enable row level security;
