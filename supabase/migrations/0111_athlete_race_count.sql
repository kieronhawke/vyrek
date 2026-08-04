-- A stored race count per athlete, so search never has to count.
--
-- ⚠️ Ranking search by "who has raced most" is what makes it useful — typing
-- "sutherland" should offer the Ben Sutherland with seventeen races, not one of
-- the four profiles holding two. But counting every match at query time meant
-- joining 630,287 results for every keystroke: correct, and five to nine
-- seconds.
--
-- The count changes only when results are ingested, and it is read on every
-- search. So it is stored, and the sync recomputes it.
alter table results_athletes
  add column if not exists race_count int not null default 0;

create index if not exists results_athletes_race_count_idx
  on results_athletes (race_count desc);

-- Recompute for everyone. Cheap enough to run after a sync; it is one pass.
create or replace function results_recount_athlete_races()
returns bigint
language plpgsql
set statement_timeout = '0'
as $$
declare
  touched bigint;
begin
  with counts as (
    select a.id, count(distinct r.id) as races
    from results_athletes a
    left join results_results r
      on r.athlete_id = a.id
      or r.partner_athlete_ids @> array[a.id]
    group by a.id
  )
  update results_athletes a
     set race_count = c.races
    from counts c
   where c.id = a.id and a.race_count is distinct from c.races;
  get diagnostics touched = row_count;
  return touched;
end;
$$;
