# DECISIONS.md — Results build

Decisions taken without asking, per the brief's autonomy rule. One line of reasoning each.
Newest at the bottom.

---

### D1 — Brand: "SUV Athletic" is read as "Suth Performance" throughout
The brief is written for "SUV Athletic" on `suvathletic.com`. That name is already recorded in
this repo as superseded: `docs/strategy/BRAND-NAME-CORRECTION.md` states *"brand name in this
pack (SUV Athletic) is SUPERSEDED — correct brand is Suth Performance on suthperformance.com
(Kieron, 2026-07-29)"*, and `.env.example` and `docs/build-pack/START-HERE.md` both carry the
same correction. **Applied:** the section is "Results", title suffix is `| Suth Performance`,
canonical host is `suthperformance.com`. The public H1 stays "HYROX Results" exactly as the
brief specifies. Reversible in one constants file if Kieron intends a revival.

### D2 — Reference screenshots came from Documents, not Downloads
The instruction said to look in `~/Downloads`. The only folder there is
`sutherlandse15-photo-download-1of1` — 41 race photographs, already catalogued in
`docs/photo-library-2026-07.md`, not reference material. The actual reference set is 107
screenshots of `hyresult.com` in `~/Documents/05 Media/Screenshots – Mac`, captured today
16:44–16:56. Verified by opening them before copying. **Applied:** those 107 copied to
`refs/screenshots/` (154MB) and gitignored. The 285 files in that folder's `Archive
(before Aug 2026)` are unrelated and were left alone.

### D3 — Work happens on `lane/results`, not on `main`
`~/code/VYREK-LANES.md` rule: `~/code/vyrek` on `main` is **integration only — no feature
work**, and four sibling worktrees own their own lanes. A build of this size on `main` would
break every other lane's rebase. **Applied:** new worktree `~/code/vyrek-results` on branch
`lane/results`, dev server on port 3005 (3000–3004 are taken). The brief document itself was
committed to `main` first, since it is a shared doc and conflicts with nothing.

### D4 — Build docs live in `docs/results/`, not the repo root
The brief asks for `PLAN.md`, `REFS.md`, `DECISIONS.md`, `REPORT.md`. A `PLAN.md` already
exists at the repo root describing the *existing* Suth Performance build; overwriting it would
destroy live project documentation. **Applied:** all four Results documents live in
`docs/results/`. Keeps the four together, destroys nothing, satisfies the Definition of Done's
intent that all four exist and stay current.

### D5 — Existing repo tokens are reused rather than redefined
The brief specifies chartreuse `#A3E635` on near-black `#0A0A0A`. Both already exist in
`app/globals.css` and `app/control-tokens.css` from the July rebrand, along with a documented
rule that chartreuse is an accent only and success states use white-plus-checkmark rather than
green. **Applied:** Results consumes the existing token layer and adds only what is genuinely
new (delta amber, percentile band shading). No parallel colour system.

### D6 — Storyline athletes are labelled as placeholder, and no one else real appears
The brief asks for Benjamin and Harry Sutherland as Pro Doubles storyline athletes. Note that
Ben Sutherland is a real athlete with real results on the competitor site — so his demo record
here must never read as a factual claim about his racing. **Applied:** both carry an explicit
"Demo placeholder — pending profile claim" flag rendered on the profile, their times are
synthetic, and every other athlete in the dataset is faker-generated. No other real person
appears anywhere in the data.

### D7 — A partial Results section already exists; the brief supersedes its IA
`lib/results/{types,client}.ts`, `data/results-seed/events.json` (5 events),
`components/results/*` and the routes `/results`, `/results/events`,
`/results/event/[slug]` were all built to an earlier "Brief v2 §3.3" as "Sprint 1". The new
brief specifies a different, larger IA with top-level `/event/{slug}`, `/ranking/...`,
`/athlete/...`. Running both would be duplicate content and two competing data layers.
**Applied:** the new brief's IA is canonical. `lib/results/types.ts` is *extended*, not
replaced — its `DivisionCode` union, `Venue`, `Split` and `formatSeconds` are already correct
and are reused. The old `/results/event/[slug]` and `/results/events` routes 308-redirect to
their new equivalents so nothing already indexed breaks.

