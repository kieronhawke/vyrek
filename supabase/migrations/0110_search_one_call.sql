-- Athlete search: one call, one row per person, ranked, no counting.
--
-- ⚠️ Three problems solved together, and the third is the one that made it
-- fast.
--
-- **Round trips.** Searching and then counting each hit was three API calls at
-- best and eighteen at worst. Every query runs in single-digit milliseconds and
-- every trip costs the better part of a second, so search took 35 seconds on
-- "ben sut" while the query behind it took 11ms.
--
-- **Duplicate people.** The source issues a new athlete id at every event, so
-- "sutherland" returned four rows all reading "Ben Sutherland (2)". Folding the
-- name gives one row per person with their whole career counted.
--
-- **Counting.** Ranking by "who has raced most" is what makes search useful,
-- but computing it per keystroke joins 630,287 results — correct, and five to
-- nine seconds. `race_count` is stored (migration 0111) and maintained by the
-- sync, so this reads a column.
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
    (array_agg(h.nationality order by h.race_count desc))[1] as nationality,
    sum(h.race_count)::bigint as races
  from hits h
  group by trim(h.person_key)
  -- Most-raced first: "ben" should offer the Ben who has raced forty times
  -- before the Ben who has raced once. A shorter name breaks ties, being a
  -- closer match to what was typed than a longer one containing it.
  order by races desc, length((array_agg(h.name order by h.race_count desc, h.name))[1]) asc
  limit p_limit;
$$;
