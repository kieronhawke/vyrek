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