### D8 — The sign-up gate does not apply to the new public entity pages
Sprint 1 shipped `GateModal` + `BlurWall` — results content blurs behind a sign-up prompt
after a preview. The new brief's section 10 requires every entity page to server-render
complete metadata and treats thin, non-indexable competitor pages as the weakness to beat;
gated content cannot do that job, and the brief monetises through one contextual coaching CTA
per page instead (6.5). **Applied:** new entity pages are fully public. The gate components
are left in place and untouched rather than deleted, so reinstating them anywhere is a
one-line mount. Flagging plainly: this reverses a deliberate Brief v2 monetisation choice, and
is the decision here most worth a second opinion.

### D9 — Station guides stay at `/hyrox/stations/{station}`
The brief asks for `/hyrox/{station}`. That is not buildable: `app/hyrox/[city]/page.tsx`
already exists (UK city SEO pages from `lib/uk-locations.ts`), and Next.js rejects two dynamic
segments at the same level — `app/hyrox/[station]` alongside `app/hyrox/[city]` is a build
error, and `/hyrox/run` would collide with the city route regardless. **Applied:** guides live
at the existing `/hyrox/stations/{station}`, index at `/hyrox/stations`. A technical
constraint, not a preference.

### D10 — Existing station content is extended, not rewritten
`lib/hyrox-stations.ts` already holds eight stations with specs, goal splits, faults, cues,
drills and FAQs, driving live pages with HowTo + FAQPage schema. The brief asks for nine
guides (the eight stations plus "run") with technique, pacing and mistakes. **Applied:** the
existing eight are extended with the brief's additions (weights-by-division table, time
distribution histogram, the two empty human-content slots) and a ninth "run" guide is added in
the same shape. Rewriting working, indexed content to satisfy a spec it already mostly meets
would be destructive for no gain.

### D11 — Athlete pool: 4,000 returning athletes plus one-off entrants
The brief asks for "around 4,000 synthetic athletes" *and* for ranking pages that stay smooth
"with 3,000 plus rows". Those cannot both hold: London alone fields ~14,000 entries across 16
divisions, so a 4,000-athlete pool would have to put people in four races at once.
**Applied:** a 4,000-strong *returning* pool (the number the brief names) whose members race
repeatedly across three seasons — which is what gives athlete pages real history, and matches
what the reference site shows (one profile there lists 59 races over 5 seasons) — topped up
with one-off entrants minted per event. Result: 75,396 races, 4,000 profiled athletes, and
HYROX Men at London is 3,221 rows, so virtualisation is genuinely exercised.

### D12 — Division times are clamped at a world-class floor
Drawing ability from a normal distribution across a 3,000-strong field reaches roughly 3.5
standard deviations, which produced an Elite Men winner of 46:30 — around eight minutes faster
than any time ever recorded. Synthetic data still has to be *believable*, and a records board
is exactly where a Hyrox-literate reader would catch it. **Applied:** each division profile
carries a `floorSeconds` set to a plausible world-class time, with slight jitter so the fast
end does not stack on one value. HYROX Men now wins in 54:33 against a real-world record of
about 54:30.

### D13 — Generator is `.ts` and runs on Node's native type stripping
The brief specifies `scripts/generate-demo-data.ts`. Repo convention for scripts is `.mjs`,
and running TypeScript would normally mean adding `tsx` — a dependency, which lane rule 6
serialises. Node 26 strips types natively, so the script runs as-is with no build step and no
dependency. This required `allowImportingTsExtensions: true` in `tsconfig.json` (safe: the
repo already sets `noEmit`), because Node requires explicit `.ts` import extensions.

### D14 — Six analysis features the reference site has no equivalent for
Their product tells you your Sled Push was 2:25 and stops. `lib/results/analysis.ts` turns
splits into things you can act on, all derived from data we already hold so they work
unchanged on a live feed:
1. **Roxzone leak** — transition time as a headline number against the division average.
   The most ignored and most fixable minutes in the sport.
2. **Pacing consistency** — run drift reduced to one 0–100 score, plus fitted drift per run
   and negative-split detection.
3. **Weakest station by percentile, not by seconds** — the slowest station is usually just
   the longest one; the weakest is the one furthest below your peers.
4. **What-if projection** — "fixing this station moves you from 412th to 341st". Turns the
   coaching CTA from a banner into a number.
5. **Target split plan** — enter a goal time, get the splits and cumulative checkpoints that
   produce it. Their simulator answers "what would I run?"; this answers "what must I hit?",
   which is the race-morning question.
