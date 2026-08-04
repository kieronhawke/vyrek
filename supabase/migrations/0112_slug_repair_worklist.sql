-- Which divisions hold results attached to the wrong person.
--
-- `findTakenSlugs` checked a base slug and nine numbered variants; the
-- allocator counted on to `-500`. So the eleventh person sharing a name was
-- handed `-11`, a slug nobody had asked the database about, and the athlete
-- upsert's `ON CONFLICT (slug) DO UPDATE` wrote them over whoever already held
-- it — handing the newcomer every result attached to that row.
--
-- A slug ending in `-11` or beyond can only have come from that allocator, and
-- a row carrying several races under one is a merge rather than a coincidence.
-- Measured when this was written: 32,062 results, 1,858 divisions, 216 events.
--
-- The owner is not recoverable in SQL — nothing on the result records which
-- source athlete produced it — so this only names the work. The re-pull in
-- `repair-slug-merges` does the fixing.

create or replace function results_divisions_needing_slug_repair()
returns table (
  division_id uuid,
  division_key text,
  source_division_id text,
  event_id uuid,
  affected bigint
)
language sql
stable
set statement_timeout = '120s'
as $$
  select
    d.id as division_id,
    d.division_key,
    d.source_division_id,
    d.event_id,
    count(*)::bigint as affected
  from results_results r
  join results_athletes a on a.id = r.athlete_id
  join results_divisions d on d.id = r.division_id
  where a.slug ~ '-(1[1-9]|[2-9][0-9]+)$'
    -- One race under such a slug is an honest eleventh namesake. Several is the
    -- merge: distinct people's results piled onto a single row.
    and a.race_count >= 5
    and d.source_division_id is not null
  group by d.id, d.division_key, d.source_division_id, d.event_id
  order by affected desc;
$$;

comment on function results_divisions_needing_slug_repair is
  'Divisions holding results merged onto the wrong athlete by the pre-0112 slug allocator.';
