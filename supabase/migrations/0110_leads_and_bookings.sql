-- ============================================================================
-- 0110 — CONSULTATION LEADS AND THE BOOKING DIARY
--
-- Both lived in Redis, which was the right call when the only database this
-- app pointed at had been deleted. It is no longer the right call: Redis was
-- never provisioned, so in practice both lived in a process-memory fallback
-- that lost every lead and every booking on restart — and the links in Ben's
-- text messages 404'd the moment the server recycled.
--
-- Postgres is live now, so they go where the rest of the data is. One store,
-- durable by default, and queryable from the admin instead of only by id.
-- ============================================================================

create table if not exists consultation_leads (
  -- The id IS the credential: it is the whole of the link Ben opens from a
  -- text message, with no login behind it. Sixteen characters of a 31-symbol
  -- alphabet, generated in lib/leads/model.ts. See the note there on why that
  -- is enough and what it is actually protecting.
  id                text primary key,
  created_at        timestamptz not null default now(),

  name              text not null,
  email             text not null,
  phone             text,

  rail              text,
  wants             text,
  readiness         text,
  goal              text,
  programme         text,
  injury            text,
  brief             text not null default '',

  -- City-level, from the request headers. Never the raw IP: that is personal
  -- data under UK GDPR and the city is the only part that is useful.
  city              text,
  region            text,
  country           text,
  latitude          double precision,
  longitude         double precision,

  landing_path      text,
  referrer          text,
  seconds_on_site   integer,
  page_views        integer,
  source_path       text,

  -- Set when Ben sends the account setup link, so the list can show who has
  -- been converted without a second table.
  invited_at        timestamptz
);

create index if not exists consultation_leads_created_at_idx
  on consultation_leads (created_at desc);

create table if not exists consultation_bookings (
  -- Six characters, read aloud on the phone. Deliberately shorter and weaker
  -- than a lead id: it guards the ability to move a free call, and both
  -- parties are emailed and texted about any change.
  ref               text primary key,
  created_at        timestamptz not null default now(),

  name              text not null,
  email             text not null,
  phone             text not null,

  -- The instant the call starts. Stored as an instant because it is the one
  -- moment both parties agree on; every screen derives Europe/London from it.
  starts_at         timestamptz not null,
  minutes           integer not null default 30,
  status            text not null default 'confirmed'
                      check (status in ('confirmed', 'cancelled')),

  note              text,
  rail              text,
  rescheduled_from  timestamptz,
  cancelled_reason  text
);

create index if not exists consultation_bookings_starts_at_idx
  on consultation_bookings (starts_at);

-- Two people cannot hold the same slot. The application checks first and
-- reports it kindly; this is the backstop for the case the check cannot
-- cover, which is two requests arriving in the same instant.
create unique index if not exists consultation_bookings_slot_idx
  on consultation_bookings (starts_at)
  where status = 'confirmed';

-- Ben's weekly hours and date overrides. One row, ever.
create table if not exists booking_availability (
  id                integer primary key default 1 check (id = 1),
  updated_at        timestamptz not null default now(),
  config            jsonb not null
);
