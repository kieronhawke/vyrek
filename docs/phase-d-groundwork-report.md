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
3. **Start the gym-layer data job** — the biggest single unblocker, but
   **correction, 30 July 2026: it is not unblocked.** Sourcing was tested and
   the free routes do not work. `hyroxuk.com/find-a-hyrox-training-club/` and
   `hyroxvault.com` both return 403. PureGym's own site claims a partnership
   across "many of our Manchester and Liverpool clubs" and names none, which
   contradicts the aggregator blogs that list specific branches as official
   training clubs, so those blogs cannot be trusted as a source. Gyms using
   HYROX branding frequently make no affiliation claim at all, and no chain
   exposes a machine-readable locator. The layer needs a keyed source (Google
   Places) or human verification. Hard rule 1 forbids inventing the records
   and the gate has no bypass, so this is a decision, not a data job.
4. **Decide open question 1** — every page needs one results data point, so the
   whole geo rollout queues behind this. The claim-your-profile route is
   unblocked and legally clean.
5. **Set up the `bensTake` production loop** with Ben — even a batch of 10/month
   matches the publishing velocity cap.
6. Before the index switch: fix hub-page robots, sitemap `lastModified`, and the
   region naming split. **Done 30 July 2026**, see below.

---

## Fixed on 30 July 2026

Findings 4, 5 and 6 from the legacy audit, plus one new one.

- **Hub robots (finding 4).** `/hyrox-training` and `/personal-trainer` never
  overrode the `index: false` default in `app/layout.tsx`, so both hubs would
  have stayed out of the index after the switch while the 188 detail pages
  beneath them asked to be indexed. Both now set `robots: { index: true }`.
  `/hyrox` already did.
- **Sitemap `lastModified` (finding 5).** All 284 geo URLs were stamped
  `new Date()`, so every build claimed the whole geo estate had changed. They
  now carry `GEO_CONTENT_UPDATED`, a hand-maintained content date. Blog
  category and author listings now derive their stamp from the newest post on
  the page instead of build time. 295 URLs changed from build-time to real
  dates.
- **Region naming split (finding 6).** London carried region "Greater London"
  while its 32 boroughs carried "London", splitting one place into a group of
  32 and a group of one on both hubs. Merged at grouping time only, via
  `REGION_GROUP_ALIASES` in `lib/uk-locations.ts`. The `region` field itself is
  unchanged because `/hyrox/[city]` feeds it to the Place schema as
  `containedInPlace`, where "Greater London" is the correct parent for London.
- **Location count.** `docs/marketing-seo-strategy.md` claimed 103 cities and
  boroughs. The real figure is 94, now corrected.
- **Cannibalisation (finding 1).** `/hyrox/{slug}` and `/hyrox-training/{slug}`
  carried the same title for all 94 locations ("Hyrox training in {name},
  personalised 12-week plans" vs the same words with different punctuation),
  both self-canonical, both requesting index. Resolved along the intent split
  the report already suggested, which the internal links were describing
  anyway ("read the full Hyrox in {name} guide"):
  - `/hyrox/{slug}` is the **guide**. Title "Hyrox in {name}: races, training
    and how to start", H1 "Hyrox in {name}", intro rewritten to research
    framing. It owns the "nearest race" question.
  - `/hyrox-training/{slug}` is the **conversion page**. Title "Hyrox coaching
    in {name}, personalised to your race".
  - `/personal-trainer/{slug}` was already distinct.
- **Duplicate FAQ markup (finding 3).** Both URLs for a location asked "What's
  the nearest Hyrox race to {name}?" and emitted near-identical FAQPage
  structured data. The guide keeps it; the conversion page now asks a
  conversion question instead.

### Hard rule 1 breaches found while doing the above

Three unsourced claims were templated across all 94 locations and, in two
cases, marked up as FAQPage structured data. All removed.

1. **"Yes, {name} has a growing network of affiliate gyms running
   Hyrox-pattern classes."** Asserted as fact for 94 towns. Affiliate status
   cannot be verified from any free source, which is the same finding that
   blocks the gym layer above. The answer also implied we have members in
   every one of those towns. Rewritten to describe what the product does
   without claiming what exists locally.
2. **"Local 1:1 Hyrox coaching in {name} typically ranges from £60 to £150 per
   hour."** No source. It also published a competitor price range on a site
   that declines to publish its own, which is the trust leak the onboarding
   proposal separately complains about. Rewritten without figures.
3. **"£60+ per hour" and "£40+ per session"** in the geo landing price
   comparison, rendered on 94 pages each. Replaced with "Hourly, session by
   session" and "Per session", which keeps the recurring-versus-hourly
   contrast the comparison is making without inventing a number.

- **New: future-dated posts.** Five posts carry `publishedAt` weeks ahead
  (9, 15, 22 and 28 August), but nothing in `lib/blog/posts.ts` filters on
  `publishedAt`, so they are live today, sorted to the top of `/blog`, and were
  emitting future dates into the sitemap and article JSON-LD. The sitemap now
  clamps to today. **The underlying question is open:** either those dates are
  a drip schedule that the code should honour by hiding unpublished posts, or
  they are wrong and should be corrected. Hiding five live posts is a content
  decision, so it was left alone.

## Outstanding data jobs

- ONS bulk town import (~1,100 towns; identity layer only)
- Semrush long-tail pull (open question 6): hyrox coach terms, competitor
  comparisons, non-UK volumes, the full UK town tail
