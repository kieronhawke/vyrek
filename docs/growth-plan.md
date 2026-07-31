# Suth Performance — Full Growth Plan

Prepared 29 July 2026. Sources: the strategy handover pack (docs/strategy/,
brand name corrected per Kieron — the pack's "SUV Athletic" naming is
superseded, the brand is **Suth Performance** on suthperformance.com), the
Semrush keyword database (docs/strategy/data/), live-web research on Ben's
record and the competition (sections 2 and 9), and the current state of the
built site.

Status of this document: PLAN. Nothing here is built until scheduled.
The open questions in section 12 are genuinely open — they block the
items that depend on them and must not be answered by assumption.

---

## 1. What this business is

Ben Sutherland's personal coaching business. Ben takes anyone — from a
first-time gym-goer who wants to lose weight to an athlete chasing the
Elite 15 — and coaches them to the level they are aiming for.

Three revenue lines, one ladder:

| Line | What | Who it serves | Job in the model |
|---|---|---|---|
| Coaching Hub (subscription) | Plans, video library, Ben's content, Q&A | Self-serve, hands-off customers | Volume + habit |
| Online coaching | Personal programming + Ben's guidance | £100-150/mo clients | Core revenue |
| Private 1:1 | Ben personally, capacity-capped | Premium clients | Price anchor + proof |

The strategic bridge: beginners who join to get fit become HYROX athletes
within 6-12 months. Beginner plans should end at "you're ready to consider
your first race" with a link to the nearest event.

Positioning line (adapted from the pack, kept because it is true in every
town on earth):

> There is no Elite 15 HYROX coach in [town]. There is one online.

---

## 2. Ben's credibility file

Full sourced dossier: **docs/ben-research-dossier.md** (16 verified races,
media list, training philosophy). Anything used on the site must trace to
it. The hard rule stands: no invented proof, ever.

Headline verified credentials (better than the previous site copy):
- HYROX Elite 15 athlete; 6th at the 2025 World Championships, Elite 15
  Pro Doubles, Chicago (51:26) with brother Harry
- Elite 15 qualification: 3rd, Pro Doubles, Miami 2025 (50:16)
- Pro Doubles wins at Turin, Glasgow (51:01) and Mechelen (49:48)
- Doubles best 48:35 (Berlin 2025); Elite 15 best 49:24 (Warsaw Major 2026)
- First HYROX Berlin 2024 (1:01:51 solo) → Worlds Elite 15 finalist in
  14 months — the story arc for the About page
- Distance-running background, US collegiate scholarship; trains 12-14
  h/week; attributable philosophy quotes in the dossier
- Media: Fitness Racing Podcast + Rox Lyfe interview/YouTube — real
  entries for the press page's empty coverage section

FLAGS awaiting Kieron (dossier section 6): the "Rotterdam win" is
ambiguous (one source says win, hyresult says 2nd) — recommend swapping
site copy to the verified Turin/Glasgow/Mechelen line; "European record"
is sponsor-sourced, do not use; no public source for his coaching work
(fine as a first-party claim only).

---

## 3. The package ladder

Designed to capture the low-tier volume AND the £100-150/mo coaching
client, with a premium anchor above. Names are proposals.

| # | Package | Price (proposal) | What's in it | Sold how |
|---|---|---|---|---|
| 0 | **Free account** | £0 | Free HYROX plan maker (branded PDF), pace tools, results lookup, weekly email | Self-serve — the capture layer |
| 1 | **The Hub** | £8.99/mo (exists) | Personalised adaptive plan, full video library, Ben's coaching content, logging, community Q&A on the site | Self-serve checkout, no call needed |
| 2 | **Hub Plus** | £24.99/mo | Everything in 1 + monthly live group Q&A with Ben, priority answers, quarterly plan review | Self-serve or call |
| 3 | **Online Coaching** | £129/mo (anchor £100-150) | Personal programme written for you, weekly adjustments from your logs, private messaging, monthly 1:1 video call, race-day strategy | **Call with Ben first** |
| 4 | **Elite 1:1** | £299/mo, application only | Ben personally: full programming, weekly calls, race support, limited spots (number = open question 3) | Application → call |

Pricing psychology carried from the pack + competitor research:
- Tier 4 exists partly to make Tier 3 look reasonable and Tier 1 a bargain.
- Annual option on Tiers 1-2 with visible savings; weekly cost framing
  ("less than a coffee a week").
- Tier 3 sits deliberately below the £160-240/mo a twice-a-week local PT
  costs — that comparison goes on every location page.
- Every tier upgrade path is visible inside the product.

### 3.1 Pricing policy (Kieron, 29 July 2026)

