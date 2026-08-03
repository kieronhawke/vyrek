-- Indexes the serving layer turned out to need at real scale.
--
-- Everything here was measured against the live store holding 491,030 results
-- and 883,167 athletes. The schema was written before any of that data existed,
-- and the queries that got slow are not the ones anybody would have guessed.

-- ── Search ──────────────────────────────────────────────────────────────
--
-- The search box runs `name ILIKE '%smith%'`. A leading wildcard cannot use a
-- btree index, so `results_athletes_name_idx` on `lower(name)` does nothing for
-- it: every keystroke was a sequential scan of 883,167 rows, measured at 13.5
-- seconds. Trigram GIN indexes are what make a contains-match indexable.
create extension if not exists pg_trgm;

create index if not exists results_athletes_name_trgm_idx
  on results_athletes using gin (name gin_trgm_ops);

create index if not exists results_events_name_trgm_idx
  on results_events using gin (name gin_trgm_ops);

create index if not exists results_events_city_trgm_idx
  on results_events using gin (city gin_trgm_ops);

-- ── Leaders and records ─────────────────────────────────────────────────
--
-- The record board and every ranking header ask the same question: the fastest
-- finisher in one division. `results_results_finish_idx` orders by finish time
-- across the whole table, and `results_results_division_rank_idx` is keyed on
-- rank, so neither answers it — the planner had to scan the division and sort.
--
-- Partial, because the query always filters to finishers with a time, and there
-- is no reason to carry DNFs and nulls in an index that exists to find a winner.
create index if not exists results_results_division_finish_idx
  on results_results (division_id, finish_time_ms)
  where status = 'finished' and finish_time_ms is not null;

-- Splits arrive one athlete at a time and most rows never have them, so the
-- division-average read filters on `splits <> '{}'`. Partial again: the index
-- covers the small populated minority rather than the whole table.
create index if not exists results_results_division_splits_idx
  on results_results (division_id)
  where splits <> '{}'::jsonb;
