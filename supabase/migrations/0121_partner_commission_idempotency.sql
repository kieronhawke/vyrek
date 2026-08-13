-- Partner commission was credited with read-modify-write increments and the
-- webhook's idempotency claim is released on any throw, so a mid-handler retry
-- could credit the same invoice's commission twice. This makes accrual atomic
-- and idempotent: one ledger row per invoice, and the balance updates happen
-- in the same transaction as claiming that row.

create table if not exists partner_commission_events (
  invoice_id    text primary key,
  partner_id    uuid not null references partners(id),
  referral_id   uuid not null references partner_referrals(id),
  amount_pence  bigint not null,
  created_at    timestamptz not null default now()
);

create index if not exists partner_commission_events_partner_idx
  on partner_commission_events (partner_id);

-- Claims the invoice and applies the credit in one transaction. Returns true
-- if it credited (first time for this invoice), false if the invoice was
-- already credited (a retry) — in which case nothing is written. The caller
-- computes commission/tier in application code and passes the final values.
create or replace function credit_partner_commission(
  p_invoice_id      text,
  p_partner_id      uuid,
  p_referral_id     uuid,
  p_commission_pence bigint,
  p_is_first_paid   boolean,
  p_new_active      bigint,
  p_new_total       bigint,
  p_promoted_tier   text,
  p_first_paid_at   timestamptz
) returns boolean
language plpgsql
as $$
declare
  v_rows int;
begin
  insert into partner_commission_events (invoice_id, partner_id, referral_id, amount_pence)
  values (p_invoice_id, p_partner_id, p_referral_id, p_commission_pence)
  on conflict (invoice_id) do nothing;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return false; -- already credited for this invoice; do nothing
  end if;

  update partner_referrals set
    status = 'paid',
    first_paid_at = case when p_is_first_paid then p_first_paid_at else first_paid_at end,
    recurring_earnings_pence = coalesce(recurring_earnings_pence, 0) + p_commission_pence
  where id = p_referral_id;

  update partners set
    tier = p_promoted_tier,
    active_subscribers = p_new_active,
    total_referrals = p_new_total,
    pending_payout_pence = coalesce(pending_payout_pence, 0) + p_commission_pence,
    lifetime_earnings_pence = coalesce(lifetime_earnings_pence, 0) + p_commission_pence
  where id = p_partner_id;

  return true;
end;
$$;
