# Master Brief — Stage 1 report

**Commit:** `09fd2fc`
**Live:** verified at `https://vyrek.vercel.app` post-deploy

## What shipped

### 1.1 Image replacements (4 swaps + 1 deletion)

| Slot | Was | Now |
|---|---|---|
| WhatYouGet card 2 "Every workout dated to your race" | `bento-plan.jpg` (phone mockup) | `workout-dated.jpg` (athlete with training notebook) + chartreuse `[ WEEK 04 ]` mono badge overlay top-right |
| All Sub-90 usages (16 files) | `programme-sub-90.jpg` (sled push) | `programme-sub-90-v2.jpg` (male sprinter mid-stride) — **old file deleted** from `/public/media/images/v2/` |
| /plan value section | text-only | added a chartreuse-bordered James Wright coach card above the 5-item list: portrait + "Elite 15 athlete · Top 50 World Championships finisher" |
| How-it-works step 4 "Train and adapt" | `bento-progress.jpg` (watch metrics) | `adapt-coaching.jpg` (athlete + coach reviewing data together) |

3 fresh Pexels images sourced via `scripts/fetch-stock-batch3.mjs`. Old `programme-sub-90.jpg` removed entirely.

### 1.2 5-star row above every testimonial

Geist Mono, chartreuse `#A3E635`, tracking-[0.18em]. `aria-label="5 out of 5 stars"` so screen-reader users get the rating.

### 1.3 Desktop blog post layout

Hero capped at `max-h-[60vh]` so it stops dominating the fold on tall desktops. Reading column already at 720px-max in a 3-column grid `[1fr_minmax(0,720px)_1fr]` per earlier work. Inline images already `w-full` bordered.

Verified at 1280 / 1440 / 1920 — `docs/blog-desktop-screenshots/blog-post-{1280,1440,1920}.png`.

### 1.4 Desktop alignment audit

Walked 13 routes × 3 viewports = 39 captures. Report at `docs/desktop-audit-report.md`. **Zero critical / major issues. PASS.** A handful of minor cosmetic observations queued for later polish (D-m1 wide-monitor empty side space, D-m2 programmes alternating row direction).

**The user's "First Race / Your first Hyrox cards out of line" report could not be reproduced** at any of the 3 desktop widths post-shipping. The cards are in a uniform 2×2 grid.

### 1.5 Mobile audit

Same 39 captures at 375 / 390 / 414. Report at `docs/mobile-audit-report.md`. **Zero critical / major issues. PASS.**

## Verification commands

Confirmed live in HTML:

```
$ curl -s https://vyrek.vercel.app/ | grep -oE 'WEEK 04|★★★★★|workout-dated|programme-sub-90-v2|coach-james-wright-warm'
WEEK 04
★★★★★
workout-dated
programme-sub-90-v2
coach-james-wright-warm

$ curl -s https://vyrek.vercel.app/how-it-works | grep -oE 'adapt-coaching'
adapt-coaching
```

All Stage 1 deliverables confirmed.

## What's next

Stages 2-15 remain. Several overlap heavily with work already shipped across earlier sessions:

- **Stage 2 (Results planning doc)** — Sprint 1 of the Results hub is already live (`d042446`); the planning doc will document what was built + the Sprint 2-5 spec.
- **Stage 3 (Landing polish)** — most items already shipped via Phase B3 Part 1 + the Stage 2 Part B work.
- **Stage 4 (Quiz polish)** — V3 quiz is already in production; some Part B3 §3 items remain.
- **Stage 5 (Trial signup flow)** — calc cinematic + paywall copy + value section + week circles already shipped (`Fix 1-5`); Stripe end-to-end is blocked on Supabase migrations being unapplied.
- **Stages 6-13** — mix of done, partial, and not-started.

I'll honour the "execute in strict order" rule and continue stage by stage in subsequent turns, doing delta work where things are already done and full builds where they're not.
