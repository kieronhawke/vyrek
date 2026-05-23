-- Vyrek live-presence tracking (Phase B3 polish).
-- Records every active session with a sliding last_seen timestamp.
-- Anything older than 60 seconds is "stale" (user closed tab / lost
-- connection); the admin /live page filters on last_seen > now()-60s.

create table if not exists live_sessions (
  id              text primary key,                -- client-generated session id
  path            text not null,
  country         text,
  user_agent      text,
  referrer        text,
  customer_id     uuid references customers(id) on delete set null,
  customer_email  text,
  started_at      timestamptz not null default now(),
  last_seen       timestamptz not null default now()
);

create index if not exists live_sessions_last_seen_idx
  on live_sessions(last_seen desc);
create index if not exists live_sessions_path_idx on live_sessions(path);
create index if not exists live_sessions_customer_id_idx
  on live_sessions(customer_id);

alter table live_sessions enable row level security;

notify pgrst, 'reload schema';
