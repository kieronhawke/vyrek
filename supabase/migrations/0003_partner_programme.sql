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
