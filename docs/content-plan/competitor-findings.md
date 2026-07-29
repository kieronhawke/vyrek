# Competitor findings

Live research, 29 July 2026. Two parallel audits: the HYROX content niche
and UK client-intent personal-training search. This is the evidence base
for the angles in `hyrox-posts.csv` and `pt-posts.csv`.

**Method note:** hyroxvault.com, hyrox.com and findyouredge.app return HTTP
403 to crawlers, so their inventories are reconstructed from SERP data
rather than sitemap crawls. roxlyfe.com and hyroxdatalab.com were crawled
directly.

---

# Part 1 — the HYROX niche

## Who we are actually competing with

| Site | Scale | What they own | Where they're weak |
|---|---|---|---|
| **roxlyfe.com** | 1,062 URLs | ~400 city/race guides (40% of their site), 80 athlete interviews, station guides. #1 for RoxZone. | Data is anecdotal, not systematic. Thin on masters, women, venue conditions, injury, recovery periodisation. City guides are event listings, not venue intelligence. |
| **hyroxdatalab.com** | 108 articles | Claims a 700,000-race dataset. 62 travel/venue guides, interactive race analyser, pacing calculator. Ranks top-5 on most benchmark queries. | **The primary long-term rival, not roxlyfe.** Executing city-guides-plus-data better than anyone. No coaching voice, no first-hand athlete credibility. |
| **hyroxvault.com** | 2,273 verified gyms | The biggest programmatic asset in the niche. Live race tracker. Multi-part serialised masterclasses. Published editorial-standards page. | Almost no human/athlete content, no results analysis, no coaching POV, no age-group or women's content. |
| **rmr.training** | ~96 articles | Coach-voice essays, podcast recaps, free tools. #1 for "hyrox warm up". | **Closest positional analogue to us.** US-centric, no city guides, no station reference, no data. This is the model to out-execute. |
| **hyrox.com** (official) | Thin | Enormous authority. Rules, FAQ, Elite 15 pages. | Zero training or technique editorial. **Rules ship as a PDF** and support content sits on Zendesk — both routinely outranked by good HTML. |
| **theprogrm.com** | CrossFit-first | Holds **#1 for "what is a good hyrox time"** — the highest-value query in the niche. | With a generic article. Attention split between CrossFit and HYROX. That #1 is soft. |
| **runna.com** | 1 HYROX post | Not a content competitor. Competes on product; ranks on brand authority only. | Every HYROX informational query is uncontested by them. |
| Big-brand gyms (PureGym, Red Bull, Centr, Gymshark) | High DA | Own many head terms with generic content. | Beatable on specificity and first-hand credibility, not on authority. |

## The three findings that shape our plan

**1. "HYROX training plan" has no independent specialist in the top 5.**
Big-DA gyms own it with thin content. Same story for "hyrox stations" —
a *tutoring marketplace* ranks there. These are the biggest single
opportunities in the niche.

**2. "Couch to HYROX" is owned by nobody.** No authority site holds it.
It is the top-of-funnel term for our entire beginner segment, and it is
sitting unclaimed. This is why it's a wave-1 flagship pillar.

**3. The Elite 15 byline is a proven ranking factor here.** REP Fitness
ranks top-5 on a hugely contested term substantially on the strength of
"From Elite 15 Athlete Ryan Kent" in the title. Ben has that credential
natively. **It belongs in title tags, not just the About page.**

## Confirmed gaps we build into

Structural gaps, in rough order of value:

- **Venue intelligence.** Everyone writes city *guides* (dates, tickets,
  hotels). Nobody writes what a competitor needs: floor surface and how it
  changes sled behaviour, arena heat and humidity, course-length variance
  (laps measure 1.05–1.10km on watches, which breaks pacing plans), wave
  timing and sled degradation across a race day, RoxZone geometry per venue.
  Only a *flooring supplier* ranks for the surface question.
- **Injury and return-to-race.** Physio clinics own every HYROX injury
  query with zero HYROX-specific programming. No HYROX site competes.
- **Pacing physiology.** All pacing content in the niche is heuristic.
  LT1/LT2, lactate clearance and cardiac drift across the run-station
  structure is unwritten — and it is a credibility moat.
- **Doubles depth.** Every rival says "play to your strengths". Nobody
  publishes the split time-cost maths, partner-mismatch frameworks, or
  changeover drills. Ben races doubles.
- **Wearables.** Garmin/Apple/Coros/Polar/Whoop race setup — one rival has
  two posts, nobody else is present at all.
- **Pregnancy and postpartum.** Searches returned *zero* HYROX-specific
  content. Completely open (needs clinical review).
- **Data segmentation.** All data content is global-aggregate. UK-specific
  analysis, age × division segmentation, variance-by-station, DNF rates,
  Open→Pro time cost, and a 5k→HYROX predictor are all unclaimed.
