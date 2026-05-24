# Diversity audit — post Part 1.4 swap — Brief v2 §1.7

**Generated:** 2026-05-24
**Scope:** subjects in every image currently rendered on the site (28 deployed files, 124 call sites). Counts are per-image-file, not per-call-site, so an image used 20 times counts once. Where a single image contains multiple visible subjects (e.g. mixed-gender doubles), each subject is counted.

## Method

Walked every entry in `docs/image-manifest.json` and tagged the visible primary subject(s) from my inspection notes + the alt strings + the rolling Pexels metadata. Where a subject is genuinely indeterminate (hand-only, equipment-only, dawn-trail-runner-too-far-to-tell), they're counted in "unidentifiable" rather than guessed at.

## Counts

### By gender

| Gender | Image files | % of identifiable subjects |
|---|---:|---:|
| Male | 11 | 44% |
| Female | 7 | 28% |
| Mixed (multiple visible subjects of different genders) | 7 | 28% |
| Unidentifiable / equipment-only | 7 | — |
| **Total identifiable** | **25** | **100%** |

### By age bracket

| Age | Image files |
|---|---:|
| 20-29 | 4 |
| 30-39 | 18 |
| 40+ | 1 (diverse-2 carries a clearly older athlete in the mix) |
| Mixed-age | 2 |
| Unknown | 3 |

### By ethnicity (best-effort from photo inspection)

| Ethnicity | Image files |
|---|---:|
| White / European | 17 |
| Black | 2 |
| Asian | 1 |
| Latine | 1 |
| Mixed / multiracial scene | 4 |
| Indeterminate / not visible | 3 |

### By body type

| Build | Image files |
|---|---:|
| Athletic / lean | 19 |
| Muscular | 4 |
| Average / non-elite | 3 |
| Indeterminate | 2 |

### By setting

| Setting | Files |
|---|---:|
| Indoor gym (commercial) | 14 |
| Indoor functional / Hyrox-style box | 6 |
| Outdoor track / trail | 4 |
| Outdoor street / urban | 2 |
| Studio / posed | 2 |

### By mood / register

| Mood | Files |
|---|---:|
| Intense / race-pace | 11 |
| Focused / technical | 7 |
| Warm / smiling | 3 (h1, h2 + bento-coaches) |
| Calm / recovery | 3 |
| Aspirational / cinematic | 4 |

## Findings

### What's strong

- **Gender mix close to 50/50** when accounting for mixed-subject images.
- **Age bracket 30-39 dominates** (matches the Vyrek brand demo).
- **Body types are mostly lean-athletic** which fits the Hyrox audience.

### What's under-represented (real gaps)

1. **40+ athletes (Masters category)** — only 1 image features a visibly 40+ subject, and it's a multi-subject background frame. Vyrek programmes explicitly target Masters; the imagery doesn't reflect that.
2. **Athletes outside white/European ethnicity** — 4 of 25 identifiable single-subject images. Hyrox demographics in the UK are more diverse than this set suggests.
3. **Non-lean body types** — almost zero images of athletes who don't already look athletic. First Race programme is explicitly for first-timers; the imagery sets a fitness-prerequisite that the programme itself doesn't.
4. **Real members in real Hyrox events** — every "race" or "competition" image is stock; none captures the actual UK Hyrox race-day environment, branding, venue signage.
5. **Adaptive athletes** — zero representation. Brief §3.0.9 references HYROX ADAPTIVE as a division; imagery has no parallel.

### What just got better with §1.4

- +2 male images of the *same* white coach (h1, h2) — net diversity neutral, brand-coherence improved
- `coach-james-wright.jpg` call sites dropped from 9 → 7 — slightly less monoculture on the home page

### What's actually impossible to fix from the current inventory

Every gap above. There's no female-Masters image in our 30 Pexels files, no Adaptive image, no truly-non-lean-body image. The two h1/h2 additions don't move any of these.

## Recommendation

The §1.6 missing-photos brief lists ~140 sub-optimal slots. **The 5 diversity gaps above should be elevated to top-of-list** in `docs/photo-sourcing-brief.md`:

1. Commission shots of UK Masters athletes (40-55, both genders)
2. Cast diverse models for the half-day shoot: at minimum 1 Black athlete, 1 South Asian athlete, 1 East Asian athlete
3. Cast a non-lean first-timer as the protagonist of the First Race programme imagery — solves a brand-promise gap
4. Cast at least one Adaptive athlete if any UK race photography is commissioned
5. Use real UK Hyrox event press photography (with rights cleared) for the Results hub city + venue heroes

## Acceptance criteria checkpoint

Brief §1.7 acceptance: "Diversity report shows balanced representation."

**Honest status:** **NOT MET** for ethnicity (white-dominant), age (under-40 dominant), body type (lean-dominant), and adaptive representation (absent). This is a **blocked-on-source** failure — no inventory exists to meet the criterion. See `docs/photo-sourcing-brief.md` for the commission spec to close it.
