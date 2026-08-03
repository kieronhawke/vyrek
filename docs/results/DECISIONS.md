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

### D63 — The results engine has its own Supabase project
The application's project holds identity, customers, quiz and Stripe state; the
engine writes millions of ingested rows on a schedule. Different workloads,
different blast radii, and since 3 August literally different projects.
`RESULTS_SUPABASE_URL` / `RESULTS_SUPABASE_SECRET_KEY` fall back to the shared
pair **together or not at all** — falling back independently pairs one project's
URL with another's key and fails as a confusing 401.

### D64 — `unique nulls not distinct` on station distributions
`age_group` and `sex` are null on every whole-division distribution, and
Postgres treats nulls as distinct in a unique constraint by default. So
`on conflict` never matched, every recompute inserted a fresh set, and
`getStationDistribution` — which expects at most one row — would have started
erroring after the second event sync.

Invisible to the entire unit suite, because the in-memory store compares
`null === null` and is perfectly happy. Found by loading real data into real
Postgres twice and counting. The lesson is the general one: an in-memory double
shares your assumptions, and a database does not.

### D65 — The API adapter was aimed at endpoints that do not exist
The v1 API was being built in this repo the whole time, at `app/api/results/v1/*`. My adapter
had been written against a contract I invented, and almost none of the paths matched: `/events/
{slug}` vs `/event/{slug}`, `/results/{id}` vs `/result/{id}`, a nested rankings path against a
combined `{event}-{division}` slug, and path segments where the real routes take query
parameters. Now aligned to the routes that exist, with a test asserting every path.

### D66 — Every v1 response is wrapped, and the adapter was not unwrapping it
`{ data, attribution, mode }`. The adapter returned the envelope where the app expected the
payload, so **every call would have produced undefined** the moment it was switched on — while
looking perfectly correct in review. Found by curling the real API rather than reading it.

The `attribution` block is not decorative: the results are timed and published by mika:Timing
for HYROX and must be credited wherever they are shown. `lastAttribution()` exposes whatever the
API actually returned, so the credit follows the data instead of being hard-coded.

### D67 — `server-only` is stubbed under vitest
It throws by design outside a Server Component, which made every server-side data source
impossible to unit-test. Aliased to a no-op in `vitest.config.ts`. This is why the adapter had
no tests until now, and why two integration-breaking bugs sat in it undetected.

### D68 — The shared photo library was left alone
`solo-watch-bw.jpg` is 403KB and preloads onto Results pages through route prefetch without ever
rendering there. I recompressed it to 181KB and then reverted: `docs/photo-library-2026-07.md`
documents a deliberate 2200px / quality-72 standard for that library, and silently re-sizing
another lane's assets against their own written policy is not my call. The real fix is at the
render site — those pages use raw `<img>`, and `next/image` would serve a card-sized WebP from
the same 2200px source. Flagged rather than done.

---

# PART 3 — HARDENING (3 August 2026)

Everything below was found by running the engine against real data at real
scale, not by reading it. Each one passed the whole test suite first.

### D65 — Mixed is a division, and it was never being fetched
The source offers M, W and X on every board. The catalogue only ever created
men's and women's, so every mixed doubles and mixed relay division in HYROX
history was silently absent — 20 real results on the one weekend I measured.
Missing a whole division is the worst class of accuracy bug: the boards that
exist are complete, and the one that does not simply never appears. Mixed is
created only for team formats, because an individual race cannot be mixed and
asking costs a request for an empty board.

### D66 — Three serving tiers, and the tier is never hidden
Ingestion already survived the source vanishing. Nothing survived our own
*database* vanishing. Live → last-good → demo, with a breaker in front so a
dead store does not make every page wait for the same timeout, and a probe
after cooldown so recovery is noticed rather than the site sulking on demo data.

The tier is in the API envelope, in `X-Results-Tier`, on the health endpoint,
and on the page itself. A degraded answer is never edge-cached, because a
cached fallback outlives the outage that caused it. Serving stale data as
though it were fresh is the one outcome worth engineering against.

### D67 — Every athlete needs a *derived* stable id
Partners on a doubles row had no source id, so each appearance created a fresh
profile under an incremented slug — and did it again next sync. 1,006 orphaned
profiles and one person with eleven. Athletes are also created while *parsing*,
before the rows they belong to are written, so a failed sync left them behind.

