# SUV RESULTS: Autonomous Build Prompt for Claude Code

Paste everything below this line into Claude Code at the repo root.

---

You are building **SUV Results**, the Hyrox results and race analytics section of suvathletic.com. It is a full product surface inside the existing SUV Athletic Next.js repo, not a single page. The public H1 of the landing page is "HYROX Results". Do not call any part of this section "Hub" anywhere in the UI or routes, because Hub is the name of our paid membership tier and the two must never be confused.

Your mission: build a results platform that is visibly better than every existing Hyrox results site, in SUV Athletic branding, mobile-first, fully working end to end on realistic demo data, with a clean adapter so a licensed live data feed can be plugged in later without touching the UI.

## 1. How to work (autonomy rules)

- Work fully autonomously. Do not stop to ask questions. When a decision is ambiguous, make the call a strong product designer would make, and log it in `DECISIONS.md` with one line of reasoning.
- Before writing code, produce `PLAN.md` (phases, routes, components, data model). Then begin immediately. Do not wait for approval.
- Commit at the end of each phase with a clear message. Keep commits clean.
- Finish with `REPORT.md`: route list, screenshots, test results, performance numbers, known gaps, and exactly what to wire up when a live data source exists.
- Keep going until the Definition of Done at the end of this prompt is fully green. If something fails, fix it and re-test. Do not declare done with failing checks.

## 2. Hard constraints (read twice, never violate)

**Brand**
- Chartreuse `#A3E635` on near-black `#0A0A0A`. Chartreuse is an accent and data-highlight colour, never a large background fill.
- All numbers, times, splits, ranks and counts render in Geist Mono with `font-variant-numeric: tabular-nums`. No exceptions. This section extends our design thesis: a timing system, not a CRM. The public version of that thesis is: a stadium timing board, not a blog.
- Follow existing repo conventions, shared layout, nav and footer. SUV Results gets its own sub-navigation within the shell.

**Data rules**
- Every piece of race data in this build is synthetic demo data that you generate. Do not fetch, scrape, copy or ingest data, text, images, markup or CSS from hyresult.com, results.hyrox.com, roxfit.com or any other results service. This is a legal constraint, not a preference.
- Reference screenshots are for layout and UX pattern inspiration only. All copy, all components, all assets must be original.
- Build everything against a `ResultsDataSource` interface (section 8) so a licensed feed or our user-submitted results can replace the demo source later with zero UI changes.
- Show a small fixed "Demo data" pill in the corner of every results page, controlled by `NEXT_PUBLIC_DATA_MODE=demo|live`.

**Authenticity rules (non-negotiable house policy)**
- Automated race reports must never be written in Ben Sutherland's voice, signed by him, or implied to be his personal opinion. They are clearly labelled "Automated race report, generated from race data".
- Any "Ben's Take" block is optional, empty by default, and only renders when human-entered content exists for it. Never auto-fill it. Never add an AI-assist button for it.

**Repo hygiene**
- Generate demo data from a small seeded script at build time (or a one-off script writing to `/data` gitignored). Do not commit multi-megabyte JSON files. This repo has fought bloat before; keep artefacts out of git.

## 3. Reference material (do this first)

1. Locate the screenshots reference folder in the repo (search for a directory named `screenshots`, `refs`, `inspiration` or similar containing hundreds of desktop and mobile images). Review them systematically. Write `REFS.md`: a short list of UX patterns worth keeping (navigation, table layouts, event cards, athlete pages, mobile behaviours) and a list of weaknesses to beat (thin event pages, anonymous content, weak mobile tables, no sharing, no coaching context).
2. Read any existing spec documents in the repo (numbered build pack docs) for brand tokens, tone and architecture rules, and stay consistent with them.
3. Do not copy any competitor markup or text. Extract patterns, then design original.

## 4. Information architecture

