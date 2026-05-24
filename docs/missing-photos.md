# Missing photos — slots that need real imagery — Brief v2 §1.6

**Generated:** 2026-05-24
**Source pool:** 2 real Adobe Stock JPEGs (h1, h2 — same shoot, same male white coach in his 30s) and 30 Pexels stock files. The 53 ChatGPT-generated PNGs in `/photos/` are excluded per your Q1.

This list is intentionally long. Every entry is a real slot where there is no purpose-shot photo in our inventory. Today these slots either render stock (Pexels) or render an "intentional" duplicate of a shared image. None are broken; all are sub-optimal vs a real photoshoot. Each entry lists the **§1.2 verdict**, the **subject / composition / mood a real replacement would need**, and the suggested route to source it.

## How to use this list

Three escalation tiers per slot, pick the one that fits your budget:

- **Tier A — Pexels / Unsplash search** with the suggested terms. Free, royalty-free, no consent needed for stock models. ~1 hr per cluster.
- **Tier B — Adobe Stock licence** matching the look of h1/h2 (warm gym shots). £25–80 per image, instant.
- **Tier C — Commission a photoshoot** with a real coach + 3-5 real athletes at one or two Hyrox-style gyms. £1500–3000 for a half-day shoot, ~150 deliverable frames, every brand surface covered for 18+ months.

`docs/photo-sourcing-brief.md` is the commission-ready brief for Tier C.

---

## Cluster 1 — Hero backdrops (CRITICAL — first impression)

These are the LCP elements. Every visitor sees one within 1.5 s.

### Home Hero (`components/marketing/hero.tsx` line 92)

- Current: `v2/coach-james-wright.jpg` (Pexels coach portrait, repurposed as a wide backdrop)
- §1.2 verdict: **keep** (best of the catalogue) but **replace if better photo lands**
- Required subject: a Hyrox athlete mid-effort (sled push, wall ball, or burpee) — gritty, race-pace
- Required composition: landscape ≥1920w with text headroom on the left third (the H1 sits there)
- Required mood: intense, cinematic, controlled — not cheerful gym-bro
- Tier A search terms: "hyrox sled push wide", "functional fitness intense backdrop", "athlete profile cinematic", "gym wide angle hero"
- Tier C shot list note: one wide-angle hero plate per programme — sled push (Sub-90), running outdoor (First Race), partners doubles, elite intensity (Pro). Frame allows generous left-side negative space for typography.

### About Hero (`app/about/page.tsx` line 49)

- Current: `v2/bento-coaches.jpg` (Pexels coach + athlete instructive shot, reused as the page hero)
- §1.2 verdict: **keep**, **replace if better photo lands**
- Required subject: a real coach demonstrating to a real athlete, OR a wide team shot
- Required composition: landscape, generous breathing room
- Required mood: instructive, warm-but-serious — about-page is the "trust us" page
- Tier A search terms: "personal trainer one-on-one instruction", "coach explaining hyrox technique"

### Partners Hero (`app/partners/page.tsx` line 127)

- Current: `v2/bento-coaches.jpg` (same image as About Hero — intentional brand link)
- §1.2 verdict: **keep** until a better partners-specific shot lands
- Required subject: a coach engaging with their athletes / their phone audience — implies "earnings recipient"
- Required composition: landscape with right-side text headroom
- Required mood: confident, business-friendly, not "intimidating elite"
- Tier A search terms: "fitness creator instagram", "coach behind camera filming workout", "fitness business owner"

### Plans goal-template hero (`app/plans/[slug]/page.tsx`, 8 routes)

- Current: per-programme `v2/programme-{programmeSlug}.jpg` — same as /programmes
- §1.2 verdict: **keep** but each goal-time plan (sub-60, sub-75, sub-90, sub-100) would ideally have its own goal-specific imagery
- Required subject: athlete embodying the goal — e.g. sub-60 = clearly elite physique mid-race-pace; beginner = first-timer at a starting line
- Required composition: landscape with text overlay headroom
- Required mood: aspirational, achievement-tied
- Tier A search terms: per goal — "elite hyrox finisher", "first race hyrox finish line", "masters athlete finishing", "doubles team race-day"

---

## Cluster 2 — Coach hub portraits (BRAND-CRITICAL)

### Coach 1 — James Wright

