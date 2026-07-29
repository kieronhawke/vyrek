# Image and media plan

Companion to `master-strategy.md`. Covers sourcing, AI generation standards,
authenticity, sharing treatment and performance for the 700-post inventory.

---

## 1. What we already own

| Pool | Location | Count | Best used for |
|---|---|---|---|
| Track shoot (colour + b/w) | `public/media/images/track/` | ~25 | Running, pacing, doubles, mental/race-craft posts |
| Gym shoot | `public/media/images/track/gym-*` | ~5 | Erg, rowing, indoor training posts |
| Station guides | `public/media/images/guides/` | 8 | The eight station clusters (one each) |
| Marketing v2 set | `public/media/images/v2/` | ~38 | Coaching, plans, programme, quiz-adjacent posts |
| Ben portraits | `public/media/images/ben/` | 3 (placeholders) | Authority posts — **needs a real shoot** |

Roughly 109 image files today. The CSV assigns own-photo where a genuine
fit exists (about 60 posts). Reusing a photo across related posts with
different crops is fine and on-brand; what we must not do is use a photo
that misrepresents the content.

**Gap flagged:** `ben/*-placeholder.jpg` are placeholders. The posts that
lean hardest on Ben's authority (Elite 15, doubles world record, sub-60,
mental cues) need real photographs of Ben. That is a shoot, not a
generation job — this is the one place AI imagery would be dishonest.

## 2. Data graphics — the underrated win

About a third of the inventory is `image_source = data-graphic`: tables,
charts, diagrams, decision trees, session cards, rendered in brand style.

Why these matter more than stock photography:
- They are **unique images no competitor has** — genuine image-search assets.
- They get screenshotted and shared in gym WhatsApp groups, which is how
  this niche actually spreads content.
- They are cheap: build ~10 reusable chart/table components, then it is
  data entry.
- They carry the information, so they earn the link rather than decorate.

Build these components once: weights/standards table, pacing-splits table,
timeline/roadmap, comparison matrix, decision tree, session card,
distribution curve (for when results data lands), price-tier ladder.

## 3. AI-generated imagery — standards

Used where no owned photo fits (`image_source = ai-generate`, the largest
bucket). The `image_concept` column in the CSVs is the generation brief.

**Note on policy history:** the earlier photo inventory excluded AI imagery
site-wide. Kieron's instruction of 29 July 2026 permits generated imagery
for blog editorial once own photography is exhausted. That relaxation is
scoped to **editorial illustration only** and does not touch the
no-fabricated-proof rule.

**House style (keep every image in one visual family):**
- Photorealistic editorial documentary, not glossy stock.
- Natural or practical light; real UK gym environments — worn rubber floors,
  chalk dust, scuffed plates, ordinary kit.
- Muted grade with the brand's dark/chartreuse accents where natural.
- Real-looking people of varied age, build and ethnicity; effort on faces,
  not smiling models. No perfect abs as default.
- Compose for a 16:9 crop and a 1200×630 OG crop simultaneously.

**Hard limits:**
- **Never** render the HYROX logo, branded signage, or event branding
  (trademark hard rule 4).
- **Never** present a generated image as a specific real event, race,
  venue or person. City-guide imagery shows the *city*, never a claimed
  race scene.
- **Never** use generated imagery as proof: no client before/afters, no
  testimonial faces, no "results" imagery (hard rule 1).
- **Never** put text in generated images — models garble it and it looks
  fake instantly. Text goes on in the OG template layer.

**Authenticity QA checklist — every generated image, before it ships:**
1. Hands and fingers correct; grip physically plausible on the implement.
2. Equipment physics right: plate sizes, erg chains/handles, sled ropes,
   wall-ball trajectory, sandbag deformation.
3. Anatomy under load looks like effort, not a pose.
4. No garbled text, logos, numbers or bibs anywhere in frame.
5. Lighting direction and shadows consistent across the frame.
6. Background details survive a zoom (no melted equipment, no impossible
   architecture).
7. Would a HYROX athlete looking at this spot it as fake in 2 seconds? If
   maybe, regenerate.

**Provenance:** extend `docs/image-manifest.json` with an `origin` field
(`own-shoot` | `stock-licensed` | `ai-generated`) and the prompt used. We
must always be able to answer "is this real?" — internally and publicly.
Consider IPTC/C2PA metadata on generated files; it costs nothing and ages well.

## 4. Sharing (OG) treatment

- Every post gets a **1200 × 630** OG image built at build time from a
  template: base image + gradient scrim + title in brand type + small
  S-monogram. Nothing else — legible at WhatsApp thumbnail size.
- Two variants, set per post in the `og_treatment` column:
  - *photo + title band* — default, for photo-led posts.
  - *stat card* — for data posts: one big honest number, source noted.
    Only ever a real number.
- Test every template change at 3 sizes: WhatsApp thumb, X large card,
  LinkedIn. If the title is unreadable at thumb size, the title is too long
  for the card — truncate in the card, not the post.
- `twitter:card = summary_large_image`, OG type `article`, author, published
  and modified times.

## 5. Performance and mobile

- `next/image` everywhere; AVIF then WebP; explicit width/height (zero CLS).
- Hero images ≤ 200 KB after compression; in-body images ≤ 120 KB.
- Only the hero is eager/priority; everything below the fold lazy-loads.
- Art direction on mobile: heroes are composed so a 4:5 centre crop still
  works on a phone — most of this audience reads on a phone in a gym.
- Data graphics must be legible at 375px wide or ship with a scrollable
  container plus a text summary of the same data (also an accessibility
  and AI-citation win).
- Alt text: descriptive of the actual image, includes the topic naturally,
  never keyword-stuffed. Data graphics get their key finding in the alt text.

## 6. Video (later, but plan the slots now)

The station clusters and movement guides have obvious video slots, and
`public/media/videos/` already exists. When Ben films: 30–60s technique
clips per station, embedded with VideoObject schema, hosted self or YouTube
with the YouTube channel doubling as a second discovery surface (traffic
playbook §8). Blog posts are written so a video can be dropped in later
without a rewrite.
