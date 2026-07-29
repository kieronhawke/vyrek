# Content plan — master strategy

**Date:** 29 July 2026 · **Status:** PLAN (nothing publishes until scheduled)
**Companion files:** `hyrox-posts.csv` (the HYROX inventory), `pt-posts.csv`
(the client-intent PT inventory), `competitor-findings.md` (research digest).

The brief: a minimum of 400 HYROX posts and 300 personal-training posts, each
planned with target, keyword, rationale, volume, method, SEO strategy, image
plan, metadata and mobile/sharing treatment.

**Delivered: 792 posts — 454 HYROX, 338 PT.**

---

## 1. The honest maths first

Hard rule: publishing velocity is capped at **15–25 pages a month** and blog
posts share that budget with location pages. At a blog share of ~15/month:

| Milestone | When |
|---|---|
| Wave 1 complete (87 highest-value posts) | ~month 6 |
| Waves 1–2 (257 posts) | ~month 17 |
| 454 HYROX posts | ~month 30 |
| Full 792-post inventory | ~month 53 |

This is a **multi-year editorial pipeline, sequenced by commercial value** —
that is what the `wave` column encodes. Attempting 700 posts in months would
trip Google's scaled-content enforcement and burn the domain. The inventory
is the map; the waves are the route.

**Wave definitions**
- **Wave 1** — evidenced keyword, KD ≤ 30 or unique-authority topic, direct
  conversion path. Publish first.
- **Wave 2** — evidenced or strong long-tail; builds the cluster spines.
- **Wave 3** — cluster completion; internal-link mass; niche capture.
- **Wave 4** — glossary, FAQ micro-posts, seasonal, long-tail sweep.
- Posts with `status = blocked-results` need the results layer (open
  question 1) and do not enter the queue until it resolves.
- Posts with `status = refresh` are existing live posts upgraded to this
  standard — refreshes are cheap wins and **do not count against the
  new-page velocity cap.**

## 1b. Five research findings that drive the whole plan

From the live competitor audits (`competitor-findings.md`):

1. **"HYROX training plan" and "hyrox stations" have no independent
   specialist in the top 5.** Big-DA gyms hold them with thin content; a
   tutoring marketplace ranks for the stations query. Biggest openings in
   the niche.
2. **"Couch to HYROX" is owned by nobody.** The top-of-funnel term for our
   entire beginner segment is unclaimed. Wave 1, flagship pillar.
3. **The Elite 15 byline is a proven ranking factor.** A competitor ranks
   top-5 on a hugely contested term substantially on "From Elite 15
   Athlete [name]" in the title. Ben has that credential natively — it goes
   in **title tags**, not just the About page.
4. **Venue intelligence is a structural gap.** Everyone writes city guides
   (dates, tickets, hotels). Nobody writes floor surfaces, arena heat,
   course-length variance, wave timing or RoxZone geometry — the things a
   competitor actually needs.
5. **UK PT search is contaminated by course sellers.** OriGym and similar
   rank for client keyword strings with "become a PT" intent. Every
   client-intent title must signal buyer framing ("cost you", "should you",
   "before you pay") or Google reads us as their near-duplicate.

## 2. Why these targets (selection logic)

Every post in the CSVs traces to at least one of:

1. **Evidenced keyword** — a row in `data/keywords.csv` (Semrush, volume +
   KD recorded in the CSV). `evidence = semrush`.
2. **Question inventory** — real questions collected from live SERP research
   (see `competitor-findings.md`). Volume columns stay **empty** for these:
   we do not invent numbers. `evidence = longtail-unevidenced`.
3. **Competitor gap** — a topic competitors cover thinly or not at all,
   where we hold an authority advantage (Ben's Elite 15 status, doubles
   experience, our results data once licensed).
4. **Funnel need** — the post exists to convert or reassure (comparisons,
   cost transparency, objection-handlers), not primarily to rank.

The buyer-type filter (hard rule 2) is applied: **zero** posts target
PT-jobs, PT-course or facility intent, however easy those keywords are.

## 3. SEO system (applies to every post)

**On-page**
- One primary keyword per post, in: title (front-loaded), H1 (identical or
  near), first 100 words, one H2, slug. Secondary phrasings as H2/H3s.
