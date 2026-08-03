# Content plan

The full editorial plan for 700+ blog posts: 407 HYROX, 304 client-intent
personal training. Prepared 29 July 2026 to Kieron's brief.

**Status: PLAN.** Nothing here is written or published. This is the map.

## Files

| File | What it is |
|---|---|
| `master-strategy.md` | **Start here.** Selection logic, SEO system, image system, sharing, mobile, CTAs, measurement, blockers. |
| `hyrox-posts.csv` | 407 HYROX posts, one row each, 25 columns. |
| `pt-posts.csv` | 304 personal-training posts, same schema. |
| `publishing-schedule.md` | How 700 posts ship at 15–25/month without tripping scaled-content enforcement. |
| `post-template-spec.md` | How an individual post gets built: structure, voice, checklist, workflow. |
| `image-and-media-plan.md` | Image sourcing ladder, AI generation standards, authenticity QA, OG treatment, performance. |
| `competitor-findings.md` | Competitor content audit and the gaps the plan exploits. |
| `hyrox_seeds.py` / `pt_seeds.py` / `build_inventory.py` | The generators. Edit the seed files and re-run `python3 build_inventory.py` to regenerate both CSVs. Volumes/KD are joined from `docs/strategy/data/keywords.csv` at build time and are never hand-typed, so no invented figure can enter the plan. |

## CSV columns

`id` · `section` · `cluster` · `wave` · `title` · `slug` · `primary_keyword` ·
`volume` · `kd` · `intent` · `evidence` · `angle_rationale` · `format` ·
`word_count` · `cta_primary` · `cta_secondary` · `hub_link` · `image_source` ·
`image_concept` · `og_treatment` · `meta_title` · `meta_description` ·
`schema` · `status` · `notes`

**Reading the important ones:**

- `wave` (1–4) — publish order. Wave 1 is the 71 highest-value posts.
- `evidence` — `semrush` means volume/KD come from the real keyword
  database. `longtail-unevidenced` means the topic comes from question
  research or a competitor gap, and **the volume column is deliberately
  empty**. We do not invent numbers (hard rule 1).
- `status` — `planned` · `refresh` (upgrade an existing live post; doesn't
  count against the velocity cap) · `blocked-results` (17 posts waiting on
  the results-data decision) · `check-overlap` (a similar post may already
  exist; check before writing).
- `image_source` — `own-photo` (our shoot), `data-graphic` (charts/tables
  we build), `ai-generate` (brief is in `image_concept`).

## Headline numbers

- **792 posts total**: 454 HYROX + 338 PT
- **122 posts** target keywords with real Semrush volume data; the rest
  come from the question inventory (196 real questions collected from live
  SERPs) and confirmed competitor gaps
- **38 pillars · 666 guides · 88 glossary/FAQ micro-posts**
- **30 posts** are refreshes of existing live content — the fastest wins
- **23 posts** blocked on the results-data decision
- Image mix: 115 own-photo, 187 data-graphic, 490 AI-generated
- Waves: 87 · 170 · 266 · 269

## Integrity check

`node scripts/check-content-plan.mjs` validates the inventory against the
failure modes that kill programmatic content projects: duplicate slugs and
titles, keyword cannibalisation, clashes with already-published posts,
invented volume data, buyer-type violations (hard rule 2) and orphan
clusters with no hub.

It currently reports **0 blocking problems** and ~44 warnings. The warnings
are all station-cluster posts that share vocabulary with an existing
technique guide (e.g. "5 workouts for a faster sled push" vs the published
"hyrox sled push technique"). That overlap is deliberate — those posts
target different intents within one cluster — but each one needs a
deliberate check at writing time that it is not just re-treading the
existing post. Re-run the script after any edit to the CSVs.

## The two constraints that shape everything

1. **Velocity cap 15–25 pages/month** (hard rule, scaled-content
   protection). 700 posts is a multi-year pipeline, sequenced by
   commercial value. The waves are the sequence.
2. **Buyer-type filter** (hard rule 2). Zero posts target PT-jobs,
   PT-courses or facility intent, however easy those keywords look.

## Deliberate non-coverage: the Misspellings cluster

