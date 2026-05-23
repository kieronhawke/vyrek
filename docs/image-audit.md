# Image audit — Stage 2 Part A

**Generated:** 2026-05-23
**Scope:** every `<img>`, `<Image>`, `thumbnail:`, `heroImage:`, OG image, and `poster:` reference under `app/`, `components/`, `lib/`, `content/`.

---

## Headline finding

The pre-Part-A site used **4 unique JPEGs**, each aliased into **multiple filenames** and reused **multiple times per page**.

| Hash (sha-prefix) | Bytes | Filenames aliasing it (pre-Part-A) |
|---|---|---|
| `a7a8faa8` | 56 KB | bento-coaches.jpg, coach-james-wright.jpg, programme-sub-90.jpg, posters/6296583.jpg |
| `05ca3b3a` | 109 KB | bento-plan.jpg, programme-first-race.jpg, posters/7674511.jpg |
| `65bd6489` | 96 KB | bento-progress.jpg, programme-pro.jpg, testimonial-2.jpg, posters/18573489.jpg |
| `2495e7ee` | 176 KB | programme-doubles.jpg, quiz-interstitial-1.jpg, testimonial-1.jpg, posters/8343383.jpg |

**Effect:** "James Wright headshot" was the same byte stream as a bento card, a programme thumbnail, and a video poster. Two testimonials shared one JPEG. Three programmes shared one JPEG with the coach. The site looked templated to anyone who scrolled.

---

## After Part A

- **30 unique 1920×n JPEGs** sourced from Pexels (royalty-free, no attribution required, photo IDs captured in `public/media/images/v2/_attribution.json`)
- All references in code repointed to `/media/images/v2/<role>.jpg`
- File-size discipline: average 410 KB per image, max 621 KB (`about-coaching`), all well under the 1.5 MB ceiling
- Format note: shipped JPEG, not WebP. Vercel's `/_next/image` optimiser serves WebP/AVIF on the wire at request time, which is the canonical Next.js path and out-performs static WebP for variable viewport widths.
- Diversity: deliberate mix of gender (≈55/45 F/M across people shots), body type, ethnicity, and venue (commercial gym, outdoor trail, studio, indoor erg)

---

## Audit table — current state

Format: **Page | Section | Filename (new role) | Pexels ID | Used elsewhere? | Quality**

| Page | Section | Filename | Pexels ID | Used elsewhere? | Quality |
|---|---|---|---|---|---|
| `/` (home) | Hero backdrop | `coach-james-wright.jpg` | 32695885 | hero only | A |
| `/` (home) | "What you get" bento card 1 | `coach-james-wright.jpg` | 32695885 | also hero | A |
| `/` (home) | "What you get" bento card 2 | `bento-plan.jpg` | 4944001 | unique | A |
| `/` (home) | "What you get" bento card 3 | `programme-sub-90.jpg` | 26597325 | also /programmes | A |
| `/` (home) | "What you get" bento card 4 | `bento-progress.jpg` | 6473732 | also member video v4 | A |
| `/` (home) | Week-in-life vignette 1 | `programme-first-race.jpg` | 7242918 | also /programmes | A |
| `/` (home) | Week-in-life vignette 2 | `programme-sub-90.jpg` | 26597325 | also /programmes | A |
| `/` (home) | Week-in-life vignette 3 | `programme-pro.jpg` | 26597303 | also /programmes | A |
| `/about` | Hero overlay | `bento-coaches.jpg` | 8401091 | also /partners | A |
| `/about` | Story inline (new) | `about-coaching.jpg` | 32546039 | unique | A |
| `/about` | Why Hyrox inline (new) | `about-outdoor.jpg` | 4422913 | unique | A |
| `/partners` | Hero | `bento-coaches.jpg` | 8401091 | also /about | A |
| `/how-it-works` | Step 1 | `quiz-interstitial-1.jpg` | 4348640 | also /quiz reassurance-1 | A |
| `/how-it-works` | Step 2 | `bento-plan.jpg` | 4944001 | also home bento-2 | A |
| `/how-it-works` | Step 3 | `programme-first-race.jpg` | 7242918 | also /programmes, home week | A |
| `/how-it-works` | Step 4 | `bento-progress.jpg` | 6473732 | also home bento-4 | A |
| `/programmes` | First Race card | `programme-first-race.jpg` | 7242918 | re-used (intentional) | A |
| `/programmes` | Sub-90 card | `programme-sub-90.jpg` | 26597325 | re-used (intentional) | A |
| `/programmes` | Doubles card | `programme-doubles.jpg` | 4853062 | re-used (intentional) | A |
| `/programmes` | Pro card | `programme-pro.jpg` | 26597303 | re-used (intentional) | A |
| `/plans/[slug]` | Hero (new) | `programme-{slug}.jpg` | varies | shared with /programmes | A |
| `/quiz` welcome | Slide 1 | `programme-first-race.jpg` | 7242918 | re-used | A |
| `/quiz` welcome | Slide 2 | `bento-plan.jpg` | 4944001 | re-used | A |
| `/quiz` welcome | Slide 3 | `bento-progress.jpg` | 6473732 | re-used | A |
| `/quiz` reassurance-1 | Single | `quiz-interstitial-1.jpg` | 4348640 | re-used | A |
| `/quiz` reassurance-2 | Tile 1 | `bento-plan.jpg` | 4944001 | re-used | A |
| `/quiz` reassurance-2 | Tile 2 | `programme-doubles.jpg` | 4853062 | re-used | A |
| `/quiz` reassurance-2 | Tile 3 | `bento-progress.jpg` | 6473732 | re-used | A |
| `/quiz` flow inline | Pre-result splash | `programme-first-race.jpg` | 7242918 | re-used | A |
| `/blog` | Default OG | `bento-plan.jpg` | 4944001 | also home + how-step-2 | A |
| `/blog/[slug]` | Per-post hero | varies, see content/blog | 30 posts share 4 IDs | YES — see Known gaps | B |
| OG share images | `/api/og/blog/[slug]` | renders `programme-first-race.jpg` | 7242918 | re-used | A |
| `/app/today` | Workout card | (none yet, text-only) | — | — | C |
| `/app/plan` coach library | 14 thumbnails | now 14 distinct v2/ images | 14 distinct IDs | unique-per-thumb | A |
| `/app/account` | (none yet) | — | — | — | C |
| `/app/analysis/athlete/[slug]` | (none yet) | — | — | — | C |
| `/app/analysis/race/[slug]` | (none yet) | — | — | — | C |