6. **Split plausibility flags** — their athlete pages plot a 42:21 "Run 2" on the same axis
   as a 3:06, which ruins the chart. We flag implausible splits instead of drawing them as
   fact. This matters more on a live feed, not less.

### D15 — Results docs and shots stay out of git
`refs/self-shots/` (the self-critique screenshots) is gitignored alongside `refs/screenshots/`.
Both are working artefacts; neither belongs in a repo that has fought bloat before.

### D16 — The Results sub-nav sticks below the marketing nav, not at 0
First self-critique pass caught the sub-nav rendering on top of the wordmark: `MarketingNav`
is `fixed` at `top-[var(--suth-consent-h)]` with `h-16`. Added `--results-nav-offset` to
`app/results-tokens.css` — `4rem + consent + safe-top` — used by both the layout spacer and
the sticky sub-nav, so the two stay in step if the cookie strip appears.

### D17 — Podium cards show a top three, not a winner
The first version showed one name and a time, which left two-thirds of each card empty and
told the reader less than the division row further down the page. Now top three with
gap-to-leader, which fills the card and answers what people arrive asking.

### D18 — Results colour utilities use arbitrary values, not a `@theme` block
`app/results-tokens.css` originally declared `@theme inline { --color-results-* }`. Tailwind
only processes `@theme` from its own CSS entry point and the files that entry `@import`s — a
stylesheet imported from a route layout is bundled by Next but never seen by Tailwind. The
block was silently ignored, so `fill-results-run` and `bg-results-faster` generated **nothing**:
the race strip rendered as black blocks and every station bar as an empty track. Caught by
looking at the page, not by any test — typecheck and lint were both clean.
**Applied:** components reference the variables directly (`fill-[var(--results-run)]`), which
Tailwind picks up from the class strings in TSX. Keeps the shared `globals.css` untouched per
VYREK-LANES.md §3. Bar fills carry their own alpha so no opacity modifier is needed.

### D19 — SVG `<title>` children must be a single string
`<title>{a}: {b}</title>` inside the race strip and pacing chart produced multiple text nodes,
which React serialises differently on server and client — a hydration mismatch that regenerated
the whole result page tree on load. Now built as one template string.

### D20 — Athlete comparison lives at `/results/compare`, not `/compare`
`/compare` is already a live, indexed SEO surface — "Hyrox vs CrossFit / Spartan / marathon /
triathlon / F45", driven by `lib/hyrox-comparisons.ts` with its own `[slug]` pages. Putting
athlete-vs-athlete there would be a hard route collision and would destroy working content.
**Applied:** athlete comparison is `/results/compare`, inside the section that owns it. Every
link (tools row, athlete Compare button) points there.

### D21 — Reference splits are precomputed at build, not aggregated per request
The first simulator computed division medians at request time by sampling ~2,500 results, which
cost **2.0s TTFB** — past the brief's LCP budget on its own. `scripts/generate-demo-data.ts` now
writes `references.json` alongside the shards, and the page reads it. Warm response dropped to
**0.08s**. A live feed does the same thing: compute on ingest, never per request.

### D22 — The ladder percentile lives in the percentile engine, not the reference loader
`percentileFromLadder` initially sat next to the reference-splits loader, which is
`server-only`. The simulator and percentile tool are client components, so importing it poisoned
their bundles and 500'd five routes. It is pure maths and belongs in `lib/results/percentiles.ts`
with the rest of the engine — which is also what keeps every surface agreeing.

### D23 — Sign-up gate removed (confirmed by Kieron)
Kieron confirmed the brand is Suth Performance and that the results platform is public so the
content can rank. `GateModal` and `BlurWall` are deleted, along with the orphaned Sprint 1
`EventCard`/`EventGrid`. Nothing referenced them; typecheck confirmed.

### D24 — PDF via the browser's print pipeline, not a PDF library
"Save as PDF" prints the page through `app/results-print.css`, which inverts the dark theme to
ink on paper. No dependency (lane rule 6), selectable text rather than a rasterised screenshot,
respects the reader's paper size, and works on iOS and Android where Save-as-PDF is in the
share sheet. Screen-only furniture carries `data-print-hide`; a footer line makes a printed
report attributable, and it names DEMO DATA while the source is synthetic so an exported PDF
can never be mistaken for a record of a real race.

### D25 — Exports reflect what is on screen
The ranking CSV exports the current filter and sort, not the raw division: filter to an age
group or search a club name and the download matches. Files carry a UTF-8 BOM and CRLF because
Excel mangles accented names without the first and joins every row without the second — both
are covered by unit tests.