| Route | Purpose | Primary queries targeted |
|---|---|---|
| `/results` | Landing: search, live strip, latest and upcoming events, tools | "hyrox results", brand |
| `/events` | Season calendar with filters (season, region, country) | "hyrox events", "hyrox calendar" |
| `/events/uk`, `/events/india`, `/events/hong-kong` | Regional calendars | "hyrox uk", "hyrox india" |
| `/event/{sX}-{year}-{city}` | Event page, dual mode (upcoming vs final) | "hyrox cardiff 2026", "cardiff hyrox results" |
| `/ranking/{event}-{division}` | Full division leaderboard | "hyrox cardiff results men" |
| `/result/{id}` | Individual race breakdown | shared links, athlete names |
| `/athlete/{slug}` | Athlete profile and history | athlete name searches |
| `/starters/{event}` | Start lists by division and wave | "hyrox cardiff start list" |
| `/rankings` | Global boards index | "hyrox rankings" |
| `/rankings/world-records` | Records by division | "hyrox world record" |
| `/rankings/season-bests` | Current season bests | "fastest hyrox times" |
| `/simulator` | Race time simulator and calculator | "hyrox time calculator", "hyrox simulator" |
| `/compare` | Athlete vs athlete, race vs race | "hyrox compare" |
| `/tools/good-hyrox-time` | Percentile tool with editorial wrapper | "what is a good hyrox time" |
| `/hyrox` | Station guide index | "hyrox stations", "hyrox workout" |
| `/hyrox/{station}` | 9 station guides (see 5.8) | "hyrox farmers carry weight" etc. |
| `/reports` | Automated race report index | "hyrox race recap" |
| `/reports/{event}` | Auto-generated race report | "{city} hyrox winner" |

URL slugs follow `s{season}-{year}-{city}` (example: `s9-2026-manchester`). Every new season regenerates the long tail; the structure must make adding an event a data change, not a code change.

## 5. Page specifications

Every page ships with four states designed: loading (skeletons, no spinners), empty, error, and populated. Every page has a mobile layout designed first, then desktop.

### 5.1 `/results` landing
- Hero: full-width global search (athletes and events, instant results as you type). This is the page's job; make it the thesis.
- LIVE strip: any live event renders a pulsing chartreuse LIVE dot, event name, and top-of-board preview that auto-refreshes.
- Latest results: grid of the most recent finished events (city, date, athlete count, winner chips per headline division).
- Upcoming: next events with countdowns and start list links.
- Tools row: simulator, compare, percentile, records.
- Mobile: search sticky at top, sections as swipeable card rows, bottom tab bar (Results, Events, Search, Tools, More).

### 5.2 `/event/{slug}` (dual mode)
- Header: city, country flag, dates, venue, status badge (UPCOMING, LIVE, FINAL), total athletes.
- FINAL mode: podium module for headline divisions, division grid (all divisions with entrant counts linking to rankings), event records set here, link to the automated report, station-average strip for the event.
- UPCOMING mode: countdown, start lists link, course and venue notes, ticket outbound link, a human-content slot for course-specific prep notes (renders only when filled), and the simulator embedded with a "predict your time here" framing.
- LIVE mode: as FINAL but with auto-refresh, position-change animations, and "last updated Xs ago".
- One contextual coaching CTA maximum, at the bottom: "Racing here? Get a plan built for this course."

### 5.3 `/ranking/{event}-{division}`
- Desktop: virtualised table (thousands of rows must scroll at 60fps): rank, athlete, age group, nationality, finish time, gap to leader, expandable splits row (8 stations, 8 runs, Roxzone). Sticky header. Column sort. In-table search. Age-group filter.
- Top 3 rendered as a podium band above the table.
- Mobile: rows become cards: rank, name, time, gap; tap to expand splits as a horizontal mini-bar chart. Division switcher as swipeable tabs under a sticky compact header. Pull-to-refresh when live.
- Percentile shading: subtle background bands marking top 1 percent, 5, 10, 25, 50.

