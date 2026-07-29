# Publishing schedule — how 700 posts actually ship

Companion to `master-strategy.md`. This is the sequencing layer: what gets
written, in what order, and why that order and not another.

---

## The constraint

Hard rule: **15–25 new indexable pages a month, sitewide, never bulk.**
Blog posts share that budget with location pages. The split below assumes
the geo rollout takes 5–10 pages a month once its data gate is passed.

| Month band | Blog new posts/mo | Location pages/mo | Total |
|---|---|---|---|
| Months 1–3 (pre-index) | 12 | 0 (gate blocked) | 12 |
| Months 4–12 | 15 | 8 | 23 |
| Year 2+ | 15 | 8 | 23 |

**Refreshes are free.** The 30 `status = refresh` posts upgrade existing
live URLs, so they do not consume the new-page budget. Run 4–6 a month
alongside new work — they are the fastest ranking gains available, because
those pages already exist and have age.

## Order of operations

**Phase 0 — before a single post is written (weeks 1–3)**
1. Build the cluster hubs first. A spoke with no hub is an orphan.
   Priority hubs: `/hyrox/guide`, `/hyrox/stations`, `/hyrox/plans`,
   `/hyrox/times`, `/get-fit`, `/coaching`, `/how-much-is-a-personal-trainer`.
2. Build the OG image template (one build-time component, then free forever).
3. Agree the AI-image generation preset so the whole library shares one grade.
4. Set the author entity: Ben Sutherland Person schema, bio block, sameAs.

**Phase 1 — Wave 1, months 1–5 (70 posts)**
The evidenced, winnable, conversion-adjacent core. Every station guide,
the weights tables, the plan pillars, the cost/value PT anchors. By the end
of this phase every hub has 5+ children and the internal link graph works.

**Phase 2 — Wave 2, months 6–13 (113 posts)**
Cluster spines: goal-time ladder, duration-ladder plans, comparisons,
race-city guides, beginner fitness core, online-coaching objection handlers.

**Phase 3 — Wave 3, months 14–26 (191 posts)**
Cluster completion and niche capture: the 24 niche-audience posts, body-part
and goal training, location editorial, consumer guides, demographics.

**Phase 4 — Wave 4, months 27+ (205 posts)**
Glossary, FAQ micro-posts (70 of them), seasonal, micro-topics. These are
short (450–800 words), cheap to produce, and can be batched 2–3 per writing
session — so the tail moves faster than the headline number suggests.

## Batching rules that make this sustainable

- **Write in cluster batches, not one-offs.** Eight station "mistakes" posts
  written in one sitting share research and voice, and cross-link naturally.
- **FAQ posts batch 5 at a time.** 50-word answer + 400 words of depth each.
- **Data-graphic posts batch by graphic type** — build the chart component
  once, reuse across the cluster.
- **Seasonal posts must be written 8 weeks early.** January content in
  November, race-week content before the season opens.

## The maintained set (never "done")

These decay and need an owner with a calendar reminder:

| Content | Cadence | Trigger |
|---|---|---|
| Race calendar, city guides, start times | Quarterly | Season announcements |
| Ticket prices / registration | Per release cycle | Ticket drops |
| World records post | Within 48h | A record falls |
| Best shoes / gear roundups | Annually | New model releases |
| PT price guides | Annually | UK market data refresh |
| Season preview / review | Annually | Season start and end |

If nobody owns these, do not publish them — stale race information is worse
than no race information.

## Kill criteria

At the 9-month mark, any post with zero Search Console impressions gets
improved or merged into a sibling. Thin-content hygiene is part of the plan,
not an afterthought. Expect to retire 5–10% of the tail.

## What has to be true for this to work

1. Indexing switched on (currently noindex sitewide by hard rule).
2. A writer. At 15 posts/month, this is roughly 2–3 days of writing a week
   with AI-assisted drafting and a human editorial pass. The bottleneck is
   editing to Ben's voice, not drafting.
3. Ben's input on the posts only he can write — the Elite 15 posts, doubles
   strategy, race-craft. Perhaps 1 hour a month of voice notes, transcribed.
4. Results-data licensing decision, to unlock the 17 blocked data posts.