### D26 — Station guide slugs are mapped, not assumed
Station data keys and guide slugs are different strings: the existing guides use
`burpee-broad-jumps` and `rowing`, not `burpee-broad-jump` and `row`. Linking with the data key
404'd on every result page and the simulator. Because Next only *prefetches* those links, it
appeared nowhere in dev — no visible error, no failed navigation — and surfaced only as failed
requests in a production build. One `STATION_GUIDE_SLUG` map in `model.ts` now owns it, with a
test that reads the real slugs out of `lib/hyrox-stations.ts`.

### D27 — Tests wait on content, never on `networkidle`
The site runs a presence heartbeat, so the network never goes idle and `networkidle` times out
against a production server. Every navigation now waits for the page's own `h1`.

### D28 — CLS came from my own nav offset token
Mobile CLS was 0.108 on every Results page against a 0.05 budget. Cause: the content
spacer read `--results-nav-offset`, which includes `--suth-consent-h` — and the cookie banner
sets that from an effect *after* first paint, growing the padding by 48px and shifting the
whole page. Split into two tokens: `--results-nav-offset` (sticky sub-nav `top`, safe because
changing `top` on an out-of-flow element reflows nothing) and a fixed
`--results-content-offset` for the spacer. The rest of the site reserves a generous fixed pad
for exactly this reason.

### D29 — Result pages no longer materialise the whole division
The result page called `getRanking(..., MAX_SAFE_INTEGER)` to place one athlete in the field,
building 3,221 row objects per request — 5.5s LCP. Added
`getDivisionFinishTimes(eventSlug, division)` to the source contract: ascending numbers, no
object allocation. A live feed should serve it from an indexed column.

### D30 — Real data goes in by CSV import, not by writing a data source
`scripts/import-results.ts` reads flat results CSVs and writes `data/results-live/` in exactly
the shape the app already reads, so going live is a data-loading job. Rules that matter:
all-or-nothing (a half-imported event looks fine and is wrong), ranking is *derived* rather
than trusted from the file, bad times are rejected rather than coerced to zero, and partial
splits are kept with a warning.

### D31 — DNFs are results, not errors
The importer initially aborted the whole file on a `DNF` in the finish column. Real timing
exports are full of DNFs; that made it unusable on any actual event. Caught by feeding it a
realistic CSV rather than a tidy one. `DNF`/`DNS`/`DQ`/`withdrawn`/`-` are recognised
non-finishes, kept with `status: "dnf"` and excluded from ranking. Genuine garbage in the
finish column is still an error.

### D32 — `NEXT_PUBLIC_DATA_MODE` must be set at build time
It is inlined during `next build`, not read at runtime. Passing it to `pnpm start` does
nothing — verified. It has to be set in the Vercel project environment and the deploy rebuilt.
Documented in `docs/results/DATA-IMPORT.md`.

---

# PART 2 — THE DATA ENGINE (3 August 2026)

Against `docs/suv-results-data-engine-prompt.md`. Numbering continues from the
frontend build; D31 and D32 above belong to the CSV-import work by another
terminal and are untouched.

### D33 — The HYROX adapter ships gated off, and that is the headline
`results.hyrox.com/robots.txt` is `Disallow: /` for every agent, and the edge
403s any non-browser User-Agent — including the honest one the brief mandates.
Ingesting would mean overriding an explicit refusal *and* disguising ourselves
to defeat a deliberate block. Both, together, silently, by default.

So the adapter is complete and tested, and refuses to make a single request
unless `HYROX_SOURCE_ACCESS=authorised`. The brief says the owner has HYROX's
permission; that may well be true, but it is invisible to their servers and
unverifiable by me, and the fix is cheap (allowlist the UA, or a feed, or
written permission). Everything else in the Definition of Done is built and
proven regardless. **Not a reduction in scope — one environment variable.**
See `SOURCE.md` §1, `ACTION-REQUIRED.md` item 1.

### D34 — The store is an interface, not an import
Supabase was paused throughout (the subdomain does not resolve), and the brief
requires every behaviour proven deterministically in CI. Both are answered by
`ResultsRepository` with two real implementations: Supabase for production, in
memory for tests and local dev. No worker or endpoint may import a Supabase
client. This is why idempotency, quarantine, fan-out, freezing and circuit
breaking are provable today with no database at all.