### 5.4 `/result/{id}` (the crown jewel)
- Race strip: a single horizontal visual timeline of the whole race, runs and stations in sequence, segment width proportional to time, chartreuse for segments faster than division average, neutral for slower.
- Station bars: each station vs division average with delta labels.
- Run pacing chart: 8 runs as a line, drift highlighted.
- Summary cards: finish time, overall and age-group rank, percentile ("faster than 78 percent of Men at this event"), work-to-run ratio, Roxzone total.
- Weakest station callout linking to that station's guide. This is the one coaching CTA on the page: "Fix your {station}: guide by Benjamin Sutherland, Elite 15".
- Share button: generates a branded share card (see 6.3).

### 5.5 `/athlete/{slug}`
- Hero: name, nationality, divisions raced, PB badges (overall PB plus best time per station across career).
- Progression chart: finish times over all races, by division.
- Race history list: every race linking to results and events.
- Compare button prefilling `/compare`.
- "Is this you? Claim this profile" CTA. This is our authorised user-submitted route; make the entry point excellent.

### 5.6 `/starters/{event}`
- Divisions and waves, searchable, wave times, athlete count per wave. CTA after the event: claim your profile.

### 5.7 `/simulator` and `/compare` and `/tools/good-hyrox-time`
- Simulator: inputs for 8 runs (or a single run pace), 8 stations, Roxzone estimate; outputs projected finish, division percentile, and a breakdown of where time is gained. Presets: First timer, Sub 90, Sub 75, Elite. Each station input links to its guide. Shareable result state via URL params.
- Compare: two athletes or two specific races overlaid: cumulative gap chart ("where the race was won"), split deltas table. Mobile: stacked with a swipe toggle.
- Percentile tool: enter a time and division, get a percentile against the demo distribution, with a short original editorial explainer around it.

### 5.8 `/hyrox/{station}` guides
Nine guides: run, ski-erg, sled-push, sled-pull, burpee-broad-jump, row, farmers-carry, sandbag-lunges, wall-balls. Each contains, written by you as original copy in SUV's confident plain tone:
- What the station is, distances and reps, weights by division rendered as a clean table.
- Technique, pacing, training, race-day mistakes to avoid.
- A time-distribution histogram for the station by division, from demo data.
- Two human-content slots that render only when filled: a video embed and a "Ben's cues" block. Do not fabricate content for these.
- Internal links: previous and next station, simulator, the percentile tool.

### 5.9 `/reports/{event}` automated race reports
Generated automatically when an event's status flips to FINAL:
- Structure: headline (winner and time in the headline division), podiums for Men, Women, Pro and Doubles, records broken, fastest station splits of the weekend, biggest negative split, age-group standouts, one "stat of the race".
- Tone: data desk. Factual, energetic, short paragraphs. Never first person, never opinion attributed to a human.
- Label at top: "Automated race report, generated from race data".
- Optional "Ben's Take" block per the authenticity rules.
- Auto-generated OG image per report.
- Build the generator as a pure function from event data to structured report content, so it runs identically on live data later.

## 6. Signature features (the "better than everyone" list)

### 6.1 Live mode
Demo data includes one event flagged LIVE. Client polls the data source every 20 seconds: leaderboard rows animate position changes (FLIP), LIVE dot pulses, "updated Xs ago" ticks. Respect `prefers-reduced-motion`.

### 6.2 Instant search
Header search everywhere (Cmd+K on desktop, bottom-sheet search on mobile): fuzzy match across athletes and events, grouped results, keyboard navigable, recent searches stored locally.

### 6.3 Share cards
Dynamic OG image endpoint (`/api/og/...`) producing branded cards: result card (name, event, time, mini split bar), athlete PB card, event podium card, report card. Chartreuse on near-black, Geist Mono numerals. Every result, athlete, event and report page gets a correct unique OG image. This is a growth loop no competitor has; make the cards genuinely poster-worthy.

