# Image audit — Brief v2 §1.2

**Generated:** 2026-05-24
**Method:** Walked every `<Image>`, `<img>`, and `background-image` reference across `app/`, `components/`, `lib/`, and `content/`. 124 references total, using 26 of 30 v2/ stock files. Verdict per slot.

This audit supersedes the earlier `docs/image-audit.md` from Stage 2 Part A. Both can coexist; this one is the canonical view going forward.

## Verdict legend

- **keep** — image is on-brand, well-placed, no better option in the inventory
- **replace** — better option exists in the inventory (e.g. swap h1/h2 in, swap a duplicate for an unused v2/ file)
- **remove** — slot reads worse with an image than without; cut it
- **rescope** — slot is fine but needs different sizing / aspect / treatment

---

## Hero band (`/`)

| Slot | Current file | Times reused | Verdict | Note |
|---|---|---:|---|---|
| Hero backdrop (`components/marketing/hero.tsx`) | v2/coach-james-wright.jpg | 9 | keep | LCP element, now via next/image. Good fit; not warmed by h1/h2 smile. |

## Home page sections

| Slot | Current file | Verdict | Note |
|---|---|---|---|
| WhatYouGet bento card 1 (coach) | v2/coach-james-wright.jpg | keep | shared with hero (intentional) |
| WhatYouGet bento card 2 (plan) | v2/bento-plan.jpg | keep |  |
| WhatYouGet bento card 3 (programme) | v2/programme-sub-90.jpg | keep |  |
| WhatYouGet bento card 4 (progress) | v2/bento-progress.jpg | keep |  |
| Programmes carousel — First Race | v2/programme-first-race.jpg | keep |  |
| Programmes carousel — Sub-90 | v2/programme-sub-90.jpg | keep |  |
| Programmes carousel — Doubles | v2/programme-doubles.jpg | keep |  |
| Programmes carousel — Pro | v2/programme-pro.jpg | keep |  |
| Week-in-life vignette 1 | v2/programme-first-race.jpg | keep |  |
| Week-in-life vignette 2 | v2/programme-sub-90.jpg | keep |  |
| Week-in-life vignette 3 | v2/programme-pro.jpg | keep |  |
| Methodology card 1 (Specificity) | v2/programme-sub-90.jpg | keep |  |
| Methodology card 2 (Calibration) | v2/quiz-interstitial-2.jpg | keep | wall ball mid-rep, on-topic |
| Methodology card 3 (Progression) | v2/bento-progress.jpg | keep |  |
| Methodology card 4 (Honesty) | v2/about-outdoor.jpg | keep |  |
| Testimonial Sarah | v2/testimonial-sarah.jpg | keep |  |
| Testimonial Marcus | v2/testimonial-marcus.jpg | keep |  |
| Testimonial Doubles | v2/testimonial-doubles.jpg | keep |  |
| Coach hub — James Wright tile | v2/coach-james-wright.jpg (poster) | **replace** | **swap to h1 or h2** — warmer feel suits the "founding coach" slot; current photo is on Hero already, dilutes the brand if we have a real person available |
| Coach hub — Coach 2 placeholder | v2/diverse-1.jpg (dimmed) | keep | clearly "JOINING 2026" |
| Coach hub — Coach 3 placeholder | v2/diverse-2.jpg (dimmed) | keep |  |

## /about

| Slot | Current file | Verdict | Note |
|---|---|---|---|
| Hero backdrop | v2/bento-coaches.jpg | keep | wide gym scene, on-brand |
| Story-section inline (added Stage 2) | v2/about-coaching.jpg | keep |  |
| Why-Hyrox inline | v2/about-outdoor.jpg | keep |  |

## /programmes

| Slot | Current file | Verdict | Note |
|---|---|---|---|
| Sidebar image × 4 programmes | v2/programme-{slug}.jpg | keep | one per programme, semantic match |

## /plans/[slug]

| Slot | Current file | Verdict | Note |
|---|---|---|---|
| Hero (added Stage 2) | v2/programme-{programmeSlug}.jpg | keep | dynamic |

## /partners