### D35 — ajax2 is the primary access method, the page is the fallback
A plain `?pid=list` server-renders **zero rows**; the data arrives via mika's
own XHR. A parser aimed at the page would parse a valid, permanently empty
document forever and never error. Discovered by actually reading a response
rather than assuming one.

### D36 — Fixtures reproduce real markup with invented people
Real rows are third-party personal data. Committing a sample creates a
permanent replicated copy in git with no lawful basis and no erasure path, to
test a regex. Structure is faithful field-for-field;
`scripts/capture-hyrox-fixture.mjs` records genuine samples once access is
authorised.

### D37 — Parser diagnostics are carried, never reconstructed
First implementation rebuilt them from the returned rows inside the engine. A
renamed column yields zero rows, which reconstructs to "empty shell" and reads
as a quiet event — the exact failure the parser-shape sentinel exists to catch
was invisible to the sentinel. Caught by its own test. Diagnostics now travel on
`RawDivisionPage`, merged across pages.

### D38 — Change detection is a content hash, because there is no ETag
The brief assumes conditional requests. The source sends
`cache-control: no-cache` and no `ETag` or `Last-Modified`. Hashing was already
the schema's design, so no change — but every poll transfers a full body, and
the rate budget is sized for that.

### D39 — One weekend maps to many source event codes
`H_LR3MS4JI1738` is one division on one day. A race weekend has eight or more
such codes. `events.source_event_id` stores the weekend; `divisions` store the
full code. Sex is a query filter on the source and a separate division for us,
because that is what a leaderboard URL means to a visitor.

### D40 — Identity resolution is deliberately asymmetric
Fragmenting one person into two profiles is a poor experience. Merging two
people publishes a stranger's times under someone's name — a data protection
incident. So: merge only on a stable source id or overwhelming evidence;
otherwise create a second profile and file it for human review. Same name, same
nationality, same age group scores into *review*, not *merge*. There are a lot
of James Smiths.

### D41 — Arming compares instants, never calendar dates
Vercel cron is UTC. A Sydney event starting 08:00 local on 4 August starts at
22:00 UTC on the 3rd; "is it today?" arms it fourteen hours late or never.
`start_datetime` is a real UTC moment and `tz_offset_minutes` exists only to
print local time in the console.

### D42 — Total source failure freezes; it never writes
Every access method failing means we write nothing, keep the last-good hash,
mark live events `updates_paused`, and push that state to subscribers. A board
that stops updating and says so beats one quietly showing five-minute-old
positions as current.

### D43 — `updates_paused` presents to the public as `live`
It is a live event whose feed has stalled, and the board carries its own paused
notice. Demoting it to "finished" would be a lie with a podium on it.

### D44 — Amber means "not running, for a stated reason"; red means broken
Ingestion being deliberately gated off is not a fault. Painting it red trains
the operator to ignore red, which is how a real red gets missed.

### D45 — Erasure and claim record intent; they do not act
An endpoint that erases on an unverified POST lets a stranger wipe someone's
race history. An operator verifies, then anonymises: identifying fields go, the
row stays, so field sizes and everyone else's rank stay correct. Tested.

### D46 — A missing `CRON_SECRET` is closed, not open
The most common way a protected endpoint becomes unprotected is a default that
fails open. An unset secret rejects everything.

### D47 — `LiveDataSource` has two implementations
Server callers reach the service in-process; browsers fetch `/api/results/v1`.
An HTTP hop from our own server to our own endpoint to reach code already in the
process is pure cost. Both satisfy one interface and the contract test covers
both, so "works on the server, not the client" is caught rather than discovered.

### D48 — The engine was added alongside `RESULTS_SOURCE=feed`, not over it
Another terminal changed `getResultsSource()` mid-build to route on
`RESULTS_SOURCE=feed`. Their branch is preserved: `feed` wins when explicitly
set, `NEXT_PUBLIC_DATA_MODE=live` means the ingested database, everything else
stays demo. Neither piece of work was reverted.

### D49 — `getDivisionFinishTimes` gets its own repository method
It appeared on the contract mid-build with a docstring saying a live feed must
serve it from a precomputed column and never by materialising rows (5.5s LCP).
Honoured literally: the Supabase implementation selects one column.

