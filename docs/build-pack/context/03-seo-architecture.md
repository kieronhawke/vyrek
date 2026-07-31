# SEO ARCHITECTURE

## THE GOVERNING PRINCIPLE

> **Every programmatic page must contain data that exists nowhere else in the page set.
> No data, no page.**

Google introduced "scaled content abuse" as a spam category in March 2024 and enforced it
aggressively in the March 2026 core update. The pattern explicitly named in post-update
analysis is `[service] in [city]` template pages where only the city name changes. Affected
sites saw 50–80% traffic drops, deindexing, and manual actions labelled "Scaled content
abuse" in Search Console.

**Volume is not the violation.** Zillow runs millions of programmatic pages and thrives,
because every page carries unique MLS data. The working standard is roughly **60%+
genuinely different content per page, drawn from multiple real sources.**

Our equivalent of Zillow's MLS data is the **Results Hub**. That is what makes this
strategy legal and defensible.

---

## SITE MAP

```
/                              Homepage — Ben, brand, dual CTA
├── /coaching                  Private 1:1 with Ben
├── /hyrox-coach               ← targets "hyrox training near me" (KD 6). BUILD FIRST.
├── /app                       SUV Performance Hub
├── /quiz                      28-screen onboarding
│
├── /hyrox/                    PILLAR
│   ├── /guide                 Fundamentals hub
│   ├── /times                 Benchmarks hub  ← results data
│   ├── /stations/[station]    8 station hubs
│   ├── /plans/[plan]          Training plans hub
│   ├── /gear                  Gear hub
│   ├── /nutrition             Nutrition hub
│   ├── /beginners
│   └── /rules, /format, /weights, /distances, /divisions, /age-groups
│
├── /results/                  DATA LAYER — the moat
│   ├── /races/[race-year]     Individual race results
│   ├── /venues/[city]         Venue analysis
│   ├── /athletes/[name]       Athlete profiles
│   ├── /rankings, /records
│   └── /compare/              Venue & athlete comparisons
│
├── /races/[city]              Hyrox city pages (data-backed)
├── /online-personal-trainer/[town]   PT location layer
│
├── /tools/                    CALCULATORS — link magnets
│   ├── /time-predictor
│   ├── /pacing-calculator
│   ├── /percentile-checker
│   └── /race-readiness
│
├── /hyrox-vs/[competitor]     Comparison cluster — highest buying intent
└── /blog/[cluster]/[post]     280+ supporting posts
```

---

## PAGE CLASSES BY DEFENSIBILITY

**Class 1 — Race data pages.** Backed entirely by the Results Hub. Genuinely unique per
page. The compounding asset — inventory grows every race weekend without effort.

**Class 2 — City / location pages.** Ship only when the uniqueness validator passes.
See `04-location-page-system.md`.

**Class 3 — Goal and intent pages.** National, no local risk. `/hyrox-training-for-beginners`,
`/couch-to-hyrox`, `/online-hyrox-coach`, `/sub-60-hyrox-training-plan`, station guides.

**Class 4 — Beginner / general fitness.** National volume play.

**Class 5 — Tools and calculators.** Earn backlinks better than almost any other content
type, and feed the quiz.

---

## INTERNAL LINKING RULES

- Every location page → its nearest race results page, its relevant training plan, the times benchmark hub
- Every blog post → up to its cluster hub, sideways to 2–3 siblings
- Every results page → the relevant location page and the time predictor tool
- Every page ends with a contextual CTA into the quiz

The cross-linking between location pages and results pages is what makes the site read as
one intelligent system rather than a pile of pages. It is also where the compounding happens.

---

## TECHNICAL

- **Static generation at build time** from the database, ISR for results freshness.
  Do not server-render hundreds of pages on demand.
- **Schema:** `LocalBusiness` (gyms), `SportsEvent` (races), `Person` (athletes),
  `FAQPage` (cluster hubs), `HowTo` (technique posts)
- **XML sitemaps segmented by type** — locations / results / blog — so indexing can be
  diagnosed per section in Search Console
- **hreflang** on English variants from day one
- Unique meta title and description per page, generated from data not template strings

---

## MONITORING

Check Search Console **weekly** for manual actions and indexing drops.

If indexed-page count starts falling, **stop publishing and audit immediately**. That is
the early warning of an algorithmic filter, which usually shows up as quiet non-ranking
rather than a visible penalty.

---

## MARKET SEQUENCE

UK → Ireland → USA → Australia/NZ → Canada → Germany → India/Asia

Prove the model in the UK completely before expanding. A ranking Tier 1 UK page teaches
more than 500 untested pages elsewhere.
