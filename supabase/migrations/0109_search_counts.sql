-- Race counts for a set of athletes, in one call.
--
-- ⚠️ The search box shows a race count beside each name, and it asked for them
-- one athlete at a time — two queries each, sixteen for eight results. Every
-- one is fast in the database (0.3ms) and every one costs a full API round
-- trip, so search took 35 seconds on "ben sut" while the underlying query ran
-- in 11ms. The work was never the problem; the number of trips was.
create or replace function results_athlete_race_counts(p_ids uuid[])
returns table (athlete_id uuid, races bigint)
language sql
stable
set statement_timeout = '30s'
as $$
  select a.id, count(distinct r.id)
  from unnest(p_ids) as a(id)
  left join results_results r
    on r.athlete_id = a.id
    or r.partner_athlete_ids @> array[a.id]
  group by a.id;
$$;
