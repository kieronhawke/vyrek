-- ============================================================================
-- 0111 — SHORT INVITE LINKS
--
-- The invite store was written for Redis, which was never provisioned — so
-- every link fell back to the 78-character signed token and the short-link
-- path was dead code. That matters in one specific way: the invite goes out
-- by SMS, and 78 characters against 44 is the difference between one segment
-- and two on every invite Ben ever sends.
--
-- The signed token stays supported for ever. Links already sitting in
-- somebody's messages must keep working; see lib/onboarding/resolve.ts.
-- ============================================================================

create table if not exists onboarding_invites (
  -- Ten characters of a 30-symbol alphabet, minted in invite-store.ts.
  -- Excludes the glyphs people misread when a link is read out on the phone.
  id          text primary key,
  created_at  timestamptz not null default now(),
  -- Rows past this are dead. Enforced on read as well as by the sweep, so an
  -- unswept row is still refused rather than merely untidy.
  expires_at  timestamptz not null,
  payload     jsonb not null
);

create index if not exists onboarding_invites_expires_at_idx
  on onboarding_invites (expires_at);