Identity is now derived: person *n* of entry *X* is `X#pn`. Stable across every
re-sync, cannot collide, does not falsely claim two people are one. A team
entry id identifies the entry, not a person, so it is qualified by position —
previously the first-named athlete silently inherited the whole team's id.

### D68 — The slug is the event's identity; weekend ids are plural
`SOURCE.md` said from the first investigation that a weekend carries a source
id per race day. The schema said one. That disagreement produced both failures:
upserting on the slug thrashed the id on 76 events, and upserting on the source
id crashed on a duplicate and took a season's catalogue with it. Season, year
and city are what an athlete means by "the event". The id set is widened, never
narrowed — a sync that saw only Sunday must not erase Saturday.

### D69 — Reap runs that were killed rather than thrown
`withRun` closes its row on a thrown error and cannot close it when the process
is killed. Four runs sat at "running" an hour later, and the console reads the
newest run to decide whether a job is working — so those jobs would have shown
as busy for ever and never as failed. A monitor that cannot tell "working" from
"died" is worse than none, because it is trusted.

### D70 — The outbound budget lives in the database, not in memory
`OutboundBudget` counts per process. On Vercel the live poller, the splits
worker and the backfill are separate invocations on separate instances, each
believing it is alone — the aggregate-rate failure the brief warns about,
arriving by a different route. Requests are recorded in the shared database and
every cron checks the minute's allowance before starting. The window slides,
because a counter that resets on the minute permits a double-rate burst across
the join. Advisory, not a lock: a limiter that can block a worker indefinitely
is a worse failure than briefly exceeding a politeness budget.

### D71 — Alerts deduplicate
The catalogue raises the same message every run. Four identical rows deep and
climbing, and a console full of duplicates is a console nobody reads. Same kind
plus same message refreshes the open alert and counts occurrences.
Acknowledging resets it, because a problem recurring after a human has seen it
is news.

### D72 — A short fetch is reported even when storage is complete
Completeness compared stored rows against the published count, which misses a
fetch that came back short while the table already holds a full set. That is
the fetch quietly degrading — exactly what you want to hear about before it
becomes under-collection. Rows are never deleted on a short fetch: eight
athletes vanishing from history is far less likely than one bad page.

### D73 — A bad event costs an event, not a season
The catalogue ran its event upsert unguarded, so one failure ended the loop and
the remaining weekends were never catalogued. Recorded, skipped, alerted,
retried next run.

### D74 — Backups are JSON over the API, not pg_dump
pg_dump refuses to talk to a server newer than itself, which makes a backup
depending on a matching client version a backup that fails on the day it is
needed. JSON works from anywhere the key works, restores by upsert so it tops
up rather than replaces, and covers what re-ingestion cannot rebuild: claimed
profiles, anonymisation decisions, quarantine state, merge resolutions.

### D75 — City imagery: keep the typographic marks, do not generate photos
Kieron asked whether the coloured city cards are placeholder or the aesthetic, and offered to
generate images with Gemini. **Keeping the marks**, for three reasons:

1. **A generated "London" is not London.** An image model produces a plausible-looking skyline
   that is not any real place, on a page whose entire value is that its numbers are true.
   Publishing invented photography of a real city, on a results site, next to real athletes'
   names, undermines the thing the section is for.
2. **Weight.** 223 events at ~200KB each is ~45MB of imagery on the calendar's critical path,
   against a page that currently scores 96–100 on mobile. The reference site's photo cards are
   the slowest thing they ship.
3. **The marks already work.** Each city has a stable, unique identity from its IATA code, and
   the codes are how the sport already talks about its calendar.

`CityMark` takes a `photo` prop that swaps the wash for a real image *in the same layout*. So
if licensed or self-shot photography arrives later, it is a prop on one component — not a
redesign. That is the right place to leave it.

### D76 — Athlete page: clean at the top, deep below the fold
Kieron asked for "pretty standard to start with, really clean and simple" plus depth for people
who want to analyse. Structured accordingly: name, four figures, a one-sentence form verdict and
the progression chart above the fold; power score, sortable station profile and per-division
bests below it. Someone checking a friend's time never scrolls past the first screen; someone
planning a season gets the rest.

### D77 — The power score publishes its formula
Their "Elite Points" is a closed number. Ours shows peak, consistency, recency and field depth
as four bars, with the weighting explained in one sentence on the card. That is better product
(an athlete can act on a component score) and better SEO (a page that explains its own maths is
the kind of page that earns links).

