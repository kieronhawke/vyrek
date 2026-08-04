-- The names worth having in the browser before anybody types.
--
-- Search was a network round trip per keystroke. Even at 250ms that reads as
-- lag, because the thing being compared against is not a slow website — it is
-- the autocomplete in every other search box the visitor uses, which answers
-- while they are still typing.
--
-- Almost all of the value sits in a very small set of names. Someone typing
-- "ben" wants the Ben who has raced forty times, not the 1,100 Bens in the
-- archive. So the top of that ranking is precomputed here, shipped to the
-- client once, and matched locally at zero latency. The server search still
-- runs behind it for the long tail — this decides what appears *instantly*.
--
-- Kept deliberately small: this is a payload a phone downloads on a mobile
-- connection before its first result appears.

create table if not exists results_popular_athletes (
  rank int primary key,
  slug text not null,
  name text not null,
  nationality text not null default '',
  races int not null
);

-- Ranked by how likely the name is to be typed, which nothing records, so two
-- proxies stand in for it:
--
--   races    — someone present at forty events is a name people look up
--   podiums  — an elite athlete may have raced five times and be the most
--              searched person on the site, so a top-three finish counts for
--              more than a finish
--
-- One entry per *person*, not per row: the source issues a fresh athlete id at
-- every event, so "Ben Sutherland" exists a dozen times over and would
-- otherwise fill the whole suggestion list by himself.
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
      -- ⚠️ Rows the pre-0112 slug allocator merged. Several different people's
      -- results sit on one row, so its race count is inflated and it would sort
      -- straight to the top of this list. Excluded until the repair re-pull has
      -- taken them apart; afterwards this matches almost nothing.
      and not (a.slug ~ '-(1[1-9]|[2-9][0-9]+)$' and a.race_count >= 5)
  )
  select
    (array_agg(slug order by race_count desc, slug))[1] as slug,
    (array_agg(name order by race_count desc, name))[1] as name,
    (array_agg(nationality order by race_count desc))[1] as nationality,
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

comment on function results_refresh_popular_athletes is
  'Rebuilds the prefetched suggestion list behind instant search. Run after an ingest.';