`docs/strategy/data/keywords.csv` carries 12 keywords in a `Misspellings`
cluster totalling 3,100/mo: `hydrox training` (720), `hydrox competition`,
`hydrox sport`, `hirox sports`, `hirox sport`, `hydrox uk`, `hydrox gym`,
`hydrox events`, `hyrdox`, `what is hyroc`, `hryox`, `hyrox.`

**No posts are planned for these, and that is the decision, not an omission.**

They are almost all navigational: someone mistyped the brand name and wants
HYROX. Building a dedicated page per misspelling produces twelve near-identical
thin pages whose only differentiator is a typo, which is the shape of content
Google's scaled-content and doorway-page guidance exists to catch. The upside
is small and the downside is a sitewide quality signal.

Handled instead on-page, in `content/blog/hyrox-meaning-what-the-word-actually-refers-to.mdx`,
which carries a short section naming the common misspellings in prose and
stating plainly that they all refer to the same event. That is genuinely useful
to a reader who mistyped, and it gives the engine something to match without
spawning a page per variant.

Revisit only if the misspellings show real impressions in Search Console with
no matching page, which is evidence rather than speculation.

## Hub routes: 384 planned posts still point at 404s

Audited 3 August 2026 against production. `post-template-spec.md` makes "1 link
to the cluster hub" a publish requirement for every post, so a cluster whose
hub does not exist cannot ship a compliant post.

**Fixed by remapping** (the route existed under a different path, no new build
required): `/gear` → `/hyrox/gear`, `/races` → `/hyrox/events`, `/hyrox/plans`
→ `/plans`. That moved 151 posts from a dead hub to a live one.

**Built**: `/hyrox/guide`, which 108 posts depend on.

**Still 404, and each needs a route before its cluster can ship:**

| Posts | Hub | Section |
|---|---|---|
| 140 | `/get-fit` | PT |
| 76 | `/coaching` | PT |
| 28 | `/recovery` | PT |
| 22 | `/strength` | PT |
| 19 | `/how-much-is-a-personal-trainer` | PT |
| 14 | `/hyrox-vs` | HYROX |
| 13 | `/hyrox/workouts` | HYROX |
| 13 | `/hybrid-training` | PT |
| 12 | `/fat-loss` | PT |
| 11 | `/hyrox/doubles` | HYROX |
| 10 | `/hyrox/times` | HYROX |
| 10 | `/hyrox/nutrition` | HYROX |
| 8 | `/hyrox-coach` | PT |
| 8 | `/running` | PT |

Twelve of the fourteen are PT-side, which is the larger finding: the personal
training section of the site is essentially unbuilt, and 338 planned PT posts
have nowhere to hang. The five HYROX hubs are small builds and could follow the
`/hyrox/guide` pattern directly.

Sequencing consequence: **do not write into a cluster whose hub is dead.** The
post will either ship without its hub link, breaking the spec, or ship with a
404 in it. Build the hub first, then the cluster.

## The international city guides need real research, not a template

Attempted 3 August 2026 and stopped. The Race Cities & Events cluster has
travelling-athlete guides for Madrid (1,300), Málaga (1,000), Rome (1,000),
Oslo (590), Chicago (480) and others, and the scraped race dataset gives real
dates and venue names for all of them.

Dates and venue names are not enough for a distinct page. Generating them from
a shared template produced files that were **87.5% identical** — 10 differing
lines out of 80 — with only the city, date and a season note swapped. That is
a doorway page, and it is the same pattern this plan already rejects for the
Stations cluster's templated variants.

What made the UK and Ireland guides work was material the template cannot
supply: Custom House on the Elizabeth line, the covered walkway at
Birmingham International, the DART to Ballsbridge, Cardiff Central five
minutes from the Principality Stadium, and a twelve-week block counted back
from each date into the season it actually falls in. That is per-city
knowledge, and it is why those posts differ from each other by more than a
noun.

**Rule for the remaining city guides:** write one only when there is genuine
per-city substance — transport, venue layout, seasonal implications for the
training block, local cost. Where that research has not been done, the honest
options are to do it, or to leave the keyword unclaimed. Madrid was kept
because it was written individually and explicitly disclaims venue knowledge
nobody on the team has.