### 6.4 Percentile engine
One shared module computes percentiles from division distributions, used by result pages, the simulator, the percentile tool and share cards.

### 6.5 Coaching funnel, done tastefully
Maximum one contextual CTA per page, always tied to what the visitor is looking at (weakest station, this course, this goal time). Never a generic banner. CTAs link to existing coaching tier pages.

## 7. Demo data engine

Write `scripts/generate-demo-data.ts`, seeded (fixed seed for reproducibility), producing:

- **Events (14)** across seasons s7, s8, s9: London, Manchester, Birmingham, Glasgow, Cardiff, Dublin, Berlin, Malaga, Stockholm World Championships, Amsterdam, plus Mumbai, New Delhi, Hong Kong, Singapore. One event LIVE, two UPCOMING with start lists, the rest FINAL. UK-weighted, reflecting our market priorities.
- **Divisions (15)** per event with realistic entrant counts: Men, Women, Doubles Men, Doubles Women, Doubles Mixed, Pro Men, Pro Women, Pro Doubles Men, Pro Doubles Women, Team Relay Men, Team Relay Women, Team Relay Mixed, Adaptive Men, Adaptive Women, and Elite where relevant.
- **Race structure**: 8 x 1km runs alternating with SkiErg 1000m, Sled Push 50m, Sled Pull 50m, Burpee Broad Jump 80m, Row 1000m, Farmers Carry 200m, Sandbag Lunges 100m, Wall Balls, plus Roxzone time.
- **Realistic distributions**: per-division finish time means and spreads (for example Open Men centred around the low 90 minutes, Pro Men faster, Doubles faster still), station splits proportioned believably, some DNFs, believable age-group spreads, nationality mix heavy on GBR plus IRL, GER, IND, HKG, SGP, USA.
- **Athletes**: around 4,000 synthetic athletes with faker-generated names; around 300 of them have multi-race histories across seasons showing progression.
- **Storyline athletes**: Benjamin Sutherland and Harry Sutherland as Pro Doubles athletes with plausible race histories, clearly flagged as demo placeholder data pending profile claim. All other names must be synthetic; no other real people.
- Output compact JSON consumed by the demo data source. Gitignore the output; generate on build.

## 8. Data layer contract

```ts
interface ResultsDataSource {
  listEvents(filter?: { season?: string; region?: string; status?: EventStatus }): Promise<EventSummary[]>
  getEvent(slug: string): Promise<Event | null>
  getRanking(eventSlug: string, division: string, opts?: { cursor?: string; ageGroup?: string; q?: string }): Promise<RankingPage>
  getResult(id: string): Promise<RaceResult | null>
  getAthlete(slug: string): Promise<Athlete | null>
  getStarters(eventSlug: string): Promise<StartList | null>
  searchAll(q: string): Promise<SearchResults>
  getRecords(): Promise<RecordsBoard>
  getStationDistribution(station: StationId, division: string): Promise<Distribution>
}
```

Implement `DemoDataSource` fully. Create `LiveDataSource.stub.ts` with typed TODOs describing exactly what a licensed feed must supply. UI components never import a source directly; they receive data through this interface only.

## 9. Design system notes

- Backgrounds: `#0A0A0A` base with one subtle elevated surface tone. Hairline dividers. Uppercase micro-labels for metadata.
- The signature element is the timing-board language: tabular Geist Mono numerals, the race strip on result pages, and live position animations. Spend the boldness there; keep everything else quiet and disciplined. Avoid decorative gradients and glow effects.
- Delta colouring: faster than reference in chartreuse, slower in a muted amber. Never red-green only; pair colour with a plus or minus sign for accessibility.
- Motion: 150 to 200ms transitions, FLIP for rank changes, all gated behind `prefers-reduced-motion`.
- Touch targets 44px minimum. Primary mobile actions in the thumb zone. Tables always have a designed mobile card form; horizontal scrolling tables are a last resort and must have a frozen first column if used.
- Accessibility: visible focus states, semantic tables with proper headers, labelled charts with text alternatives, WCAG AA contrast throughout.

