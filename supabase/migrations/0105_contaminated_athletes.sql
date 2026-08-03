-- Athletes stored in both the men's and the women's board of one event.
--
-- That is impossible, and it is the only reliable signal that the unfiltered
-- fallback adapter filled a division with another division's athletes — the
-- stored `sex` column is stamped from the division, so it agrees with the
-- contamination rather than exposing it.
--
-- A function rather than a query in the application: PostgREST has no grouping,
-- and doing it a division at a time through the API ran 55 minutes without
-- finishing. This answers in about ten seconds.
--
-- ⚠️ Returns one JSONB row, not a set. A set-returning function is still capped
-- at PostgREST's `max-rows` — 1,000 — with no indication it happened, and the
-- first version of this silently reported 1,000 of 6,387 pairs. Aggregating to
-- a single row puts the result out of reach of that limit entirely.
create or replace function results_contaminated_athletes()
returns jsonb
language sql
stable
set statement_timeout = '120s'
as $$
  with pairs as (
    select r.athlete_id, d.event_id,
           bool_or(d.division_key like '%-men')   as in_men,
           bool_or(d.division_key like '%-women') as in_women
    from results_results r
    join results_divisions d on d.id = r.division_id
    -- Mixed divisions legitimately hold both.
    where d.division_key not like '%mixed%'
    group by 1, 2
  )
  select coalesce(
    jsonb_agg(jsonb_build_array(event_id, athlete_id)),
    '[]'::jsonb
  )
  from pairs
  where in_men and in_women;
$$;
