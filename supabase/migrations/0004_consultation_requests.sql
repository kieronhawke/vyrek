-- Free-consultation lead capture. Written 2026-07-29 while the Supabase
-- project was paused; apply when the project is restored. The API route
-- (/api/consultation) degrades to email-only until then.

create table if not exists public.consultation_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  goal text not null,
  message text,
  source_path text,
  -- lead pipeline state for Ben's admin: new -> contacted -> call_booked
  -- -> won / lost
  status text not null default 'new',
  notes text
);

alter table public.consultation_requests enable row level security;

-- Service-role inserts/reads only (the API route and admin both use the
-- service key); no anon access.
