# CANONICAL BUILD ORDER

Do not reorder. Each phase depends on the one before it. Ship phases, not features.

---

## PHASE 0 — FOUNDATIONS (before any page is written)

- [ ] Confirm domain secured: `suvathletic.com` + `.co.uk`
- [ ] Confirm handles secured: `@suvathletic` on Instagram and TikTok
      *(if handles are gone, STOP — the brand name may need to fall back to SUTH. Flag to Kieron.)*
- [ ] Google Workspace: `ben@`, `kieron@`, `hello@`
- [ ] Transactional sending subdomain: `mail.suvathletic.com`, separate SPF/DKIM
- [ ] DMARC at `p=none` on both root and subdomain, reports monitored
- [ ] GA4 + Google Search Console + Bing Webmaster Tools
- [ ] **Build the uniqueness validator first** — see `rules/uniqueness-validator.md`.
      Build the guardrail before the thing it guards.

## PHASE 1 — CONVERSION CORE

- [ ] Homepage rebuilt around Ben: photos, Elite 15 credentials, race record, dual CTA
- [ ] `/coaching` — private 1:1 page, application-gated, spots visibly limited
- [ ] `/hyrox-coach` — targets `hyrox training near me` (880 vol, **KD 6**, transactional)
      **This is the single best keyword in the database. Build this page first.**
- [ ] 28-screen onboarding quiz, both branches — see `02-audience-and-onboarding.md`
- [ ] Mid-quiz email capture (~screen 8) + abandonment sequence
- [ ] Paywall: annual highlighted, savings badge, weekly cost breakdown

## PHASE 2 — THE RESULTS LAYER (the moat)

**BLOCKED** until the data source question in `08-open-questions.md` is resolved. Do not
build on an unlicensed scrape without sign-off.

- [ ] Results ingestion pipeline
- [ ] `/results` — targets `hyrox results` (14,800 vol, KD 19, **$2.63 CPC — highest in the set**)
- [ ] `/results/rankings`, `/results/records`, `/benchmarks/good-hyrox-time`
- [ ] Athlete profiles + "claim your profile" flow
- [ ] Quiz screen 5 PB lookup — pulls the user's real race result mid-funnel.
      No competitor can replicate this. It is the best moment in the entire funnel.

## PHASE 3 — HYROX CITY PAGES

Biggest evidenced cluster: 50 keywords, 81,680 combined volume, average KD 28.

- [ ] `/races/london` (18,100 / KD 26) — highest volume winnable term in the database
- [ ] `/races/glasgow` (6,600 / KD 17)
- [ ] `/races/birmingham` (6,600 / KD 30)
- [ ] `/races/dublin` (4,400 / KD 23), `/races/cardiff` (1,600 / KD 16)
- [ ] `/races/malaga` (1,000 / **KD 9**), `/races/rome`, `/races/madrid`, `/races/oslo`
- [ ] Remaining UK + EU race cities from `data/keywords-client-only.csv`

## PHASE 4 — PT LOCATION PAGES

62 evidenced UK towns, all client intent, all KD 15 or under. Full list in
`data/location-targets.csv`. Template and data model in `04-location-page-system.md`.

- [ ] Seed and verify the gym/location database (biggest single data job — start it in Phase 0)
- [ ] `/online-personal-trainer/[town]` template
- [ ] Ship 20–30 pages per month. **Never bulk-publish.**

## PHASE 5 — COMMERCIAL CONTENT

- [ ] Competitor comparison cluster (~15 pages) — highest buying intent on the site
- [ ] Gear cluster — `hyrox trainers` (2,900/KD 22), `best trainers for hyrox` (1,000/KD 25)
- [ ] `/how-much-is-a-personal-trainer` (1,300 / KD 12) — the online-vs-local argument page

## PHASE 6 — CORE CONTENT CLUSTERS

- [ ] Stations & weights (`hyrox weights` 1,900/KD 18, `hyrox stations` 2,900/KD 29)
- [ ] Training plans, fundamentals, beginner
- [ ] `couch-to-hyrox` — flagship pillar, own this term
- [ ] Tools and calculators (link magnets)

## PHASE 7 — SCALE

- [ ] Niche audience pages (90+, see `06-traffic-playbook.md`)
- [ ] YouTube channel
- [ ] US market
- [ ] Remaining international

---

## PUBLISHING VELOCITY

**15–25 pages per month. Never more.**

Publishing velocity is itself a ranking signal. Sites that went from zero to thousands of
pages in weeks were the exact pattern Google's March 2026 core update caught. Steady beats fast.

Target: **300–400 quality indexed pages in year one.** Not thousands.
