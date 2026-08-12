-- ============================================================================
-- 0119 — PERFORMANCE INDEXES FOR THE ADMIN/COACH HOT PATHS
--
-- Every index here backs a query the app actually runs today:
--   subscriptions(status)             — admin dashboards filtering by state
--   subscriptions(created_at desc)    — newest-first windows (admin + coach)
--   customers(created_at desc)        — customer lists, newest first
--   quiz_responses(customer_id, ...)  — per-customer latest response
--   live_sessions(started_at desc)    — /admin/live ordering
--   training_plans(created_at desc)   — coach mode newest-plans window
--   trigram GINs on the email columns — the admin search ILIKE '%term%'
--     joins across customers / consultation_leads / consultation_bookings,
--     which a btree cannot serve for infix matches.
-- ============================================================================

create index if not exists subscriptions_status_idx      on public.subscriptions (status);
create index if not exists subscriptions_created_at_idx  on public.subscriptions (created_at desc);
create index if not exists customers_created_at_idx      on public.customers (created_at desc);
create index if not exists quiz_responses_customer_idx   on public.quiz_responses (customer_id, created_at desc);
create index if not exists live_sessions_started_at_idx  on public.live_sessions (started_at desc);
create index if not exists training_plans_created_at_idx on public.training_plans (created_at desc);

create extension if not exists pg_trgm;

create index if not exists customers_email_trgm_idx             on public.customers using gin (email gin_trgm_ops);
create index if not exists consultation_leads_email_trgm_idx    on public.consultation_leads using gin (email gin_trgm_ops);
create index if not exists consultation_bookings_email_trgm_idx on public.consultation_bookings using gin (email gin_trgm_ops);
