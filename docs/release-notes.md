# Vyrek release notes — Brief v2 execution log

**Started:** 2026-05-24
**Brief:** `docs/CLAUDE_CODE_BRIEF_v2.md` — three-part execution (Image overhaul → Quiz redesign → Results hub).

This document is updated per the brief's "Final deliverable" requirement and refreshed at every checkpoint.

---

## Part 1 — Site-wide image overhaul

### §1.1 Inventory — COMPLETE
- `docs/photo-inventory.json` catalogues 32 usable photos (2 real Adobe Stock + 30 Pexels)
- 53 ChatGPT-generated PNGs in `/photos/` excluded per user Q1 answer

### §1.2 Audit — COMPLETE
- `docs/image-audit.md` walks every `<Image>`, `<img>`, `background-image` across `app/`, `components/`, `lib/`, `content/`
- 124 references → 26 deployed files. Per-slot keep/replace/remove verdict

### §1.3 Placement map — COMPLETE
- `docs/image-placement-map.md` — 2 swaps identified, rationale per fit (semantic + composition + mood)

### §1.4 Execute swaps — COMPLETE
- `/photos/h1.jpeg` copied to `/public/media/images/v2/coach-james-wright-warm.jpg`
- `/photos/h2.jpeg` copied to `/public/media/images/v2/partners-coach-warm.jpg`
- `lib/coaches.ts` James Wright `image` + `video.poster` repointed
- `app/partners/page.tsx` Coaches who's-earning card portrait repointed
- WebP-at-rest skipped (sips can't write WebP); Vercel `/_next/image` serves WebP on the wire

### §1.5 Manifest — COMPLETE
- `docs/image-manifest.json` — every in-use image + used-on pages + subject tags + dims + size
- 28 deployed files + 4 unused (one of which, `hero-poster.jpg`, is reserved for Part 3 Results hub)

### §1.6 Missing-photos log — COMPLETE
- `docs/missing-photos.md` — long, honest, per-slot
- ~140 slots flagged that would benefit from real photography
- 12 clusters from hero backdrops to Part 3 Results-hub city heroes

### §1.7 Diversity audit — COMPLETE (criterion NOT MET — blocked-on-source)
- `docs/diversity-report.md`
- Headline: ~50/50 gender mix achieved, but ethnicity / age 40+ / non-lean body type / adaptive athletes are all under-represented
- Cannot be solved from current inventory — see sourcing brief

### Photo sourcing brief — COMPLETE (action: user)
- `docs/photo-sourcing-brief.md`
- §A coach+brand half-day shoot (£1.5-3k) — biggest brand lift
- §B Hyrox stations half-day shoot (£1.5-3k)
- §C stock library shopping list (£1.5k)
- §D testimonial gather (£0, 5hrs)
- §E event press photography (£0.3-1k)
- Total to lift the whole site: £4.8-8.5k. Minimum-viable upgrade: §A alone at £1.5k

### Part 1 acceptance criteria — final status

| Criterion | Status | Notes |
|---|---|---|
| All images audited; kept/replaced/marked missing | ✅ | `docs/image-audit.md` |
| No duplicate image in two roles | ⚠️ Intentional reuse documented | Blog posts share programme heroes by topic cluster (flagged in manifest) |
| All replaced images WebP, ≤1.5MB, with alt text | ⚠️ JPEG at rest; WebP on wire via /_next/image | sips can't write WebP. End-user delivery is WebP. |
| Diversity report shows balanced representation | ❌ BLOCKED-ON-SOURCE | Cannot be solved from current inventory — see sourcing brief |
| Lighthouse ≥90 Performance on every changed page | ✅ (most), ⚠️ (home) | /about 90, /plans/* 95, /partners not measured yet; home was 74 before swap and the swap is image-only so no regression expected. Re-measure after deploy. |

### Part 1 net diff
- 2 new real photos shipped (h1, h2 with descriptive slugs)
- 2 component edits (`lib/coaches.ts`, `app/partners/page.tsx`)
- 6 new documents: inventory, audit (refreshed), placement-map, manifest, missing-photos, diversity-report, sourcing-brief
- 0 component restructuring
- 0 image bytes added to the home/marketing fold (h1/h2 are smaller than the v2/ files they partially replace)

---

## Part 2 — Quiz redesign

**NOT STARTED.** User directive: pause Part 2 until photo sourcing decision lands. The brief flags interstitials as needing real photos; quiz redesign benefits directly from §A or §C of the sourcing brief.

---

## Part 3 — Results hub

**NOT STARTED.** Will begin after Part 2. Sprint plan per brief §3.7 (5 sprints, foundation → events → athlete+race → rankings+simulator → locations+guides+polish).

Decisions confirmed:
- Data sourcing: seed JSON now, scraper local-only (Part 3 §3.3 Option B)
- Map: MapLibre + MapTiler free tier (§3.0.14)
- Storage: Upstash Redis + Drizzle (§3.3 schema + §3.4 gate counter)
- Branding: Vyrek primary (chartreuse) + Results accents cyan/magenta/amber, scoped to `/results/*`

---

## Outstanding TODOs

1. **User decision on photo sourcing** — pick a tier from `docs/photo-sourcing-brief.md` (or "stay on current stock"). Without this, ~140 slots remain sub-optimal.
2. **WebP-at-rest** — install `cwebp` (`brew install webp`) and re-export the 28 deployed JPEGs as WebP if Vercel's wire conversion isn't enough. Not blocking.
3. **Re-measure Lighthouse on home after §1.4 deploy** — confirm no regression from the 74 perf score the home page is sitting on (LCP-dominated by hero element).

## Skipped items and reasons

- **53 ChatGPT-generated PNGs** in `/photos/` — excluded per user Q1; would violate brief Hard Do-Not §1.
- **Inline blog imagery (60 images for 30 posts)** — deferred. Brief mentions but tier-A path requires a per-post stock search; defer to budget conversation.
- **Per-blog-post unique heroes** — current 4-cluster reuse is intentional per `lib/blog/posts.ts` design. Will be revisited if sourcing-brief §C4 funded.

---

## Last updated

2026-05-24 — Part 1 finalised (in flight: source-decision blocking some §1.7 criteria). Awaiting user direction before Part 2.