| Slot | Current file | Verdict | Note |
|---|---|---|---|
| Hero backdrop | v2/bento-coaches.jpg | keep | shared with About hero (intentional, both coach-team imagery) |
| Who's-earning Coaches card | v2/coach-james-wright.jpg | **replace** | **swap to h2** — warmer/smiling fits "creator/partner" tone better than the focused coach shot |
| Who's-earning Creators card | v2/about-portrait.jpg | keep |  |
| Who's-earning Communities card | v2/testimonial-doubles.jpg | keep |  |

## /how-it-works

| Slot | Current file | Verdict | Note |
|---|---|---|---|
| Step 1 (Quiz) | v2/quiz-interstitial-1.jpg | keep |  |
| Step 2 (Plan delivered) | v2/bento-plan.jpg | keep |  |
| Step 3 (Train) | v2/programme-first-race.jpg | keep |  |
| Step 4 (Adapt) | v2/bento-progress.jpg | keep |  |

## /quiz V3 surfaces

| Slot | Current file | Verdict | Note |
|---|---|---|---|
| Welcome carousel slide 1 | v2/programme-first-race.jpg | keep |  |
| Welcome carousel slide 2 | v2/bento-plan.jpg | keep |  |
| Welcome carousel slide 3 | v2/bento-progress.jpg | keep |  |
| Reassurance-1 | v2/quiz-interstitial-1.jpg | keep |  |
| Reassurance-2 tile 1 | v2/bento-plan.jpg | keep |  |
| Reassurance-2 tile 2 | v2/programme-doubles.jpg | keep |  |
| Reassurance-2 tile 3 | v2/bento-progress.jpg | keep |  |
| Calculating screen | v2/programme-first-race.jpg | keep |  |

## /blog and /blog/[slug]

| Slot | Current file(s) | Verdict | Note |
|---|---|---|---|
| Journal hero | v2/programme-first-race.jpg | keep |  |
| Default OG image | v2/bento-plan.jpg | keep |  |
| Post card thumbnails (restored Stage 1.3) | per-post heroImage from frontmatter, mostly programme-* | keep | 30 posts share the 4 programme images by topic cluster — flagged in docs/image-manifest.md as intentional cluster-by-category |
| Post article hero | per-post heroImage | keep |  |
| Author photo (footer + inline) | v2/coach-james-wright.jpg or v2/bento-coaches.jpg | keep |  |

## /app/* (member app)

| Slot | Current file(s) | Verdict | Note |
|---|---|---|---|
| Coach video thumbnails × 14 | mixed v2/ topic matches | keep | each thumbnail uses a topic-distinct image after Stage 2 Part A fix |

## /api/og/blog/[slug]

| Slot | Current file | Verdict | Note |
|---|---|---|---|
| OG card background | v2/programme-first-race.jpg | keep | dynamic OG, served via @vercel/og |

## Currently-unused inventory

These 4 v2/ files exist in the repo but have **zero call sites**:

| File | Role | Recommendation |
|---|---|---|
| v2/coach-hannah-ward.jpg | Coach portrait, female track | **deploy** in the Coach hub once we have a real second coach, OR retire from the manifest |
| v2/hero-poster.jpg | Cinematic sled, low light | **deploy** as a Results-page hero in Part 3 (matches Results "gritty" brand direction) |
| v2/how-step-1.jpg | Phone in hand showing quiz | unused since how-it-works was already wired to quiz-interstitial-1; keep as backup |
| v2/how-step-4.jpg | Lifting under load | unused; keep as backup OR retire |

## Files to add from /photos

| New file | Slot it fills | Replaces |
|---|---|---|
| h1.jpeg | Founding coach poster on home Coach hub | v2/coach-james-wright.jpg (Hero keeps the original) |
| h2.jpeg | "Coaches" who's-earning card on /partners | v2/coach-james-wright.jpg there |

Both files are near-duplicates; we use one per role to avoid the "same image twice on one page" anti-pattern. If you'd rather use only one of h1/h2 plus an existing file for the second slot, say so.

## Files to add NOTHING for

All other slots have appropriate v2/ imagery. No further new-photo additions proposed. If a slot you care about should have a real photo instead of stock, list it.

---

## Net diffs going into 1.4

- 2 files swapped in from `/photos` (h1, h2)
- 0 files removed
- 4 unused v2/ files: 2 promoted to Part 3 Results hero slots, 2 kept as backup
- 0 duplicate-by-accident swaps needed (the duplicates that exist are intentional category clusters)
