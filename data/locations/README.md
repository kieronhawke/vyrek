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

## The international half

The files above are the UK. Every city that has hosted a HYROX *outside*
the UK lives in a parallel pair, because a Tokyo row has no region and no
county and folding it into `registry.json` would mean every UK consumer
learning to skip foreign rows:

- `race-cities.json` — identity plus race calendar for 91 cities across 36
  countries. **Generated** by `scripts/build-race-cities.mjs` from
  `data/hyrox/races.normalised.json` (scraped from hyrox.com) and
  `data/hyrox/races.geocoded.json` (Nominatim). Do not edit by hand.
- `enrichment-intl/<slug>.json` — the gym layer for one race city, from
  OpenStreetMap via `scripts/seed-gyms-intl.mjs`. Same contract as
  `enrichment/`: every record carries `source` and `verifiedOn`.

Accessors are in `lib/race-cities.ts`; `lib/geo-page.ts` resolves a slug
against both catalogues for the two page families.

**The two catalogues share one slug space.** Four names exist in both —
Boston, Houston, Perth and Portland. The UK town keeps the bare slug
because it is already indexed and linked; the race city is qualified with
its country (`boston-usa`, `perth-australia`) at build time. Both the
title and the H1 carry the country on the qualified side, or two live
pages end up identical. `lib/race-cities.test.ts` pins this down.

The publish gate does **not** govern these pages. It mandates a results
data point, which is still open question 1, and every race city already
carries the thing the gate is a proxy for: a race, a venue and a date.

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