- **Also thin:** adaptive/para, heavier athletes, youth pathway,
  age-graded tables, multi-race season periodisation, corporate relay,
  in-race HR traces.

## Formats worth copying

- **Serialised multi-part masterclasses** with a publishing cadence
  (hyroxvault ships a part every second day) — builds internal linking and
  return visits.
- **A published editorial-standards page** naming the source hierarchy
  (official data → ISSN/ACSM/IOC position stands → own logged training).
  Cheap to write, strong E-E-A-T signal.
- **A free-tools bundle** (pace calculator, timer, substitution table,
  packing list). rmr's entire tools post exists to acquire links, and it works.
- **A separate image sitemap** — roxlyfe submits one and ranks in Google
  Images. Trivial to replicate.

## Formats nobody in the niche uses

Original video. Annotated station diagrams. First-person elite race data.
Every station guide in this niche is text plus a stock race photo. An
Elite 15 athlete publishing his own splits, HR trace and in-race decision
log is content **no competitor can produce**.

---

# Part 2 — UK personal training and client-intent fitness

## The SERP-contamination problem (this shapes every title)

Course sellers (OriGym, HFE, Study Active, Create.fit), coach-software
firms and salary sites rank for the *same keyword strings* with "become a
PT" intent. OriGym ranks for "personal trainer prices" with an article
about *what to charge*. PTWorkspace hijacks "is a personal trainer worth
it" with "is *becoming* a PT worth it".

**Consequence for us:** every client-intent post must be titled and framed
to signal "for you, the buyer" — "cost you", "should you", "your",
"hiring", "before you pay". Otherwise Google reads us as a near-duplicate
of the course sellers. This is applied throughout `pt-posts.csv` and is
enforced by the buyer-type check in `scripts/check-content-plan.mjs`.

## Who ranks, by query group

- **PT pricing** — owned by marketplaces (Bark, Airtasker) and course
  sellers. **No coaching brand owns it.** Winning shape: named price bands,
  regional table, calculator, year in the title.
- **"Is a PT worth it"** — the weakest SERP in the set. Thin single-PT blog
  posts and a supplement retailer. Highest opportunity.
- **Online PT** — individual UK coach *service pages*, not blogs.
- **"PT vs online coaching"** — mostly US. A UK-specific version is
  basically unclaimed.
- **"How often should I see a PT"** — all US gyms. **Zero UK entities rank.**
- **"What does a PT do"** — entirely hijacked by careers intent. The
  client-side version is unowned.
- **"Questions to ask a PT"** — all US, and **no page anywhere covers
  questions to ask an *online* coach**.
- **Beginner fitness** — PureGym is the dominant UK organic publisher, with
  a category taxonomy organised by *life situation and body goal* rather
  than by exercise. That taxonomy is their moat and it is worth copying.
  Nerd Fitness wins with few enormous updated URLs plus a gated PDF.

## Confirmed gaps we build into

- **GLP-1 training** (Mounjaro, Wegovy). Huge and rising UK demand,
  near-zero coach-authored content, and muscle retention is a real clinical
  concern. Needs careful sourcing and review — but it is the single largest
  open opportunity on the PT side.
- **Commercial transparency.** No coaching brand publishes prices. No one
  does the cost-of-contact maths (£40/hr PT vs £129/mo coaching). Tier
  explainers, billing-model explanations, contract and cancellation norms
  are all absent.
- **Vetting an online coach.** The in-person version exists (US only). The
  online version does not exist anywhere. Also missing: a buyer-side UK
  credential explainer, spotting faked transformations, scope-of-practice
  on nutrition advice.
- **Expectations and evidence.** What 12 weeks actually looks like, month
  1 vs 3 vs 6, "six weeks in and seeing nothing", and what happens *after*
  coaching ends. Nobody markets offboarding.
- **"Can a beginner use online coaching?"** Every existing article asserts
  online is for intermediates. That objection is unanswered anywhere — and
  it blocks our largest segment.
- **Life-situation coaching** — new parents, NHS/emergency shift workers,
  over-50s returning after a layoff, perimenopause (owned clinically by
  insurers, not coaches), men 35–50 with desk jobs and kids, post-physio
  handover, remote workers with no day structure, and the large stranded
  audience who finished Couch to 5k.
- **Tools.** No UK brand owns a PT cost calculator, a coaching-model quiz,
  or a regional price index. All three are link-earning assets currently
  defaulting to the marketplaces.

## What's missing everywhere in UK fitness content

Genuine first-party data. Real client timelines with numbers. Screenshots
of what coaching actually looks like week to week. Pricing transparency
from a coach rather than a marketplace.

Three of those four we can supply immediately and honestly. The fourth
(client results data) becomes available as the client base grows — and
must only ever use real, consented figures (hard rule 1).
