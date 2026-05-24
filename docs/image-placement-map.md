# Image placement map — Brief v2 §1.3

**Generated:** 2026-05-24
**Scope:** slot → photo ID → one-sentence rationale (semantic + composition + mood fit).

This is the PLAN for §1.4 execution. Two real photos (h1, h2) and four currently-unused v2/ stock files need slotting. The remaining 26 v2/ files are already correctly placed per the §1.2 audit and stay where they are.

## Proposed swaps (2 swaps)

| # | Slot | From | To | Semantic fit | Composition fit | Mood fit |
|---|---|---|---|---|---|---|
| 1 | Home Coach hub — James Wright tile (poster used by `<LoopingVideo>`) | v2-coach-james-wright | **h1** | Founding-coach slot needs a real-person, full-body framing | h1 is landscape 1024×559, will tile-crop nicely; the gym signage gives context | Warm + confident matches the "approach a coach you'd trust" register the tile asks for; loses the cold-camera stare of the current Pexels photo, which we keep on the page Hero anyway |
| 2 | Partners /partners — Coaches who's-earning card portrait | v2-coach-james-wright | **h2** | Coach-as-partner card asks for a portrait of someone earning recurring commission | h2 is near-duplicate of h1 with slightly looser background, works inside the 5:4 card crop | Same warmth as h1 — partner-acquisition tone is "join other coaches like you" not "elite-only intimidation" |

Both target slots currently re-use `v2-coach-james-wright`. Replacing them with h1/h2 also reduces that file's footprint from 9 call sites to 7, which the §1.2 audit flagged as the most-repeated image.

## Proposed promotions (4 files moved from unused → deployed)

These currently have zero call sites. Bringing them into Part 3 work makes the inventory pull its weight.

| # | File | Proposed deploy slot | Rationale |
|---|---|---|---|
| 3 | v2-hero-poster | `/results` hub hero background | Cinematic sled push, low light — matches the brief §3.6 "dark by default, subtle radial gradients" Results theme |
| 4 | v2-coach-hannah-ward | Coach 2 portrait when a real second coach lands; meanwhile keep dimmed placeholder | Real female coach face, currently sitting idle |
| 5 | v2-how-step-1 | Backup for any "phone-with-quiz" inline blog illustration | Already deployable, no fit issue |
| 6 | v2-how-step-4 | Backup for any "lifting" inline blog illustration | Already deployable |

## Proposed removals (0 removals)

No slot is rendering worse with an image than without. Nothing to remove in this pass.

## Proposed rescopes (0 rescopes)

All currently-rendered images sit at the right size + aspect after the Stage 2 Part A sweep moved 5 plain `<img>` slots to `next/image` with proper `sizes`. No rescopes needed.

## Slots that explicitly DON'T get a /photos image (and why)

The /photos folder gave us 2 usable files. Vyrek surfaces with hundreds of image slots cannot all be re-shot. The following slots stay on Pexels v2/ because:

- **Programme images, race-station imagery, station-specific bento tiles** — h1/h2 are *gym smiling-portrait* shots, not sled/wall ball/burpee station shots. Wrong semantic.
- **Hero backdrops (Home, About)** — Hero uses moodier/intense direction. h1/h2's bright daylight + warm smile would shift the brand register lighter than intended.
- **Quiz interstitials** — These are designed to be calming and short-effort scenes. The current v2/ choices (shoe-tying, calm-rower) read better in 2-second exposure.

If you want to commission additional photos in those categories later, the manifest after §1.5 will list every Pexels slot that's a candidate for a real-photo upgrade.

## Diversity note (preview of §1.5)

After the two swaps:
- h1 + h2 (both same male coach) are added — net: +2 male, both same person
- v2-coach-james-wright drops from 9 → 7 uses — slight rebalance
- People-visible images in the wider catalogue stay diverse: gender mix ~55/45 F/M, mixed ethnicities, body types, indoor/outdoor settings

The full diversity report lands at §1.5 with hard counts once swaps are executed.

## Effort estimate for §1.4 execution

- 2 file copies from `/photos` to `/public/media/images/v2/` (rename to `coach-james-wright-warm.jpg` + `partners-coach-warm.jpg` so they're discoverable)
- 1 line change in `lib/coaches.ts` (James Wright image + poster paths)
- 1 line change in `app/partners/page.tsx` (Coaches card portrait)
- 0 component edits beyond those
- ~10 minutes wall, no risk to existing surfaces