### D78 — The share card is a poster, not a summary
Rebuilt around one job: someone pastes the link into a group chat the evening after a race. The
time is the hero at 168px, three supporting figures only, the race strip runs edge to edge, and
the brand sits small at the bottom. A card that shouts the brand over the athlete's result does
not get shared, which defeats the point of having one.

The standout figure names the full station ("Wall Balls"), not the strip's short code — "WALL"
is legible inside a labelled chart and meaningless as a standalone number in a feed.

### D79 — Structured data is built in one module, not per template
`lib/results/structured-data.ts` builds BreadcrumbList, SportsEvent, Person, Dataset and
FAQPage. Google is strict about these and a malformed block is worse than none — it earns a
Search Console error instead of a rich result. Two rules the builders enforce that hand-rolled
JSON kept getting wrong: **omit a field rather than emit it empty** (the ingested catalogue
often has no `startDate`, and `""` is a validation error), and **the last breadcrumb carries no
`item`**, because linking the current page to itself is an invalid-item warning.

Ranking pages emit `Dataset`. They genuinely are datasets — thousands of rows, a documented
schema, a CSV download — and dataset rich results are a supported route to visibility that
nobody in this space uses.

`jsonLd()` escapes `<`. Nothing is attacker-controlled today, but athlete names come from an
external feed and one day will be.

### D80 — The print sheet must not carry an `<h1>`
It lives in the DOM on screen (hidden by CSS) so Save-as-PDF needs no round trip, which meant
every result page shipped **two `<h1>`s** — an SEO defect and an accessibility one, since a
screen reader announces both. Caught by the suite, not by eye. The sheet's masthead is a `<p>`;
a printed page has no document outline to serve, so heading semantics buy nothing there.

### D81 — Race-strip labels take their ink from their own segment
Black-on-chartreuse reads; black on the muted station fill was **1.54:1**, flagged serious by
axe on six nodes. Each segment now picks the ink that contrasts with it rather than one colour
being applied to all of them.

### D82 — The search palette's accent goes on the element that owns the radius
Reported twice, and the first two fixes were both wrong in the same way. The
ring started on the `<input>` and was clipped on three sides by the sheet's
`overflow-hidden`. Moving it to the input's row fixed the sides but not the
corners: a square-cornered child sitting flush inside a rounded, clipping parent
gets its top corners sliced off, which is exactly what the user described — a
straight green line with black notches bitten out of each end.

A ring can only follow a curve if it is drawn on the element that has the curve.
The accent is now a border plus box-shadow on the sheet itself; both inherit
`border-radius` by definition, and an element's own shadow is not clipped by its
own `overflow-hidden`, which clips children. It reads as a glow rather than a
hard rule because the input is autofocused on open — this is the palette's
resting state, not a transient highlight, so it should look deliberate.

The regression test asserts the *structure*, not a screenshot: the sheet has a
radius, an accent border and a shadow, **and no descendant carries its own
box-shadow**. That last clause is the one that would have caught both earlier
attempts.

### D83 — City hubs, because "hyrox london results" is the query
Editions rank for "hyrox london 2025". Nobody searches a season slug, and
without a hub the twelve London editions compete with each other for the phrase
with the actual volume and split their link equity twelve ways.

The competitor ships `/location/london` at **226 words** — an h1, a list, no h2,
no numbers, and a title that opens "HYROX location LON". Ours is 566 on a
single-edition city because every clause is computed from what happened at those
races: editions, total finishers, median finish, fastest ever, venue history.
That is also what stops two hundred sibling pages reading as near-duplicates,
which is how thin location pages get filtered out of an index.

`generateStaticParams` prebuilds only hubs with two or more editions, capped at
60. The tail renders on demand and caches; prebuilding two hundred thin cities
would lengthen every deploy to serve pages nobody has asked for.

### D84 — The course speed index, and why it has two columns
Every HYROX race is nominally identical. Athletes know perfectly well they are
not, and nobody publishes the difference because it requires joining every
venue's results to every other. We already have the corpus.

The honest problem is that a field median is a fact about **who entered** as
much as about the course — a championship draws a deeper field and posts a
faster median on an identical layout. Publishing that as "difficulty" would be
dishonest, so it is a *speed* index, and the winner's time is shown beside the
median. The front of the field is the part least sensitive to who else turned
up: when both move together the venue is the likelier explanation, and when only
the median moves the entry list is. One number would hide that distinction.

