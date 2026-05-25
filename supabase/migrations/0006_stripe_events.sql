-- Stripe webhook idempotency table.
--
-- Stripe retries failed deliveries and lets staff replay events from the
-- dashboard. Without dedupe, `invoice.payment_succeeded` would credit a
-- partner's commission twice on every retry. This table holds a row per
-- processed event.id; the webhook handler INSERTs with ON CONFLICT DO
-- NOTHING and skips the side-effects branch when no row was inserted.
--
-- Retention: 90 days is plenty (Stripe stops retrying after 3 days). A
-- weekly cleanup cron can prune rows older than that.

create table if not exists public.stripe_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);

create index if not exists stripe_events_received_at_idx
  on public.stripe_events (received_at desc);

-- RLS: not accessed from the client. Service role only.
alter table public.stripe_events enable row level security;
