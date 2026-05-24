# Mobile audit — Stage 1.5

**Generated:** 2026-05-24
**Viewports captured:** 375px, 390px, 414px
**Pages walked:** same 13 routes as the desktop audit
**Screenshots:** `docs/mobile-audit-screenshots/<page>-<width>.png` (39 files)

## Findings

### What's visually clean across all 3 widths

- Hero stack tight, chartreuse CTA full-width thumb-reach
- 4-card bento (WhatYouGet) stacks single-column with `WEEK 04` badge visible top-right of the dated-weekly card
- Programmes carousel scrolls horizontally with snap; one card mostly visible + next peek
- Methodology cards stack single-column with image on top + body beneath
- Testimonials carousel + 5-star row above each quote
- Coach hub stacks single-column: James + Coach 2 + Coach 3 with placeholder dim treatment
- Final CTA "12 weeks to race-ready" centred
- Quiz welcome carousel renders correctly at 375 / 390 / 414
- Plan page (member): week circles row scrolls, value section + paywall in clean order
- Results hub: featured card + carousels work as horizontal scroll
- Blog index: stacked cards full-width with hero thumbnails

### Issues found

- _none CRITICAL_
- _none MAJOR_

**MINOR observations:**

| # | Where | Observation |
|---|---|---|
| M-m1 | All pages, 375px | Cookie banner takes 60-70px at top + 16px gap — eats roughly 10% of viewport. Acceptable; standard pattern. |
| M-m2 | Programmes carousel | At 375px the next-card peek is ~20%. Could tune `w-[78%]` → `w-[82%]` to give more focus to the active card. Cosmetic. |
| M-m3 | Quiz welcome carousel | Headlines like "Hyrox training, personalised." are display-3xl which is comfortable; "Built to get you to the line." also fits. No truncation observed. |
| M-m4 | Plan page workout cards | Each day card stacks well; on 375px the right-aligned chip ("RACE-SPECIFIC", "STRENGTH") sits comfortably without truncation. |
| M-m5 | Results event card | The "60 DAYS AGO" / "IN 49 DAYS" chip wraps the right edge of the card without truncation; LIVE badge has good visibility. |

### Mobile checklist

- [x] No horizontal scroll on any page (verified across the 39 captures)
- [x] Tap targets ≥ 48 px on primary CTAs (h-12 = 48px standard for chartreuse pill buttons)
- [x] 16 px input font (verified login + quiz inputs)
- [x] Safe-area-inset-bottom on sticky CTAs and member-app bottom nav
- [x] Cookie banner doesn't permanently cover content (pushes layout via `--vyrek-consent-h`)

### Acceptance per Stage 1.5

**Status: PASS at 375 / 390 / 414. No new issues require code changes.**

The audit ran against the post-Stage-1.1 deploy so the new images (workout-dated + badge, programme-sub-90-v2, adapt-coaching, coach-james-wright-warm) are all visible in the captures.
