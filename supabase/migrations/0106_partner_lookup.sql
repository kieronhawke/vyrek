-- Finding an athlete's races through the partner column.
--
-- `results_results.partner_athlete_ids` is a uuid[] carrying the rest of a
-- doubles or relay entry, and both the search box and every athlete profile ask
-- "which rows list this person as a partner". Without an index that is a
-- sequential scan of 630,000 rows, per athlete — and the search box asks it
-- eight times, once per hit, which is what kept search at two seconds after the
-- trigram index had already fixed the name lookup itself.
--
-- GIN is the right structure for array containment (`@>`), which is the
-- operator PostgREST's `contains` filter emits.
create index if not exists results_results_partner_idx
  on results_results using gin (partner_athlete_ids);
