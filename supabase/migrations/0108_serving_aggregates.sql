-- Aggregates the serving layer was doing a round trip at a time.
--
-- Both of these were correct but chatty: the event page asked four questions
-- per division (18 divisions = 72 requests, ~4s), and the station histogram
-- asked one question per division of a given key (~130 requests, ~6s).
-- Grouping is what a database is for.

-- One row per division of an event: field size, finishers, and the leader.
create or replace function results_event_division_summary(p_event_id uuid)
returns table (
  division_id uuid,
  total bigint,
  finisher_count bigint,
  leader_athlete_id uuid,
  leader_finish_time_ms bigint,
  waves text[]
)
language sql
stable
set statement_timeout = '60s'
as $$
  select d.id,
         count(r.id),
         count(r.id) filter (where r.status = 'finished' and r.finish_time_ms is not null),
         (array_agg(r.athlete_id order by r.finish_time_ms asc nulls last)
            filter (where r.status = 'finished' and r.finish_time_ms is not null))[1],
         min(r.finish_time_ms) filter (where r.status = 'finished'),
         array_agg(distinct r.wave) filter (where r.wave is not null)
  from results_divisions d
  left join results_results r on r.division_id = d.id
  where d.event_id = p_event_id
  group by d.id;
$$;

-- Every stored time for one station across a division key, in one pass.
--
-- `has_splits` (migration 0107) is what makes this cheap: 21 rows of 630,287
-- carry splits, and the index on it means this touches only those.
create or replace function results_station_times(p_station text, p_division_key text)
returns table (seconds int)
language sql
stable
set statement_timeout = '60s'
as $$
  select round((seg ->> 'timeMs')::numeric / 1000)::int
  from results_results r
  join results_divisions d on d.id = r.division_id
  cross join lateral jsonb_array_elements(r.splits -> 'stations') as seg
  where r.has_splits
    and d.division_key = p_division_key
    and r.status = 'finished'
    and seg ->> 'key' = p_station;
$$;
