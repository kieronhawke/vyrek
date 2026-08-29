-- QUIZ COPY OVERRIDES.
--
-- One row per edited string. Absence is the norm: the shipped default in the
-- component is what renders unless a row here says otherwise, so an empty
-- table is a working quiz rather than a blank one.
--
-- Keyed by "<screen>.<field>" — the same key the registry builds — so a
-- screen that is removed from the funnel leaves a harmless orphan row rather
-- than a foreign-key failure at deploy time.

create table if not exists quiz_copy (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

-- Read by the public quiz on every render, so it wants to be cheap. The
-- primary key covers the lookups; this only exists for the editor's list.
create index if not exists quiz_copy_updated_idx on quiz_copy (updated_at desc);

alter table quiz_copy enable row level security;

-- NOBODY REACHES THIS THROUGH THE ANON KEY.
--
-- Reads happen server-side with the service role, which bypasses RLS, so no
-- select policy is needed and adding one would only widen the surface: the
-- table is edited by exactly one person and read on their behalf. Writes go
-- through /api/admin/quiz-copy, which checks the admin session first.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'quiz_copy'
  ) then
    -- Nothing to do; leaving any hand-added policy alone.
    null;
  end if;
end $$;