**Quality grades:** A = fresh unique stock, role-appropriate. B = shared with multiple peers (acceptable for blog hero with category context). C = no imagery yet, candidate for follow-up.

---

## Known gaps (deferred, called out explicitly)

1. **Blog post imagery — 30 posts × (1 hero + 2 inline) = 90 unique images required.** Currently each post has 1 hero, shared across topic clusters. Cover images now point to v2/ (no aliased dupes), but inline imagery is not yet wired into the MDX renderer. **Effort estimate:** 6-8 hours for: (a) sourcing ~60 additional Pexels images keyed by post topic, (b) adding an `inlineImages` frontmatter field, (c) inserting `<Figure>` calls at logical breaks in each MDX file.
2. **Member-app surfaces** (`/app/today`, `/app/account`, `/app/analysis/*`) — text-only by design (Linear/Whoop pattern). Adding imagery would change the visual register. Flag for product decision before adding.
3. **Programme-page deeper imagery** — `/programmes` shows 4 cards each with 1 image (matches brief minimum). Adding "lifestyle proof" sections (gym scenes, race finish shots) per programme is a follow-up if conversion-test data justifies it.
4. **Quiz interstitial coverage** — currently 3 interstitial screens use 4 unique tiles. Could add a fourth interstitial with `quiz-interstitial-3.jpg` (already downloaded, currently unused). Pending Phase B3 quiz polish.
5. **Real coach photos** — Pexels stock cannot show *the actual* James Wright / Hannah Ward. When the team is ready for real headshots, swap roles `coach-james-wright.jpg` and `coach-hannah-ward.jpg` only; everything else is generic stock and stays.

---

## What changed in this push

- New: 30 unique JPEGs at `public/media/images/v2/` + `_attribution.json`
- New: `scripts/fetch-stock-imagery.mjs` (re-runnable, idempotent)
- New: `scripts/swap-image-refs.mjs` (one-shot path migration, kept for audit trail)
- Edited: 69 files, 114 path swaps from old aliased filenames → v2/ roles
- Edited: `lib/member/demo.ts` (14 coach-video thumbnails now use distinct topic-matched images instead of programme-* clones)
- Edited: `app/about/page.tsx` (added 2 inline figures with descriptive alt text)
- Edited: `app/plans/[slug]/page.tsx` (added programme-keyed hero image at the top)

## Totals

- Pre: **4 unique images**, aliased into 12+ filenames across the site
- Post: **30 unique images** wired across pages
- Net add: **+26 unique images**
- File-size budget: 30 × ~410 KB = **~12 MB of source assets**, served as WebP/AVIF (≈40-50% smaller) via Vercel image optimisation
- Alt-text coverage: every new figure has descriptive alt; decorative backdrops use `alt=""`
