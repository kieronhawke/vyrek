-- The all-time record board, as one query the database can plan properly.
--
-- One row per division key: the fastest finish ever recorded in it. Deriving
-- this from the application meant asking, per division key, which of its ~75
-- divisions holds the fastest time — 36 round trips of `division_id IN (…)
-- ORDER BY finish_time_ms LIMIT 1`, which Postgres cannot answer from an index
-- without merging every one of them. The first version was worse still: it
-- walked all 2,692 divisions and every row, and took six minutes.
--
-- `DISTINCT ON` does it in a single pass. It sorts 515,370 rows and takes about
-- eleven seconds, which is fine for the worker that calls it and far past
-- PostgREST's statement timeout — hence a function with its own, rather than a
-- view the API would give up on halfway through.
--
-- `stable`, not `volatile`: it reads and never writes.

create or replace function results_division_records()
returns table (
  division_key text,
  division_label text,
  athlete_id uuid,
  finish_time_ms bigint,
  event_id uuid
)
language sql
stable
set statement_timeout = '120s'
as $$
  select distinct on (d.division_key)
         d.division_key,
         d.display_name,
         r.athlete_id,
         r.finish_time_ms,
         d.event_id
  from results_results r
  join results_divisions d on d.id = r.division_id
  where r.status = 'finished'
    and r.finish_time_ms is not null
  order by d.division_key, r.finish_time_ms asc;
$$;

-- The view built while investigating this is superseded by the function.
drop view if exists results_division_records_view;
