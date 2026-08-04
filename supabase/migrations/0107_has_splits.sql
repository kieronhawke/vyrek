-- Whether a row actually carries splits.
--
-- ⚠️ `splits <> '{}'` does not answer this. The column defaults to
-- `{"runs": [], "stations": []}`, which is not the empty object — so that test
-- matched all 630,287 rows when 21 have splits. Everything built on it was
-- silently wrong: the "rows with splits" read returned the whole table, and the
-- partial index meant to cover a tiny minority indexed every row.
--
-- A generated column states the question once, in the right place, and is
-- something PostgREST can filter and Postgres can index.
alter table results_results
  add column if not exists has_splits boolean
  generated always as (
    jsonb_array_length(coalesce(splits -> 'stations', '[]'::jsonb)) > 0
    or jsonb_array_length(coalesce(splits -> 'runs', '[]'::jsonb)) > 0
  ) stored;

drop index if exists results_results_division_splits_idx;

create index if not exists results_results_has_splits_idx
  on results_results (division_id)
  where has_splits;
