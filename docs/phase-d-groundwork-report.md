# Phase D groundwork report — location DB + uniqueness gate

**Date:** 29 July 2026
**Scope:** growth plan phase D foundations (docs/growth-plan.md §6, §11) per the
strategy pack (docs/strategy/04, rules/uniqueness-validator.md).

---

## What was built

| Piece | Where | Notes |
|---|---|---|
| Layered location types | `lib/locations/types.ts` | Full spec model: identity, gym, race, results, terrain, community layers, `bensTake`. Every fact record requires `source` + `verifiedOn`. |
| Location registry | `data/locations/registry.json` | 104 locations: 62 legacy cities, 32 London areas, 10 new evidenced entries (Worcester, Bedford, Chelmsford, Redhill, Southend-on-Sea, Croydon, Ilford, Kent, Essex, Leicestershire). All 62 Semrush keywords mapped to canonical slugs — the CSV's auto-generated slugs (`personal-nottingham`, `female-london`, `prices-london` etc.) were junk and have been corrected in review. |
| Enrichment store | `data/locations/enrichment/` | Per-town layer files. Seeded race layer for the four UK host cities from `lib/hyrox-events.ts` (real venues). Nothing invented. |
| Uniqueness validator | `scripts/validate-locations.mjs` | The publish gate. ≥5 populated fields incl. ≥1 gym/facility AND ≥1 results point; `bensTake` ≥40 words with an anti-templating check (shared 10-word runs between takes are rejected). No bypass flag exists and none may be added. |
| Build wiring | `package.json` | `pnpm build` now runs the validator first; structural data errors fail the build. Also available as `pnpm validate:locations`. |
| Accessors | `lib/locations/index.ts` | New page types must derive `generateStaticParams` from `getPublishableSlugs()` — never from the registry directly. That is what makes the gate structural. |
| Machine report | `data/locations/publish-status.json`, `docs/location-validator-report.md` | Regenerated on every build. |

**Gate result today: 0/104 publishable.** This is correct behaviour, not a fault:
no location yet has a verified gym record, and the results layer is deliberately
empty until open question 1 (results data source) is resolved. The strategy's own
sequencing produces this: the gate exists before the data that satisfies it.

---

## Legacy pages audit (the 94 × 3 live geo pages)

The 94 legacy locations power 282 live pages across three templates
(`/hyrox/[city]`, `/hyrox-training/[location]`, `/personal-trainer/[location]`).
**None would pass the gate.** Findings, worst first:

1. **Keyword cannibalisation is baked in.** `/hyrox/{slug}` and
   `/hyrox-training/{slug}` carry near-identical titles ("Hyrox training in
   {name}, personalised 12-week plans"), both self-canonical, both requesting
   index. 94 head-to-head pairs the day indexing opens.
2. **77 of 94 locations render an identical fallback paragraph** — only 17 have
   real `context` prose. This is exactly the scaled-content pattern hard rule 3
   exists to prevent.
3. **The same `context` paragraph renders on all three templates** for a given
   location, and the FAQ answers are ~90% shared strings emitted as FAQPage
   JSON-LD — duplication that is machine-visible to Google.
4. **The three hub pages will stay noindexed after launch** — they never override
   the layout's `robots: index: false`, unlike the detail pages. Needs fixing
   before the index switch flips.
5. **Sitemap `lastModified` is `new Date()`** for all 284 geo URLs — the sitemap
   claims everything changed on every build.
6. Minor: region naming splits London into two hub groups ("Greater London" vs
   "London"); `docs/marketing-seo-strategy.md` claims 103 locations, actual is 94.

## Recommendations (decisions for Kieron, not actioned)

1. **Do not unpublish anything now.** The site is noindex; the legacy pages cost
   nothing today. Removing slugs would hard-404 (no redirects exist).
2. **Resolve the /hyrox vs /hyrox-training overlap before indexing** — pick one
   intent per URL (suggest: `/hyrox/[city]` = race-city guide, `/hyrox-training/[loc]`
   = coaching conversion page, with distinct titles), or drop one type from the
   sitemap. This must precede the index switch.
3. **Start the gym-layer data job** — the biggest single unblocker and it is
   unblocked today (Hyrox club directory, chain locators, Google Places, then
   sample verification).
4. **Decide open question 1** — every page needs one results data point, so the
   whole geo rollout queues behind this. The claim-your-profile route is
   unblocked and legally clean.
5. **Set up the `bensTake` production loop** with Ben — even a batch of 10/month
   matches the publishing velocity cap.
6. Before the index switch: fix hub-page robots, sitemap `lastModified`, and the
   region naming split.

## Outstanding data jobs

- ONS bulk town import (~1,100 towns; identity layer only)
- Semrush long-tail pull (open question 6): hyrox coach terms, competitor
  comparisons, non-UK volumes, the full UK town tail
