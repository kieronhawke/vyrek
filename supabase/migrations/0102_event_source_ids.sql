-- ============================================================================
-- 0102 — ONE EVENT, MANY SOURCE WEEKEND IDS
--
-- 0101 gave `results_events` a single unique `source_event_id`. That was wrong,
-- and SOURCE.md §3 said so in prose while the schema said otherwise: a HYROX
-- weekend carries a separate source id per race day, and "HYROX Cardiff 2026"
-- is one event that ran Saturday and Sunday.
--
-- The consequences, both observed on real data:
--
--   * Upserting on the slug set `source_event_id` to whichever weekend was
--     written last, so 76 events thrashed their id on every catalogue run.
--   * Upserting on the source id crashed with a duplicate key the moment two
--     labels produced the same slug, taking a whole season's catalogue with it.
--
-- The slug is the identity — season, year and city are what an athlete means by
-- "the event" — and the weekend ids are an attribute of it. Plural.
-- ============================================================================

alter table results_events
  add column if not exists source_event_ids text[] not null default '{}';

-- Backfill from the single column before it stops being authoritative.
update results_events
set source_event_ids = array[source_event_id]
where source_event_id is not null
  and not (source_event_id = any(source_event_ids));

-- Pull in every weekend id the divisions already reference, which is the true
-- set — the events table only ever recorded the last one written.
update results_events e
set source_event_ids = sub.ids
from (
  select d.event_id,
         array_agg(distinct split_part(split_part(d.source_division_id, '#', 1), '_', 2)) as ids
  from results_divisions d
  where d.source_division_id is not null
  group by d.event_id
) sub
where sub.event_id = e.id
  and sub.ids is not null
  and not (e.source_event_ids @> sub.ids);

-- The unique constraint is what made a shared id fatal. The slug carries
-- uniqueness now; a weekend id belongs to exactly one event by construction,
-- and the index below makes that lookup fast without forbidding it.
alter table results_events drop constraint if exists results_events_source_event_id_key;

create index if not exists results_events_source_ids_idx
  on results_events using gin (source_event_ids);

comment on column results_events.source_event_id is
  'First weekend id seen, kept for display. NOT an identity — see source_event_ids.';
comment on column results_events.source_event_ids is
  'Every mika weekend id belonging to this event. One per race day.';