The baseline is a median of per-edition medians, not a median of all finishers
pooled — pooling would let the biggest race define "normal" and then measure it
against itself. Fields under 100 are excluded; a league table that ranks noise
at the top is worse than a shorter table.

The honest upgrade is a paired comparison — the same athletes at two venues in
one season, controlling for field quality outright. That needs athlete-level
cross-event data and is noted as next rather than pretended at.

### D85 — FAQ copy and FAQ schema come from one array
The commonest way `FAQPage` goes wrong is the JSON and the visible copy drifting
apart; Google requires the answer to be present on the page, and a block
promising answers a reader cannot see is a manual-action risk rather than a rich
result. `FaqSection` takes one array and produces both, so that failure is
impossible by construction. `<details>` rather than a JS accordion, so the
answers are in the HTML whether or not anything hydrates.

Questions the data cannot answer are not asked. An invented answer inside schema
markup is worse than no schema.

### D86 — Seventeen pages had the brand in the title twice
`app/layout.tsx` sets `title.template = "%s · Suth Performance"`. Seventeen
Results pages also hard-coded `| Suth Performance`, so every tab and every SERP
entry read "… | Suth Performance · Suth Performance" — roughly 20 wasted
characters of the ~60 Google displays.

Typecheck cannot see it and neither can a screenshot, because the title tag is
not on the page. It survived because nothing asserted on it. Guarded now in
`metadata-urls.test.ts`, alongside the `${siteUrl}` guard that exists for the
same reason.

### D87 — The flag comes out of the `<h1>`
`Nationality` renders the ISO code as text, so nesting it in the city heading
made the accessible name "HYROX London ResultsGBR" — which is what a screen
reader announces and what Google reads as the page's primary heading. It sits
beside the `<h1>` now, in a flex wrapper.

### D88 — A source failure must be a 500, never a 404
The city hub originally wrapped `listEvents()` in `.catch(() => [])`, which fell
through to `notFound()`. So a transient outage rendered as "this city does not
exist" — the worst available outcome, because 404 is a *permanent* signal:
Google drops the URL on it, and ISR then caches the 404 so it outlives the
outage that produced it.

The catch is gone from all three new pages' render paths. `notFound()` now means
only what it should: the catalogue loaded and has no such city. A catalogue that
is genuinely still filling up returns an empty array **successfully**, so the
empty states still work — nothing was gained by the catch and a de-indexing risk
was created by it.

`generateStaticParams` keeps its catch, because a failure there should prebuild
nothing rather than fail the deploy.

---

# PART 4 — MAKING IT ACTUALLY FINISH (3 August 2026)

The backfill was not slow. It was broken in five compounding ways, each hidden
behind the last, and every one of them only appeared at real scale. Recorded in
the order they were found, because the order is the lesson.

### D75 — `fetch` has no timeout, and `timeoutMs` was wired to nothing
A backfill sat at 0% CPU with no open sockets and no progress for nine minutes.
A connection that opens and goes quiet blocks a worker for ever. The option had
existed in the type since the first draft and was never used. On serverless the
same fault presents as a run that always hits `maxDuration` having done
nothing, which is far harder to read than a hung laptop.

### D76 — Athlete resolution is a batch, not a loop
Up to three round trips per athlete: roughly 460 for a 77-row doubles board and
half a million across the catalogue. Fifteen hours of pure latency at 100ms a
call. It also leaked — every call is a window in which the process can die with
athletes written and their rows not — and a killed run left 13,329 profiles
attached to nothing.

### D77 — Slug allocation is a batch too
The last per-athlete round trip, and the one that made a 638-row board never
finish: 1,276 sequential calls to ask "is this slug free". Now one bulk lookup,
with collisions resolved in memory against both the database and slugs claimed
earlier in the same batch — the latter invisible to the database, since those
rows do not exist yet.

### D78 — PostgREST filters travel in the URL, so they must be chunked
The result upsert's existing-row lookup put every source id in a query string.
A 638-id filter was rejected outright as a 400, so the division failed to store
*after* its athletes were written. That is where the orphans kept coming from.

### D79 — Deduplicate a batch on its conflict key before sending it
Postgres refuses an `ON CONFLICT` statement that would touch the same row twice
and fails the **entire** command, so one repeated source id cost a whole
division. Fifteen events died this way. A repeated id means the same entry
appeared twice on the board, so the later one wins rather than the pair being
fatal.