- Current: `v2/coach-james-wright-warm.jpg` (h1, just shipped in §1.4 — Adobe Stock, smiling white male in commercial gym)
- §1.2 verdict: **replace** when a real photo of James Wright lands
- Required subject: the actual James Wright in his actual gym, full body or 3/4
- Required composition: landscape OR portrait (the tile can crop either; 5:4 ideal)
- Required mood: confident, on-brand intense — but personable enough to read as a coach you'd DM
- Tier C shot list note: 5-10 frames of James across one session — portrait, half-body holding a kettlebell, action shot demonstrating a sled push, candid laughing with another athlete, looking-into-camera serious. Best frame → hero card, others → bio sheet + author photo + recruiter materials.

### Coach 2 placeholder

- Current: `v2/diverse-1.jpg` (Pexels — two women lifting together, heavily grayscale + opacity-30 + JOINING 2026 chip overlay)
- §1.2 verdict: **keep** for now, **replace** when a real second coach is hired
- Required: real photo of the new coach when they sign
- Source: portrait shoot at signing

### Coach 3 placeholder

- Current: `v2/diverse-2.jpg` (Pexels — mixed-age athletes mid-workout, same dimmed treatment)
- Same as Coach 2 — real photo when hired

---

## Cluster 3 — Testimonial portraits (TRUST CRITICAL)

### Sarah B. — First Race graduate, Bristol

- Current: `v2/testimonial-sarah.jpg` (Pexels — female runner in her thirties on a UK street)
- §1.2 verdict: **replace** when a real consented member quote + photo lands
- Required subject: real consented Vyrek graduate, ideally a real Hyrox finish photo of a real woman in her 30s, Bristol if possible
- Required composition: tight 5:4 portrait or landscape with face dominant
- Required mood: post-finish satisfaction, not stocky-smile
- Sourcing: contact existing first-race members for consented quote + finish-line photo; ASA/CAP code 3.7 requires consent docs on file before going off the "Pre-launch · illustrative" badge

### Marcus T. — Sub-90 graduate, Manchester

- Current: `v2/testimonial-marcus.jpg` (Pexels male on the sled, sub-90 effort)
- Same fix — real consented member with photo

### Alex & Jamie — Doubles, Edinburgh

- Current: `v2/testimonial-doubles.jpg` (Pexels — two people high-fiving after workout)
- Same fix

---

## Cluster 4 — Programme card backdrops (4 of them)

Used across `/programmes`, `/quiz?program=X`, `/plans/[slug]`, blog post hero clusters.

### Programme — First Race

- Current: `v2/programme-first-race.jpg` (Pexels female runner outdoor track golden hour) — used **20×** across the site
- §1.2 verdict: **keep** (highest use, currently the most-recognisable Vyrek photo) — **replace** in a future pass for a real first-time-finisher hero shot
- Required subject: real first-time Hyrox finisher crossing the line, OR a beginner doing a sled push for the first time
- Required composition: landscape, room for the programme name across the top
- Required mood: aspirational, surprised-by-own-effort — the "I did it" beat
- Tier A search terms: "first hyrox finisher emotional", "marathon first finish line", "beginner sled push"

### Programme — Sub-90

- Current: `v2/programme-sub-90.jpg` (Pexels sled push, mid-effort) — used **17×**
- §1.2 verdict: **keep**, **replace** for a real sub-90 athlete shot
- Required subject: athlete in mid-race attacking a station, race bib visible
- Required mood: race-pace focus

### Programme — Doubles

- Current: `v2/programme-doubles.jpg` (Pexels two athletes training together)
- §1.2 verdict: **keep**, **replace** with two athletes mid-handoff or sharing a sled
- Required subject: two athletes coordinating a station transition — distinct from "two people working out near each other"
- Required mood: synchronised work, eye contact between partners
- Tier A search terms: "hyrox doubles handoff", "team relay transition", "partner workout station"

### Programme — Pro

- Current: `v2/programme-pro.jpg` (Pexels elite sled push) — used **18×**
- §1.2 verdict: **keep**, **replace** for elite Hyrox athlete imagery (top-10 finisher, podium, etc.)
- Required mood: elite intensity, post-race satisfaction

---

## Cluster 5 — Station-specific imagery (8 stations × variations)

The blog includes station-technique articles. The member app references the 8 Hyrox stations in `lib/member/demo.ts` for video thumbnails. None of these have purpose-shot photography.

### Ski Erg