**No pricing is published anywhere on the site.** Every path leads to a
free consultation (or free session/training call) with Ben; packages and
prices are agreed on the call. Implemented sitewide the same day: all
marketing prices stripped, /pricing rebuilt as a no-numbers Coaching
Options page, /free-consultation lead-capture page live. Legal pages and
member billing retain real prices. Tension flagged honestly: the SERP
research found no coaching competitor publishes prices and argued
transparency converts; the call-first model trades that for lead quality
and tailored closes — revisit with funnel data.

### 3.2 Funnel tone split (Kieron, 29 July 2026)

Two distinct paths through the assessment funnel:
- **Beginner path**: no HYROX intimidation at the entry. Caring, soft,
  motivational; anxiety-reduction copy throughout; HYROX introduced later
  as an option, never a prerequisite.
- **HYROX path**: talks like a coach who respects them — race history,
  targets, station weaknesses, the questions athletes actually want asked.
Both end at the same place: the free call with Ben. This is quiz v4
(pack's 28-screen dual-branch spec) — next build phase.

**Companion documents:** docs/offer-plan.md (offers + delivery),
docs/seo-domination-playbook.md (the sequenced Google attack plan),
docs/capture-funnel-spec.md (quiz v4 screen-by-screen + lead delivery
to Ben by SMS and email).

**Full offer detail: docs/offer-plan.md** — per-tier spec sheets,
delivery-time maths for Ben, consultation script, retention engine,
proof strategy, and the decision list.

## 4. The funnel (consultative core)

The user-facing shape, per Kieron's brief: a free, valuable front-end
("free personal fitness assessment"), a categorising form, and **a personal
call from Ben as the close for coaching tiers**.

```
Traffic (geo pages, content, tools, social)
   │
   ▼
FREE OFFER — two doors, one form engine:
  a) "Free personal fitness assessment"  (PT/beginner audiences)
  b) "Free HYROX plan maker"             (HYROX audiences → PDF)
   │
   ▼
ASSESSMENT FORM (evolution of the existing quiz — see 4.1)
  segments: level, goals, context. Email captured mid-flow (~screen 8).
   │
   ├─ Result page: personalised summary + their plan/PDF
   │
   ├─ Tier 1-2 intent → self-serve checkout available immediately
   │        (don't force a call on an £8.99 decision)
   │
   └─ ALL paths → "Book your free call with Ben" (embedded booking)
            │
            ▼
      BEN'S CALL (15-20 min, goals conversation)
            │
            ▼
      ADMIN CLOSE: from the customer record Ben assigns the package,
      the system sends the right payment link automatically, account
      is provisioned on payment. (See 4.3.)
```

Honest scale note (flagged, not silently changed): "every option results
in a call from Ben" is the brief and it is the right premium move for
Tiers 3-4. If free-call volume exceeds Ben's diary, the pressure valve is
to keep the call mandatory for coaching tiers and optional ("recommended")
for Hub tiers. Decision needed only when volume forces it — see open
question 3 (Ben's capacity).

### 4.1 The assessment form (quiz v4)

Current: 16-screen HYROX-only quiz, injury follow-up, account creation.
Target: the pack's 28-screen dual-branch spec (docs/strategy/02) with the
call CTA replacing/augmenting the paywall:

- Screen 1 segments: first-time fit / HYROX race / already train, get
  faster / "not sure yet" (escape hatch → beginner branch).
- Beginner branch: fear-reduction copy, "it's a programming problem, not a
  willpower problem" interstitial, sleep/nutrition behavioural questions,
  stones-kg-lbs toggle, MEET BEN screen, reveal with predicted timeline.
- HYROX branch: race history, PB, division, target time with distribution
  context, station worries, equipment, MEET BEN, reveal with projected
  finish time.
- Email capture at ~screen 8 both branches + abandonment email sequence.
- Progress bar; back navigation; no auto-advance on multi-select
  (hard rules 9).
- End state per section 4 above: result + self-serve for Hub, call
  booking for coaching.

### 4.2 Free HYROX plan maker (lead magnet, build early)

Form (reuses quiz engine, short — 8-10 screens: race date, level, days,
equipment, target) → generates a genuinely useful 12-week outline →
**branded PDF** (Suth Performance dark/chartreuse, Geist, clean editorial
layout — the PDF is a brand ambassador) → account auto-created → PDF
emailed (also drives email verification) → follow-up sequence sells the
Hub ("this plan, but adaptive, dated, and coached").

Build notes: server-side PDF via headless Chromium print of a styled HTML
template (fonts + brand tokens for free) or @react-pdf/renderer; store
generated plans against the account; rate-limit + require email.

### 4.3 Ben's admin (CRM upgrade)

Extend the existing /admin customers area:

- **Lead pipeline**: every completed assessment lands as a lead card with
  full quiz answers, segment, requested tier, call status
  (new → call booked → called → won/lost), notes.
- **Call scheduling**: booking embed (Cal.com or similar) writing into
  the lead record.
- **One-click close**: Ben picks the package on the customer record →
  system sends the matching Stripe payment link (pre-built per package)
  → webhook provisions the account/tier on payment.
- Payment links: Stripe Payment Links or Checkout sessions per tier,
  monthly + annual variants; discount codes for call-closed deals.

## 5. The Coaching Hub (product)

"Apple Fitness+ for HYROX" feel, on web first (pack 07). Current member
area is the seed. Additions in priority order:

1. **Ben's content library** — technique videos per station, training
   guidance, mindset pieces; organised as courses ("First Race series").
2. **Ask-Ben Q&A** — members post questions, Ben answers (async);
   Hub Plus gets priority + monthly live session.
3. Logging reliability + watch sync — P0 per hard rule 5 (Runna's
   1-star driver; a lost workout is a churned subscriber).
4. Percentile/benchmark features when the results-data question resolves.
5. Public free layer: leaderboard + results lookup (habit hook) —
   BLOCKED on open question 1 (data source).

## 6. Geo strategy — the main acquisition engine

Kieron's directive: every UK location — cities, towns, villages — for
both personal training and HYROX terms, plus HYROX event/city pages.

What exists now: 65-location database, /hyrox-training/[loc] +
/personal-trainer/[loc] conversion pages, /hyrox/[city] guides.

The plan reconciles "every location" with Google's scaled-content rules
(pack hard rule 3 — this is what kills sites):

1. **Database first**: expand lib/uk-locations.ts → a proper location DB
   (~1,100 UK towns; ONS list) with the pack's data model: gym layer
   (HYROX Training Clubs directory, Gym Group's 130+ UK sites, PureGym
   etc.), race layer (nearest venue, next dates, journey times), terrain
   (parkruns, routes), community, and one human "Ben's take" per page.
2. **Uniqueness validator before scale** (docs/strategy/rules/): a page
   ships only if enough of its content is data unique to that place.
3. **Rollout velocity 20-30 pages/month**, never bulk. Order: the 62
   evidenced Semrush towns (all KD ≤15) → cities → towns → villages by
   population × keyword evidence. Target ~300-400 quality pages year one.
4. **Page matrix, one type at a time**: current two types prove out
   first, then /hyrox-coach/[town] etc.
5. **Location FAQs** per page from real data ("Can I train for HYROX at
   the PureGym in [town]?") with FAQPage schema — per Kieron's ask and
   the pack's template.
6. HYROX **event/city race pages** (Phase 3 of pack): /races-style pages
   for London (18,100/mo, KD 26), Glasgow, Birmingham, Dublin, Cardiff,
   Malaga (KD 9)… tie to ticket-release spikes and pre-race taper content.

Priority keyword targets (from data/keywords-client-only.csv):

| Keyword | Vol | KD | Note |
|---|---|---|---|
| hyrox training near me | 880 | 6 | **Best keyword in the database — build /hyrox-coach first** |
| hyrox results | 14,800 | 19 | Highest CPC ($2.63); needs results layer |
| hyrox london | 18,100 | 26 | Biggest winnable volume |
| how much is a personal trainer | 1,300 | 12 | The online-vs-local argument page |
| personal trainer manchester uk | 1,000 | 15 | Location layer proof target |
| couch to hyrox | — | — | Flagship pillar, own the term |

## 7. Content plan

15 clusters, 280+ mapped posts (docs/strategy/05) on top of the 48 live.
Sequence by commercial value: comparisons (/hyrox-vs, "runna alternative")
→ gear → stations/weights → plans → beginner (/get-fit) → hybrid/strength/
running → demographic + 90 niche-audience pages (occupations, life stages,
sport crossovers, constraints — each can become its own mini-funnel).
Glossary pages for AI-search citation. Tools as link magnets (time
predictor, pacing, percentile, "which race should I enter").
Velocity: steady 15-25/month, never spikes.

## 8. Channels beyond Google

Pack playbook (docs/strategy/06) adopted: GEO/AI-search formatting and
entity-building around "Ben Sutherland — HYROX coach"; YouTube station
technique + race POV; Reddit r/hyrox genuine participation; email as the
compounding asset (mid-quiz capture, plan-maker downloads, race
reminders); the existing partner programme pointed at gyms and run clubs;
seasonal spikes (January, ticket-release days, pre-race weeks per city);
original data studies + annual "State of HYROX" report when the results
layer exists.

## 8.5 HYROX SERP research (who ranks, what we beat them on)

Full report: **docs/hyrox-seo-competitor-research.md**. Headlines: the
"hyrox coach" SERPs are dominated by the official directory and
become-a-coach content, with client intent barely served; city terms are
won by gym class pages that name no coaches; "couch to hyrox" is
near-vacant and ours to take; free long-form plans beat paid pages;
bare calculators are saturated. Nobody in the market pairs a named elite
athlete with personalised coaching and published methodology — that
combination is the moat. Quick wins: Ben's optimised profile on
coaches.hyrox.com, and pursuing official Online Training Partner status.

## 9. Competition

Full sourced report: **docs/competitor-research.md**. What it changes:

- **The price gap is real**: paid apps top out ~£50/mo (HWPO); visible
  1:1 online coaching starts ~£230/mo (Ultimate Performance). The
  £60-130/mo coached-app band is thinly populated — Online Coaching at
  ~£129/mo owns it, and nobody in the market pairs that band with a
  genuine Elite 15 athlete. The Hub at £8.99 undercuts every paid app.
- **Add a one-off product**: £55-149 one-off 12-week blocks are proven
  (Rox Lyfe £55, Marchon £149). Add a "12-Week Race Block" at £79-99
  (anchored higher, Hub trial included) to the ladder as tier 1.5.
- **Our funnel is differentiated**: HYROX apps convert via free trials,
  premium coaching via application calls; nobody runs a personalised
  quiz that ends in a call with an Elite 15 athlete.
- **Per-event pages**: Runna builds a landing page per HYROX race —
  we should too (extends the race-city cluster with dates/ticket spikes).
- **hyroxvault** proves the gym-directory location play ranks, and has
  no results data and no coaching product — both remain open flanks.
- **Local PT anchor confirmed**: UK average ~£40/session; one session a
  week ≈ £160-260/mo. Every location page prices against this.

## 10. What we already have (asset audit)

Live today: rebranded site on suthperformance.com (noindex until Kieron
clears it) · 16-screen quiz with injury branching · 65×2 geo conversion
pages + hubs · 48 blog posts · 8 station guides with imagery · results
seed pages · pace calculator · partner programme · admin with customer
management · own photo/video library + 8 AI station illustrations ·
£8.99 Stripe subscription flow.

This is far ahead of a standing start: the work is extension, not
greenfield.

## 11. Build sequence (proposed)

| Phase | Work | Depends on |
|---|---|---|
| A | Package ladder pages + pricing restructure; /coaching (1:1, application) and /hyrox-coach pages; call-booking + admin lead pipeline + payment links | Ben's capacity (Q3), package sign-off |
| B | Free HYROX plan maker (PDF + account capture) + abandonment emails | Resend domain |
| C | Quiz v4 dual-branch (28-screen spec) with call CTA | A |
| D | Location DB expansion + uniqueness validator + rollout at 20-30/mo; location FAQs | **blocked**, see below: the gym mandatory has no free source and the results mandatory is open question 1 |
| E | Content clusters + niche pages at 15-25/mo | none |
| F | Coaching Hub content build-out (Ben filming), Q&A, logging P0 | Ben's content time |
| G | Results layer + calculators + leaderboard | **Open question 1 — do not build on a scrape** |
| H | YouTube + partnerships + international | UK proof |

## 12. Open questions (blocking, do not assume)

Carried from the pack (docs/strategy/08), still open, now owned by Kieron:

1. **Results data source** — partnership vs claim-your-profile vs scrape.
   Claim-your-profile is unblocked; scraping needs a UK solicitor's
   opinion on database rights first. Blocks G and quiz PB lookup, and
   because every location page needs one results data point, it blocks
   D as well.
1b. **Gym data source** (added 30 July 2026). The uniqueness gate also
   requires one gym or facility record per location, and the free routes
   were tested and do not work: the HYROX club directory and HyroxVault
   both 403, no chain publishes a machine-readable locator, and PureGym
   names no branches while aggregator blogs confidently list some, so
   those blogs are not a usable source. Google Places (keyed, paid) or
   human verification are the two honest options. Hard rule 1 forbids
   inventing the records and the validator has no bypass flag.
   **Consequence: 0 of 104 locations can publish today**, and the 94
   legacy location pages already live would all fail the gate.
2. ~~Domain/handles~~ — resolved by brand correction: Suth Performance on
   suthperformance.com. Social handle audit still needed (@bennysuth95 is
   Ben's personal; does the brand get its own?).
3. **Ben's 1:1 capacity and call diary** — determines Elite tier size,
   "spots remaining" copy, and whether the every-path-gets-a-call rule
   survives volume.
4. **Photography for the beginner branch** — warm, human, real. The track
   shoot covers the athlete side; the beginner side has a gap.
5. **Sub-brand question** for the beginner segment — defer, revisit at
   scale.
6. **Pricing sign-off** — the ladder in section 3 is a proposal.
7. **Company details** — legal placeholders still unfilled sitewide.
8. **Indexing** — the site is noindex by hard rule until Kieron clears
   it. SEO work compounds only after that switch flips (with re-confirm).