- Question posts open with a 40–60 word direct answer block (snippet +
  AI-citation target), then depth.
- UK English throughout. Descriptive Hyrox use only, never implied
  affiliation (hard rule 4); footer disclaimer already sitewide.
- No invented statistics, testimonials or "studies show" without a link to
  the actual source (hard rule 1). E-E-A-T is our moat: Ben's first-hand
  race experience gets written into every post where it is true, with his
  author entity attached.

**Architecture**
- Every post links UP to its cluster hub (the `hub_link` column), SIDEWAYS
  to 2–4 siblings, and DOWN-funnel via its CTA. Hubs link back to their
  best children. This hub-and-spoke is what makes 400 posts a moat instead
  of a heap.
- Canonicals: sibling intents that share a SERP (e.g. "what does hyrox
  stand for" vs "hyrox meaning") get separate posts ONLY where the live
  SERPs differ; otherwise one canonical post carries both phrasings. The
  CSV consolidates known duplicates already.
- Misspelling traffic (hydrox/hirox, 2,890 vol) is handled with one
  disambiguation post + server redirects — not a misspelled-content farm.

**Metadata (columns in the CSVs)**
- `meta_title`: post title + " | Suth Performance", target ≤ 60 chars
  visible; front-load the keyword. Draft values generated; human pass
  before publish.
- `meta_description`: 150–158 chars, states the promise + the authority
  ("From the Elite 15 HYROX coaching team"). Draft values in CSV.
- `schema` column: Article + BreadcrumbList always; FAQPage on pillars and
  FAQ posts; HowTo on stepped guides; DefinedTerm on glossary pages.
  Author → Person (Ben Sutherland) with sameAs → his Instagram; Publisher →
  Organisation. This wires the entity graph AI search engines cite.
- Tags: cluster name + 2–3 topic tags from a controlled vocabulary (no
  free-tagging; tag pages stay noindex until they have ≥5 posts).

**Ranking strategy per difficulty band**
- KD ≤ 15: publish excellent page, internal links from hub — expect top-10
  within 8–12 weeks once indexing opens.
- KD 16–30: above + 2–3 internal links from existing ranking pages +
  refresh cycle at 90 days based on Search Console queries.
- KD > 30 head terms (hyrox workout 22k, hyrox training 3.6k): win the
  cluster first; the pillar inherits authority from 20+ ranking children.
  These are wave-later by design.
- Refresh loop: every post gets a Search Console review at 90 days; titles
  retuned to actual query language; decay candidates updated annually
  (records, calendars, prices are `maintained` content).

## 4. Image system

**Sourcing ladder (in order):**
1. **Own shoot** (`image_source = own-photo`) — the track/gym shoot pool in
   `public/media/images/` (~100 assets). The CSV assigns specific assets or
   pools. Real photos of real training are our authenticity signal; reuse
   across posts is fine with different crops — a consistent look is a brand
   feature, not a bug.
2. **Data graphics** (`image_source = data-graphic`) — charts, tables,
   diagrams rendered in brand style (dark/chartreuse, Geist). These are
   *unique images no competitor has*, they earn image-SERP traffic and
   citations, and they cost no photography. Roughly a third of the
   inventory uses them.
3. **AI-generated photography** (`image_source = ai-generate`) — used when
   the pool has no fit. The `image_concept` column is the generation brief.

**AI image policy (supersedes the earlier blanket exclusion, per Kieron's
instruction of 29 July 2026 — for blog editorial imagery only):**
- Photorealistic, editorial, consistent grade with the own-shoot look
  (natural light, honest sweat, imperfect gyms — chalk dust, worn plates).
- **Never**: the Hyrox logo or branding rendered into images (trademark
  hard rule); depictions presented as a specific real event or a real
  person; fake "client results" imagery; AI images in testimonial or proof
  contexts (hard rule 1 territory). AI images illustrate; they never evidence.
- Authenticity checklist before use: hands/fingers correct, plate sizes
  plausible, erg chains/cables right, no garbled text anywhere in frame,
  lighting direction consistent. Regenerate rather than ship uncanny.
- Internal manifest records which images are AI-generated (extends
  `docs/image-manifest.json`), so we always know what is real.

**Every image ships with:** descriptive alt text containing the topic
naturally (not keyword-stuffed), width/height set (no CLS), AVIF/WebP via
`next/image`, lazy-loading below the fold, hero ≤ 200 KB.

## 5. Social sharing / OG treatment

- Per-post OG image at **1200 × 630** generated at build time from a brand
  template: post image (photo or graphic) + title band in the dark/
  chartreuse system + small S-monogram. The `og_treatment` column specifies
  photo-based vs stat-card treatment per post.
- Data-story posts share as **headline-stat cards** ("The average first
  HYROX takes X minutes" — only once the stat is real) — the highest
  share-through format in this niche.
- Twitter/X `summary_large_image`, OG type `article`, author + published/
  modified timestamps in OG and schema. Shared links must look deliberate
  in WhatsApp/Slack previews — that is where gym communities share.

## 6. Mobile

The blog templates already scored well in the desktop/mobile audits; the
per-post rules that keep it that way:
- One-column reading measure, 16px+ body, generous line height; tables get
  `overflow-x` containers (weights/times tables are wide); no content
  behind hover.
- Workout cards and checklists formatted as scannable blocks, not prose —
  most of this audience reads mid-gym on a phone.
- CTAs: inline after the answer block, again at end; thumb-reachable,
  no popups (Google interstitial penalty + they're obnoxious).
- Core Web Vitals budget per post: LCP < 2.5s on 4G, CLS < 0.1 — enforced
  by the existing Lighthouse scripts; heroes are the main risk, hence the
  200 KB cap.

## 7. CTA system (columns `cta_primary`, `cta_secondary`)

Mapped per cluster, not per whim:
- HYROX training/stations/plans → **free HYROX plan maker (PDF)**, then quiz.
- Times/results/data → **results lookup / percentile check**, then plan maker.
- Comparisons/apps → **7-day Hub trial** (decision-stage readers).
- PT cost/value/FAQ → **transparent pricing + free assessment**.
- Online coaching → **book a free call with Ben** (the consultative close).
- Every post's final CTA block also carries the location-page crosslink
  where a geo match exists ("training in Manchester? → page").

## 8. Measurement

- Search Console: query/position per post at 90-day reviews.
- GA4: CTA click-through per post (plan-maker starts, quiz starts, call
  bookings) — posts are judged on assisted conversions, not pageviews.
- Quarterly: cull-or-improve review of anything with zero impressions at
  9 months (thin-content hygiene Google rewards).

## 8b. Five cheap moves the research surfaced

Not posts, but they multiply what the posts achieve. Each is a day or less
of work:

1. **Put "Elite 15" in title tags** where it is honestly relevant. Proven
   ranking factor in this niche (finding 3 above). Costs nothing.
2. **Publish an editorial-standards page** naming the source hierarchy:
   official HYROX data → peer-reviewed position stands (ISSN/ACSM/IOC) →
   Ben's own logged training. A rival does this and it is a strong E-E-A-T
   signal for cheap.
3. **Submit a separate image sitemap.** A competitor ranks in Google Images
   off the back of one. Trivial to add.
4. **Build the free-tools bundle** (pace calculator, session timer,
   equipment substitution table, packing checklist). Rivals use exactly
   this to acquire links, and no UK brand owns the PT-side equivalents —
   cost calculator, coaching-model quiz, regional price index.
5. **Serialise the big clusters.** Multi-part masterclasses published on a
   cadence build internal linking and return visits better than standalone
   posts. The race-week and station clusters are natural series.

## 9. Dependencies and blockers (honest list)

1. **Indexing is off** sitewide (deliberate). The entire plan compounds
   only after Kieron flips the switch; publishing can begin beforehand so
   the archive is ready.
2. **Results-data posts** (16 in the inventory) blocked on open question 1.
3. **Race calendars/tickets/records** are maintained content — they need an
   update owner (quarterly minimum) or they become liability content.
4. **Medical-adjacent posts** (pregnancy, postnatal, menopause, injury)
   ship with conservative framing and professional-review sign-off — worth
   a standing arrangement with a physio for review credits (also E-E-A-T).
5. OG image generation template needs building once (then it is free).
