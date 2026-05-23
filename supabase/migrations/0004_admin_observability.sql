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