### D50 — Station distributions are precomputed, but the histogram is not
Percentile lookups run on every result page and read the precomputed table. The
frontend's `Distribution` needs samples and buckets, which percentile
breakpoints cannot reconstruct, so `getStationDistribution` builds from stored
splits and is edge-cached instead. Two paths because there are two questions.

### D51 — D35 and D36 were wrong, and the corrections are the interesting part

D35 said ajax2 was the primary access method. It is not a data endpoint at all;
it returns their JavaScript bundle. D36's fixtures were keyed on `field-*`
classes, which only the header row carries. Both produced a parser that returned
200s, threw no errors, and collected nothing.

Corrected against the live source, and the fixtures rebuilt from a real capture:
rows are keyed on `type-*`, the name is an `<h4>` in `Surname, Firstname` form,
the stable id is `idp` behind an HTML-escaped `&amp;`, and a division only
renders with a `search[sex]` filter. See `SOURCE.md` §4–§5.

The general lesson, recorded because it will recur: a parser that cannot
distinguish "no data" from "I cannot read this" will always report the first.

### D52 — The identified-bot User-Agent format
The edge filters on User-Agent *format*, not identity: anything not beginning
with a `Mozilla/5.0` token gets a 403. We send
`Mozilla/5.0 (compatible; SuthPerformanceResultsBot/1.0; +https://…/about)`,
the same shape Googlebot uses — named, versioned, contactable. Measured: 403 for
the bare form, 200 for this one.

### D53 — Splits are a separate paced worker, not part of the division sync
The list carries finish times only; the eight runs, eight stations and Roxzone
are on a per-athlete detail view at one request each. A 3,000-entrant weekend is
3,000 requests. Fetching them during the sync would blow the budget; fetching
them on page render would put ingestion in the request path. So a worker fills
them a slice at a time, claimed profiles first, then rank order. A podium is
broken down in minutes; the long tail converges over days.

### D54 — The detail parser matches labels explicitly
The splits table also contains `Run Total`, `Best Run Lap` and per-station
`In`/`Out` timing-mat rows. A loose `/run/` match invents a ninth and tenth run,
the splits stop summing to the finish, and the validator quarantines a good race
for the wrong reason. Explicit labels, distance prefixes stripped.

### D55 — Live tests are labelled, skipped by default, and small
`HYROX_LIVE_SMOKE=1` opts in. They never run in CI, never block a build, and
touch one season index and one division. The deterministic suite proves we
handle the markup we recorded; only these prove the recording is still true.

---

# PART 3 — FRONTEND POLISH (3 August 2026)

Continues the frontend build. Numbering resumes after Part 2's D33–D55,
which belong to the HYROX adapter work in another terminal.

### D56 — Two command palettes were fighting over ⌘K
Pressing ⌘K on any Results page opened **both** the site's `CommandPalette` (z-80, from the root
layout) and the Results search (z-50) — the marketing palette landing on top of the one the
user wanted. Both bound the same combination on `window`, and the root layout mounts first so
its listener always ran first. The Results hotkey now registers in the **capture** phase and
calls `stopImmediatePropagation`, so it wins on its own pages and changes nothing elsewhere.
Found by stress-testing, not by reading code — both handlers were individually correct.

### D57 — Search ranks by match quality, not substring order
`lib/results/search.ts`: exact beats prefix beats word-prefix beats initials beats contains
beats fuzzy, with race count only as a tie-break. Accent-insensitive ("malaga" finds Málaga),
typo-tolerant from four characters via capped Damerau-Levenshtein (below that, an edit distance
of two matches almost anything), and initials-aware ("cj" finds Charlie Johansson).

Also reads intent: "sub 90" offers the simulator in target mode, "1:31:30" offers the percentile
tool prefilled, "2026" offers the calendar. A results site gets a lot of searches that are not
names, and "no athletes match 1:31:30" is a dead end where a useful answer exists.

### D58 — LCP was not the images, and CLS was not the fonts
Recorded because I guessed wrong twice and the measurements are the only reason it got fixed.
Fonts were preloaded on a hunch and moved CLS by 0.001. The simulator's reference payload was
suspected and is 2.5KB. The actual causes were a transitioned `padding-top` on `body` driven by
a variable set after mount (CLS), and 3,221 row objects built per request (LCP). Both found by
capturing `layout-shift` entries with their sources and by reading the network log, not by
inspection.