## 10. SEO engineering

- Every entity page server-renders complete metadata. No client-only titles anywhere. This is a known competitor weakness; do not replicate it.
- Title formulas:
  - Event: `HYROX {City} {Year}: Results, Rankings & Start Lists | SUV Athletic`
  - Ranking: `HYROX {City} {Year} {Division}: Full Results & Rankings`
  - Athlete: `{Name}: HYROX Results, PBs & Race History`
  - Station: `HYROX {Station}: Weights by Division, Technique & Times`
  - Simulator: `HYROX Time Calculator & Race Simulator`
  - Report: `HYROX {City} {Year} Race Report: Winners, Records & Standout Times`
- Unique meta descriptions per template with real data interpolated. Canonicals on every page.
- JSON-LD: `SportsEvent` on events, `Person` on athletes, `Article` on reports, `BreadcrumbList` everywhere, `WebSite` with `SearchAction` on the landing page, `FAQPage` on station guides where an FAQ section exists.
- Sitemap index split by type (events, rankings, athletes, guides, reports), regenerated on build.
- Internal linking rules: event links to all its rankings and its report; every ranking row links athlete and result; every result links athlete, event, weakest-station guide; guides link simulator and each other. No orphan pages.
- Rendering: SSG plus ISR for entity pages, short revalidation for live events.

## 11. Performance budgets

- Mobile Lighthouse: Performance 90 plus, LCP under 2.0s, CLS under 0.05.
- Ranking pages remain smooth with 3,000 plus rows (virtualise; never render the full DOM).
- `next/image` everywhere, subset fonts, no chart library heavier than needed (Recharts or lighter), zero console errors.

## 12. Testing protocol

- Playwright across iPhone SE, iPhone 14 Pro, Pixel 7 and 1440px desktop:
  - Search to athlete to result to share card flow.
  - Event in each of the three statuses renders correctly.
  - Ranking table: sort, filter, expand splits, mobile card expansion.
  - Simulator maths verified against hand-calculated fixtures.
  - Compare overlay renders both modes.
  - Live event auto-refresh updates the board.
- Axe accessibility checks on every route template: zero critical violations.
- Self-critique loop: screenshot your own pages at mobile and desktop widths, compare against `REFS.md` and the reference screenshots, list what looks weaker than the references, fix it. Run this loop at least three times before finishing. A picture is worth a thousand tokens; look at your work.

## 13. Build order

1. Read references, write `REFS.md` and `PLAN.md`.
2. Demo data engine plus data source contract, with unit tests on distributions and percentiles.
3. Design tokens, shell, sub-navigation, search.
4. Events, event pages, rankings, results, athletes, starters.
5. Simulator, compare, percentile tool, records boards.
6. Station guides with original copy.
7. Automated report generator plus report pages plus OG image system.
8. Live mode.
9. SEO layer, sitemaps, structured data.
10. Test, self-critique, polish, repeat until green.
11. `REPORT.md` and final commit.

## 14. Definition of Done

- Every route in section 4 exists, is populated with demo data, and has designed loading, empty and error states.
- Flawless at 360px width and at 1440px. Bottom navigation on mobile. No horizontal overflow anywhere.
- All Playwright, axe and Lighthouse checks pass at the budgets above.
- Share cards generate correctly for results, athletes, events and reports.
- Automated reports generate for every FINAL event, correctly labelled, with no human voice simulated.
- No data, text, markup or assets copied from any competitor. All copy original.
- `NEXT_PUBLIC_DATA_MODE` toggles the demo pill; swapping the data source requires touching only the data layer.
- `PLAN.md`, `REFS.md`, `DECISIONS.md`, `REPORT.md` all present and current.

Begin now. Do not stop until the Definition of Done is green.