- Current: `v2/video-ski-erg.jpg` (Pexels rowing-style indoor cardio — close, but it's a ROWER not a SkiErg)
- §1.2 verdict: **replace** — the wrong piece of kit reads as carelessness to actual Hyrox athletes
- Required subject: athlete on a Concept-2 SkiErg, mid-pull, technique visible
- Required composition: 16:9 landscape OR 4:3
- Required mood: technical, controlled effort
- Tier A search terms: "concept 2 skierg gym", "ski ergometer pull"

### Sled push

- Current: re-used `v2/programme-sub-90.jpg` and `v2/programme-pro.jpg` (both Pexels sled push)
- §1.2 verdict: **keep** (genuine sled push shots) but **replace** with an actual Hyrox-spec sled (50m run distance, weighted plates) to read as race-authentic

### Sled pull

- Current: `v2/video-sled-pull.jpg` (Pexels hand-over-hand sled pull)
- §1.2 verdict: **keep**, **replace** for grip detail close-ups

### Burpee broad jump

- Current: `v2/video-burpee.jpg` (Pexels mid-air burpee)
- §1.2 verdict: **replace** — the jump distance + chest-to-floor form in race context is distinctive

### Rowing

- Current: `v2/quiz-interstitial-3.jpg` (Pexels indoor rower)
- §1.2 verdict: **keep**, **replace** with stroke-rate visible technique

### Farmer's carry

- Current: `v2/video-farmers.jpg` (Pexels loaded carry walk)
- §1.2 verdict: **keep**, **replace** with Hyrox-spec handles (24kg / 16kg)

### Sandbag lunges

- Current: re-used `v2/how-step-3.jpg` (Pexels functional fitness intensity — generic)
- §1.2 verdict: **replace** — no real sandbag-lunge photo in inventory

### Wall balls

- Current: `v2/quiz-interstitial-2.jpg` + `v2/how-step-2.jpg` (Pexels wall ball shots, both used)
- §1.2 verdict: **keep**, **replace** with race-day wall ball station shot (target visible, clear depth)

### Tier A search terms across all stations

"hyrox sled push 152kg", "concept 2 skierg gym", "wall ball 9kg gym", "burpee broad jump 80m", "sandbag lunge 20kg", "farmers carry 24kg handles", "functional fitness women's race", "doubles relay handoff"

### Tier C shot list — Hyrox stations day

Half day at a UK Hyrox-affiliated gym (Sweat It, ARC, F45, etc.) shooting one circuit through every station with 2 athletes (1 M, 1 F). Aim 25-40 frames per station. Variants needed: tight (technique close-up), medium (whole-body in action), wide (station context). All in same lighting/colour-grade for visual coherence.

---

## Cluster 6 — Blog post hero illustrations (30 posts)

30 MDX posts currently share **4 hero images** clustered by topic:
- Run / pacing / sub-X topics → `programme-first-race.jpg` or `programme-sub-90.jpg`
- Strength / sled / station-technique topics → `programme-pro.jpg` or `programme-sub-90.jpg`
- Doubles topics → `programme-doubles.jpg`
- General planning / nutrition → `bento-plan.jpg`

### §1.2 verdict per post hero: **keep** (intentional category cluster); replace per-post when budget allows

### Required: 30 hero images, one per post

Categorise per-post: at minimum one hero per category (race-day, technique-per-station, doubles, nutrition, recovery, mental-game). 6 category-distinct heroes is the minimum viable improvement on the current 4 generic clusters.

### Inline blog images (90 needed)

The brief earlier asked for "cover + 2 inline minimum" per blog post. Currently inline images don't exist in MDX bodies. 60 additional inline images would be the deferred Stage 2 Part A.2 work — every post gets 2 mid-article illustrations matching the section topic.

### Tier A: per-post Pexels searches keyed by post topic
### Tier B: one Adobe Stock pack matching the brand grade (~£500 for 25-pack)
### Tier C: bundled into the half-day shoot — every station + 2-3 reaction / breath / kit shots per category

---

## Cluster 7 — Quiz V3 interstitials (3 surfaces)

Interstitials are short-exposure (~2s) screens that pace the quiz. Three slots exist:

### Reassurance 1, "We'll keep this short."

- Current: `v2/quiz-interstitial-1.jpg` (Pexels — calm pre-run, shoes)
- §1.2 verdict: **keep**, **replace** with a Vyrek-branded warm-up scene
- Required mood: low-stakes, "you're not committed to anything yet"

### Reassurance 2, "What's coming next" (3 tiles)

- Current: `v2/bento-plan.jpg`, `v2/programme-doubles.jpg`, `v2/bento-progress.jpg`
- §1.2 verdict: **keep**, all three would benefit from quiz-tailored imagery
- Required: three thumbnail-grade shots showing: (a) the plan-in-phone, (b) the actual training, (c) the post-session check-in. Currently using stock for all three.

### Calculating cinematic, "Building your plan"

- Current: `v2/programme-first-race.jpg`
- §1.2 verdict: **keep**, **replace** for a cinematic shot specific to the picked programme

The brief flagged "quiz interstitials are the easiest place to lose someone" — these are good Tier C shot-list candidates.

---

## Cluster 8 — Member app surfaces (text-only by design)

Per Stage 2 Part A audit, member-app surfaces (`/app/today`, `/app/plan`, `/app/account`, `/app/analysis/*`) are text-first by deliberate UX choice (Linear / Whoop pattern). The coach-video thumbnails ARE imagery, and they use the 14 station-clustered v2/ images.

### §1.2 verdict on member-app imagery: **keep** until a UX decision is made to add hero photos to member screens

No new photos needed here until that product decision changes.

---

## Cluster 9 — Empty states + 404 + error pages

### `/not-found.tsx`

- Currently text-only on-brand 404
- §1.2 verdict: **keep** OR add a quirky single image
- Required mood: lightly self-deprecating

### `/error.tsx`

- Same

### Empty states inside the member app

- Currently text-only
- Same

These aren't critical and arguably don't need imagery.

---

## Cluster 10 — Part 3 Results hub (NEW — needs imagery per brief §3.6)

Brief §3.6 says: "Empty states have a custom empty state with illustrative photo from new inventory + helpful CTA." Across 17 Results routes + station guides + location pages + athlete profiles, this is **dozens of empty-state photos plus venue / location hero photos**.

### Locations index (126+ cities)

- Required: per-city background photo (the brief notes hyresult uses `/loc/{IATA-CODE}.jpg` for city photos)
- Source: official city/airport stock libraries OR commission location-scouted shots at the UK cities only
- Tier A: Pexels city-skyline searches per IATA code — workable for the 20-30 most-trafficked cities, exhausting for all 126

### Athlete profile placeholders

- Required: per-athlete avatar OR a coloured initials circle when no photo
- Current plan: render initials in a chartreuse circle when no photo. No new photos required for v1.

### Race recap story-mode (Part 3 §3.0.5)

- Required: per-event venue/podium/atmospheric shots
- Source: event recap photography from race organisers OR press-pass shots from upcoming events you attend

### Station guides (9 stations + Roxzone)

- Required: per-station hero video OR still — Vyrek already has some coach video assets
- Cross-reference with `lib/video-assets.ts` for what's already available

---

## Cluster 11 — Race coverage posts (lib/race-coverage.ts auto-generates)

5 post heroes per event (T-14, T-7, T-1, T+1, T+7). Currently re-using `programme-pro`, `programme-sub-90`, `programme-first-race`, `bento-progress`, `coach-james-wright`.

### §1.2 verdict: **keep** for now, **replace** per-event with actual event photos when each Hyrox happens

### Required per event: 5 photos minimum
- T-14: programme-style aspirational
- T-7: race-week prep candid
- T-1: kit / start-line setup
- T+1: race day finish action
- T+7: podium / recap montage

### Source: event press photography OR commissioned race-day shooter

---

## Cluster 12 — Coach video posters (member app)

14 video thumbnails in `lib/member/demo.ts`, all wired to topic-distinct v2/ images after Stage 2 Part A. These work as posters but the actual video files don't exist yet — these are placeholders for future coach video drops.

### §1.2 verdict: **keep**, **replace each** with the actual first frame of each video when the videos exist

### Sourcing: video production by James Wright + future coaches, shoots produce both video + poster

---

## Headline numbers

| Bucket | Count |
|---|---|
| Slots where current Pexels is acceptable but a real photo would be better | ~45 |
| Slots where current image is *intentionally duplicated* across many surfaces (blog clusters, programme reuse) | ~28 |
| Slots where the photo is *semantically wrong* (e.g. SkiErg labelled but actually a rower) | 1 confirmed (SkiErg), ~5 likely if a Hyrox athlete reviewed |
| Slots that need imagery for Part 3 Results hub | 60+ once Part 3 is built |
| Slots with NO image and currently rendering empty / placeholder | Member-app surfaces (intentional), error pages |
| **TOTAL slots that would benefit from real photography** | **~140** |

## Honest assessment

**No 2 photos do a "site-wide overhaul" justice.** This list is the work the project genuinely needs to lift its photography from "decent Pexels stock" to "owned, recognisable, race-authentic visual identity". The biggest leverage on a small budget is:

1. **One half-day shoot with James Wright** (Cluster 2 + 3 + 4 partial) — £1500 ish, ~30 derived images
2. **One half-day Hyrox-station shoot** (Cluster 5 entirely) — £1500 ish, ~80 derived images
3. **Member testimonial gathering** (Cluster 3) — free; 30 days of outreach with consent forms

Total Tier C: £3-4k, replaces 90+ of the ~140 sub-optimal slots with brand-owned photography that solves the next 18 months.
