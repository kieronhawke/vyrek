-- When an invite link was first opened, so the admin can see the
-- difference between "never looked at it" and "looked but didn't sign up".
-- Stamped once, on first open; later opens leave it alone.
alter table public.onboarding_invites
  add column if not exists opened_at timestamptz;
