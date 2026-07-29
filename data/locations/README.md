# Location database

The layered location DB behind the Phase D geo rollout. Spec:
`docs/strategy/04-location-page-system.md`. Publish gate:
`docs/strategy/rules/uniqueness-validator.md`, enforced by
`scripts/validate-locations.mjs` (runs automatically before every build).

## Files

- `registry.json` — identity layer for every known location (generated
  from the legacy catalogue + Semrush evidence; edit by hand from here on).
- `enrichment/<slug>.json` — the unique-data layers for one location:
  gyms, races, results, terrain, community, `bensTake`. Optional per
  location; a location with no enrichment file simply cannot publish.
- `publish-status.json` — output of the validator. **Generated, do not
  edit.** Future location page types read their publishable slug list
  from this file.

## Sourcing rules (hard rules 1 and 3 apply)

1. **Every enrichment record carries `source` and `verifiedOn`.** A fact
   without a source does not go in the database.
2. **No invented data.** An empty layer is correct until real data
   exists. The validator blocking a page is the system working.
3. **`bensTake` is human-written** (Ben, or Kieron from Ben's notes),
   minimum 40 words, unique per location. The validator rejects
   duplicated or near-duplicated takes.
4. **Results layer stays empty** until growth-plan open question 1
   (results data source) is resolved. Do not wire in the results seed
   JSON — its provenance is unverified.
5. `populationK` in the registry is approximate. Never render it as a
   precise figure.

## Types

`lib/locations/types.ts`. Accessors in `lib/locations/index.ts`.