### D80 — Do not blame the source for our own failures
`freezeOnFailure` raised "source unreachable" for *any* error, so a
duplicate-key failure in our own database was reported as HYROX being down. I
spent real time looking for a network problem that did not exist while the
actual cause sat in a detail field nobody reads.

### D81 — The checkpoint must follow the unit of work
Two separate versions of this bug, both causing an event to be re-chosen every
round for ever:

- An event with **no divisions** never ran a division sync, so nothing wrote
  its checkpoint. It "completed" instantly and permanently occupied one of the
  run's three slots.
- Once the content hash moved to the division, an event whose divisions all
  skipped as unchanged never updated its *event-level* row. One event repeated
  three rounds running, re-fetching fourteen divisions each time to learn
  nothing.

An event is done when every division is. Division-less events get an explicit
checkpoint and a report, because a catalogued event with no divisions is the
shape of a catalogue that half-succeeded.

### D82 — Measure before believing a source is at fault
A broken regex in a throwaway probe made it look as though HYROX ignored its
`page` parameter and served identical rows for ever. Decoding the pagination
links — the URL is held as character codes in a `data-silver` attribute —
showed pages 2 and 3 have zero overlap with page 1. The source was correct; the
measurement was not. Worth remembering before designing around someone else's
supposed bug.

### D89 — Every phone under ~400px scrolled sideways, and nothing was watching
An adversarial sweep across 25 routes × 5 widths found horizontal overflow on
the event, result and athlete pages at 320px — the event page by 75px, and
still 5px at 390, which is most iPhones in use.

One root cause, three symptoms: **a grid item defaults to `min-width: auto`**
and refuses to shrink below its content's min-content width. The podium card's
athlete name already had `min-w-0 truncate`, but that never got a chance to
apply — instead of the name truncating, the whole card grew to 375px inside a
280px track. A second variant of the same thing: an export-button row carried
`shrink-0`, so its own `flex-wrap` never received a constrained width to wrap
into and laid out on one line at 356px.

Eleven grids across the section had the latent version of this — `grid gap-N`
with no explicit `grid-cols-1`, which leaves an implicit `auto` track that
cannot clamp. All now declare `grid-cols-1`.

Nothing in the suite had ever read `document.scrollWidth`, which is why all of
it shipped. There is now a 320px overflow guard over eleven routes, and it
names the deepest offending element rather than an ancestor — an ancestor is
only wide because a descendant is, and reporting it sends you to the wrong file.

### D90 — Hit area and visual size are not the same thing
The consent bar's buttons measure 69x32 and 50x18. It is the first control
every visitor meets and the most-tapped UI on the site, and "Manage" was the
smallest target anywhere in it.

Growing the bar was not an option: it is deliberately slim because a tall
banner shifts the layout, which this repo has already paid for once. So the
touch target is extended with a pseudo-element instead — `after:-inset-y-2` on
the pills, `-inset-y-[15px]` on the text link — reaching ~48px without moving a
pixel. The 8px gap between the pills absorbs the 4px each side, so the expanded
areas meet without overlapping and neither steals the other's taps.

The test clicks 7px *below* the visible pill and asserts the banner dismisses,
because measuring the element box would prove nothing about a pseudo-element.

### D91 — The global 48px tap rule silently does nothing to inline links
`globals.css` sets `min-height: 48px` on every `a` and `button`. It has no
effect on a **non-replaced inline element**, and a bare `<a>` is inline — so
the rule only ever applied to links that were already block, flex or
inline-block. Three pages had grown their own "keep going" list of bare text
links, each rendering 17px tall.

They are now one `RelatedLinks` component rendering chips: `inline-flex` gives
the rule something to apply to, and a bordered target is easier to aim at than
underlined text in a wrap-flow list. It reads better too — a row of related
destinations should look like navigation, not like a sentence containing links.

### D92 — 403 KB of imagery on every page, for a page nobody had opened
Measured page weight across the section: every route pulled the same 403 KB
JPEG, on pages that render no photography at all. It was 37% of a 1.1 MB page.

`/how-it-works` renders its first step image with `loading="eager"` on a plain
`<img>` pointing at the raw file. Every Results page links there from the
footer, Next prefetches the route, and the eager image comes with the payload.
All four step images are lazy now; nothing is lost, because that image sits
beside body copy well down the page and is not the LCP element on any viewport.

