# Desktop alignment audit — Stage 1.4

**Generated:** 2026-05-24
**Live deploy:** `vyrek-...` (post-Stage-1 commit `09fd2fc`)
**Viewports captured:** 1280px, 1440px, 1920px
**Pages walked:** /, /programmes, /how-it-works, /about, /partners, /contact, /pricing, /blog, /blog/12-week-hyrox-training-plan, /results, /results/events, /quiz, /login
**Screenshots:** `docs/desktop-audit-screenshots/<page>-<width>.png` (39 files)

## Method

Used `scripts/stage1-audit.mjs` against the live deploy. Each page captured at 1280 / 1440 / 1920 widths, fullPage. Visually compared screenshots, looked for: heading alignment consistency, card-grid alignment, aspect-ratio drift within a row, section spacing, hover-state regressions.

## Findings

### What's visually clean across all 3 widths

- **Home page** — Hero left-aligned, 4-card bento aligned in a 2×2 grid (1440+), Programmes 2×2 grid clean, methodology cards aligned, testimonials grid clean, final CTA centred.
- **Programmes page** — 4 programme blocks rendered as text+image side-by-side. Image column locked at `aspect-[4/5]` for visual rhythm.
- **How It Works** — 4-step layout consistent; each step has matching image dimensions.
- **About page** — Hero band + story + Why Hyrox + principles + Built in UK + final CTA — each section has consistent padding.
- **Partners** — Hero h1 + earnings boxes row + Who's-earning faces strip + How-it-works steps + tier table + FAQ + apply CTA.
- **Blog index** — 48 cards in a 3-column grid at 1280+. All card heights match because the heroImage column locks aspect-[16/9].
- **Blog post** — 720px reading column centred between 1fr gutters at lg+; hero now capped at `max-h-[60vh]` per Stage 1.3.
- **Results hub** — Hero + featured event + carousels + grid.
- **Results events** — 3-column grid at 1280+, cards equal height.

### Issues found

- _none CRITICAL_
- _none MAJOR_

**MINOR observations (not user-blocking, queued for later polish):**

| # | Where | Observation |
|---|---|---|
| D-m1 | All pages, 1920px | A lot of empty space on the sides of content max-w containers. By design (max-w-7xl ≈ 1280px) — not a bug, just wide-monitor UX. Could add a subtle ambient backdrop or a sticky meta sidebar in a future polish pass. |
| D-m2 | Programmes page | The 4 programme blocks alternate text-left/image-right but DON'T flip image-left/text-right on every other row. Reads slightly monotonous on long scroll. Could alternate for variety. |
| D-m3 | Blog post 1280px | The 3-column grid `[1fr_minmax(0,720px)_1fr]` puts the TableOfContents in the left gutter; on the narrowest desktop the TOC gets squeezed. Acceptable; widens fine at 1440+. |
| D-m4 | Pricing page | Static centred pricing card with mini-FAQ — minimal layout, no real issues but feels light at 1920. |

### Specific user feedback from earlier sessions, re-verified

- "First race and Your first Hyrox cards out of line" — **NOT reproducible at any of the 3 desktop widths**. The cards are in a uniform grid. The reported issue may have been from a prior build (since fixed) or a transient viewport-specific render.

### Acceptance per Stage 1.4

- [x] Heading alignment consistency
- [x] Card grid alignment
- [x] Image aspect ratios consistent within rows
- [x] Spacing between sections
- [x] Hover states present (verified spot-tap on key CTAs in interactive walks earlier this session)
- [x] No layout shift on hover

**Status: PASS at 1280 / 1440 / 1920.**
