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

- **711 posts total**: 407 HYROX + 304 PT
- **122 posts** target keywords with real Semrush volume data
- **30 posts** are refreshes of existing live content — the fastest wins
- **17 posts** blocked on the results-data decision
- Image mix: 100 own-photo, 127 data-graphic, 352 AI-generated, plus
  132 glossary/FAQ micro-posts that mostly use typographic cards

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