**This is the second time this exact bug has shipped.** The station-guide heroes
did the same thing and were fixed the same way. Twice it was found by hand,
long after release, because nothing in the suite ever looked at transferred
bytes. There is a page-weight guard now — a generous 150 KB image budget on
four routes, which is a tripwire for pulling a whole unused hero rather than a
byte-level target.

Result: 1,093 KB → 690 KB on every page in the section.

My first hypothesis was wrong and worth recording. I blamed the geo-landing
hero, changed it, rebuilt, and the number did not move. The culprit was a
different page entirely. The lesson is the one this repo keeps relearning:
trace the initiator, do not reason about which component "looks likely".

### D93 — A decorative background should never be `priority`
Separately, and *not* the fix for D92: the geo-landing hero carried `priority`
and `fetchPriority="high"` on an image that is `aria-hidden`, `alt=""`, at 55%
opacity behind two scrims. The file's own comment already documents that they
had found it rendering almost invisible. Marking it high priority made a
decorative layer compete with the text that actually is the LCP element, and
`priority` emits a preload for the raw path rather than the optimised one.

Now `loading="eager"`: it still loads immediately on the geo page, verified
still painting, and now served through the optimiser at `w=640&q=75` instead of
as a 400 KB original.

### D94 — The race report, and why nothing in it is a black box
The paid equivalent is $24.99 for sixteen pages, built on what it calls a
"machine learning simulation engine". Ours is free, needs no account, and every
figure states its derivation — because a number an athlete cannot interrogate
is one they cannot train against, and because we will not claim a model we have
not built.

The anchor idea, which most of the module rests on: **an athlete's overall
percentile is their standard, and a segment above it is a strength while one
below it is a weakness.** One sentence, checkable, and it turns a wall of splits
into "you are a 51st-percentile athlete running a 15th-percentile sled push".

Two choices worth defending:

**Band edges shift in percentile space, not in seconds.** Ten points is worth
far more time on the sled push than on the ski erg, so a fixed ±5% in seconds
would flatter the widest-spread stations and punish the tightest.

**"Same-day potential" is capped at the athlete's own best station**, not at
perfection. They demonstrated that level on the day, on those legs, so it is a
target rather than a fantasy figure dressed as analysis.

What we deliberately do *not* claim: per-transition roxzone splits (the feed
publishes one total), and "fastest split in the field" (we hold the winner's
splits, not per-segment records). The method section says both.

### D95 — Coach notes are chosen by the numbers
The paid reports put an Elite 15 athlete's commentary beside each chart, and it
is the best thing about them — a chart says what happened, a coach says what to
do next. Theirs is static: the same paragraph ships to an athlete who faded and
one who paced it perfectly.

Ours are rules with predicates, first match wins. A fading athlete reads about
fading; an even-paced one reads about what to do with that strength instead.
Priority order matters and is tested: a bad fade outranks an otherwise even
variation, because it is the more important thing to say.

### D96 — Three chart defects only a rendered PDF could find
**The print palette lost to the screen palette.** Both blocks target
`.results-report` with identical specificity — `@media print` adds none — and
the screen block was last in the file. Every chart printed in its dark-UI
colours: the five-band ramp came out as five shades of near-black, unreadable
and a full ink cartridge. Source order is now load-bearing and the file says so.

**The benchmark chart advertised data that did not exist.** Its legend offered
"fastest split in the division" as a dashed series, drawn from the same numbers
as the winner's solid line, so it rendered on top of it. It also asked the
reader to compare two 400px bars by eye — the comparison a bar chart is worst
at. It now draws only the *gap*, so the segments rank themselves.

**A scale that looked shared and was not.** The band rows had a numeric axis on
the first row only; each station is scaled to its own distribution, so 5:22 on
the ski erg row and 5:22 on the sled row sit in different places. Removed — the
marker carries the time and the row caption carries the verdict.

### D97 — The cover photograph, twice
First attempt: a bright start-line shot at 40% opacity under a top-to-bottom
scrim on a near-black base. It loaded, painted, and rendered as a plain black
rectangle. `geo-landing.tsx` carries a comment describing exactly this failure,
which is how I recognised it — after making it.

Dimming the image is the wrong lever; it flattens the whole frame to protect
one corner. The scrim is shaped instead: near-opaque under the type on the
left, almost absent on the right where the photograph is. The image runs at
full opacity, and a test now asserts that.

`min-height: 82vh` on the cover then produced two blank pages before any
content, because `vh` is the full page box and the padding pushed past it. The
first section already forces its own break, so the cover needs none.