### D56 — The catalogue is N+1 requests, and there is no cheaper correct option
The season page lists every weekend's division codes flat with nothing saying
which is which, and neither a query parameter nor a deep link narrows it. Only
a POST of `event_main_group` does. One GET plus one POST per weekend is ~29
requests an hour against a 20/minute budget — affordable, and the alternative
was filing 22 race weekends under one city, which is what the first version did.

### D57 — A weekend that cannot be named does not become an event
The label carries the city and year, so an unnamed weekend has no slug of its
own and would collapse onto another event's. It is skipped and alerted instead.

### D58 — Dates come from HYROX's own calendar, joined on city and year
The timing source has no dates. `data/hyrox/races.normalised.json` does, read
from HYROX event pages by an earlier lane. Matching requires the year as well as
the city, because HYROX returns to cities annually and city alone would silently
pick one. No match means null dates and an alert — never a guessed date, which
would then be armed on.

### D59 — An IANA zone per race city, resolved at the event's own date
Arming compares instants, so a date is not enough. Longitude-derived offsets are
within an hour usually and two hours across a DST boundary, and two hours late
is the first two hours of a race missed. 96 cities is a bounded set, so the map
is written out and `Intl` resolves the true offset for that date — which is what
gets Brisbane (no DST) and Tenerife (an hour behind Madrid) right.

### D60 — 07:00 local is the assumed start hour
The calendar publishes dates, not times. 07:00 is earlier than any HYROX first
wave and `PRE_ROLL_MINUTES` widens it further. Being early costs wasted polls;
being late costs the start of the race.

### D61 — The content hash belongs to the division, not the event
One weekend has a source id per race day and many divisions under each, so an
event-level hash was overwritten by each division in turn: the unchanged check
never matched and every poll rewrote every row. `syncDivision` re-reads the
division rather than trusting the caller's copy, because a stale object disables
the optimisation with no visible symptom beyond churn.

### D62 — Both name columns count, and the comma is column-dependent
Doubles and relay boards use `type-relay_member` and omit nationality entirely.
The sentinel accepts either name column, because requiring `fullname` alarms on
every doubles division in the season and an alert that always fires is an alert
nobody reads. The comma separates surname from forename in `fullname` and one
athlete from their partner in `relay_member`, so only individual rows are
name-normalised.

### D67 — Emoji flags were broken on Windows
Every flag rendered as a bare letter pair on Windows: Chrome and Edge there ship no flag glyphs
at all, so a British athlete showed as "GB" in a box on most desktop visits. Replaced with
inline SVG in `components/results/ui/flag.tsx` — simple geometric approximations drawn to read
at 16px in a dense row, no sprite to fetch, fixed box. An unmapped nation falls back to its
three-letter code in a chip rather than a blank space.

### D64 — City identity without city photography
The reference site puts a desaturated city photograph behind every event card, and it is the
single biggest reason their calendar looks like a product. We have no licensed photography of
London or Hong Kong and taking theirs is not an option. `CityMark` is a typographic identity
instead: the IATA code set large (airport codes are how this sport already talks about its
calendar), a deterministic wash derived from that code, and the flag. It accepts a `photo` prop
that swaps the wash for a real image in the same layout — so dropping photography in later is a
prop, not a redesign.

Hues step by the golden angle rather than plain modulo: modulo put Berlin and Manchester within
a few degrees and the calendar looked like it had two of the same card.

### D65 — Podium marks frame the numeral, they do not replace it
The reference site stylises its top-three numerals into custom glyphs. Ours keeps a plain
tabular numeral — a leaderboard where you cannot read the rank has failed — and puts the meaning
in the frame: filled chartreuse for first, accent border for second, neutral border for third,
nothing below that. Position, weight and frame all differ, so it survives greyscale.

### D66 — Age and ability are correlated in the demo data
A 60-64 athlete finished third of 3,221 in Open Men. Age group and ability were sampled
independently, which is statistically valid and physically absurd. The fastest few percent of
any field now draw from the younger distribution regardless of which division they entered.
Caught by looking at a screenshot of the ranking, not by any test — so there is one now.

### D67 — The API adapter exists and is proven before the API does
`lib/results/api-source.ts` implements the whole `ResultsDataSource` over REST, with per-request
timeouts, graceful degradation (a failed search returns no matches rather than a 500) and
revalidation windows tuned per endpoint. Verified by standing up a mock API and running the app
against it end to end with zero errors logged. `RESULTS_SOURCE=api` plus `RESULTS_API_URL`
switches to it with no code change. Contract in `API-CONTRACT.md`.
