-- Prefer a nationality we know over one we do not.
--
-- Both of these collapse a person's several stored rows into one — the source
-- issues a fresh athlete id at every event, so "Ben Sutherland" exists a dozen
-- times over — and both picked the field values from whichever row had raced
-- most. Nationality is published on some boards and not others, so that row is
-- very often the one with a blank, and the flag disappeared for someone whose
-- country is sitting in the row next to it.
--
-- 65,356 people have a nationality on one row and a blank on another. This is
-- the whole of that group.
--
-- It cannot invent one: only a third of people carry a nationality anywhere,
-- because the source simply does not publish it for the rest. The UI now draws
-- nothing rather than an empty box in that case.

create or replace function results_search_athletes(p_query text, p_limit int default 8)
returns table (
  slug text,
  name text,
  nationality text,
  races bigint
)
language sql
stable
set statement_timeout = '15s'
as $$
  with hits as (
    select a.slug, a.name, coalesce(nullif(a.nationality, ''), '') as nationality,
           a.race_count,
           regexp_replace(lower(unaccent_safe(a.name)), '[^a-z0-9]+', ' ', 'g') as person_key
    from results_athletes a
    where a.name ilike '%' || p_query || '%'
      and a.is_anonymised = false
  )
  select
    (array_agg(h.slug order by h.race_count desc, h.slug))[1] as slug,
    (array_agg(h.name order by h.race_count desc, h.name))[1] as name,
    -- A known nationality first, and only then the busiest row's.
    (array_agg(h.nationality order by (h.nationality <> '') desc, h.race_count desc))[1]
      as nationality,
    sum(h.race_count)::bigint as races
  from hits h
  group by trim(h.person_key)
  -- Most-raced first: "ben" should offer the Ben who has raced forty times
  -- before the Ben who has raced once. A shorter name breaks ties, being a
  -- closer match to what was typed than a longer one containing it.
  order by races desc, length((array_agg(h.name order by h.race_count desc, h.name))[1]) asc
  limit p_limit;
$$;

create or replace function results_refresh_popular_athletes(p_limit int default 5000)
returns int
language plpgsql
set statement_timeout = '300s'
as $$
declare
  written int;
begin
  create temporary table _popular on commit drop as
  with podiums as (
    select athlete_id, count(*) as podiums
    from results_results
    where rank_overall <= 3 and is_demo = false
    group by athlete_id
  ),
  people as (
    select
      trim(regexp_replace(lower(unaccent_safe(a.name)), '[^a-z0-9]+', ' ', 'g')) as person_key,
      a.slug,
      a.name,
      coalesce(nullif(a.nationality, ''), '') as nationality,
      a.race_count,
      coalesce(p.podiums, 0) as podiums
    from results_athletes a
    left join podiums p on p.athlete_id = a.id
    where a.is_anonymised = false
      and a.is_demo = false
      and a.race_count > 0
      -- Rows the pre-0112 slug allocator merged: several people on one row, so
      -- an inflated race count that would sort straight to the top of the list.
      -- Excluded until the repair re-pull has taken them apart.
      and not (a.slug ~ '-(1[1-9]|[2-9][0-9]+)$' and a.race_count >= 5)
  )
  select
    (array_agg(slug order by race_count desc, slug))[1] as slug,
    (array_agg(name order by race_count desc, name))[1] as name,
    (array_agg(nationality order by (nationality <> '') desc, race_count desc))[1] as nationality,
    sum(race_count)::int as races,
    (sum(race_count) + 3 * sum(podiums))::int as score
  from people
  where person_key <> ''
  group by person_key;

  delete from results_popular_athletes;

  insert into results_popular_athletes (rank, slug, name, nationality, races)
  select row_number() over (order by score desc, races desc, length(name) asc, name asc),
         slug, name, nationality, races
  from _popular
  order by score desc, races desc, length(name) asc, name asc
  limit p_limit;

  get diagnostics written = row_count;
  return written;
end;
$$;
