# REPORT.md — Results

Two halves. **Part 1** is the state of the live data engine, rewritten after
running it against the real source and a real database. **Part 2** is the
frontend build report, which still stands as written.

---

# Part 1 — The data engine, live

Last updated 2026-08-03.

The engine was built and tested against fixtures and an in-memory store; it has
now been run at full scale, and that is where most of what follows was found.

## Where it stands

**The API works and serves real HYROX data.** 223 events, 2,692 divisions,
515,370 results. Every serving surface — calendar, event pages, division
rankings, individual results, athlete profiles, start lists, search and the
record board — reads from the ingested database and returns correct data.

**The site is still on demo data.** `NEXT_PUBLIC_DATA_MODE` is not set in
production. Flipping it is the last step, described under *What is left*. I
have not flipped it: the backfill is still running and half the archive would
show partial fields.

**The backfill is still going, and 38 events are still empty.** 185 of 223
events hold results; the other 38 hold none. That is a real gap, not an
artefact: sampling three of them against the source found 750 and 588 results
waiting for two, and a genuinely empty board for the third (an event that never
ran). The backfill is resumable and safe to stop — progress is recorded per
division, so an interrupted run picks up where it left off.

## What running it for real found

Fixtures proved the logic. None of the following would have been visible
without a full-size database behind the code.

### Live mode did not work, and said nothing

`DirectLiveDataSource` reached the engine through `require("./engine")`, which
resolves under webpack and throws under ESM. `ResilientDataSource` wraps it and
treats any throw as "the store is down", so **every call fell through to the
demo tier**. Live mode looked healthy and served synthetic data.

That is the resilience layer working exactly as designed, against a bug it
could not distinguish from an outage. Fixed with a cached `await import()`.

### The board's entrant counter counts rows, not people

`N Results` counts **rendered rows**, and each athlete renders two to four
times. Manchester 2023's open women reads "686 Results" for a field of 281.

Read literally, the completeness check declared 405 athletes missing, and the
adapter grew an age-class partitioning fallback to find them: fifteen extra
requests per division, no new rows, because every one was already held. The age
partition settled it — the slices are exhaustive and mutually exclusive, and
sum to 280 distinct athletes against 281 stored, their counters summing to 684
against the published 686.

The duplication factor is not constant (2.00 relay, 2.20 doubles, 2.44 open,
2.89 pro), so it is measured on the page rather than assumed.

### Every read stopped at 1,000 rows

PostgREST caps an unbounded response at `max-rows` — 1,000 on Supabase — and
says nothing about it. A truncated read is indistinguishable from a small
table.

Rotterdam's open men holds 2,721 results and returned 1,000, so `entrantCount`
was stored as exactly 1,000; the same for 71 divisions. Finish times, start
lists and split reads stopped at the same place, so distributions were computed
from at most 1,000 finishers of a larger field.

The completeness alerts had been reporting this accurately all along — "stored
1000 rows against a published 1620" — and I had been reading them as a scraper
problem. They were describing our own read.

### Divisions were filled with other divisions' athletes

Barcelona 2023's **women's** board held Lee Tuck, Thomas Fry and Diego
Caballero Nistal ranked 1, 2 and 3. The source is not wrong: `search[sex]=W`
returns Aoife Fay and Victoria Cartmell.

The unfiltered fallback adapter sends no sex filter, so it returns the whole
event, and whatever came back was stored under the division requested. A
fallback that fails is recoverable; one that silently changes what the data
*means* is not.

Rows are now checked against their own parsed sex. **Existing damage: 4,875
athletes appear in both the men's and women's board of the same event, across
38 of 223 events** — mostly Asian events plus Stockholm, Barcelona, St Gallen,
Mumbai and Birmingham. Repair tool below.

### Every event claimed a field of zero

The catalogue writes `athleteCount: 0` because it runs before results exist,
and nothing revised it — on the tiles, city pages, FAQ, race reports and
`SportsEvent` markup. The divisions held the truth all along. 179 repaired.

### The serving layer read whole divisions to print single integers

`results_results` carries a `splits` JSONB blob of eighteen segments per
athlete, and `select()` takes all of it. Measured against the real store:

| Call | Before | After |
| --- | --- | --- |
| `getRecords` | 365s | 1.1s (precomputed) |
| `getStarters` (12,366 entrants) | 573s | 10.5s |
| `getEvent` (15 divisions) | 12.3s | 2.2s |
| `getRanking` | minutes | 1.8s |
| `searchAll` | 7.7s | 3.8s |

Migration `0103` adds what the schema lacked at this size: trigram GIN indexes,
because `name ILIKE '%smith%'` cannot use a btree and was scanning 883,167 rows
per keystroke, plus partial indexes for the top-1-per-division reads.

### Three pages could not render at all

The data layer being correct is not the same as the pages working, and running
them in live mode found three that did not.

**`/rankings/world-records` showed "No records yet"** against half a million
results. Not an empty board — a timeout. Deriving the fastest finish per
division hit the statement limit, `ResilientDataSource` cannot tell a timeout
from an outage, and the page degraded to the demo tier, which has no records at
all. The fallback behaved exactly as designed and produced the most misleading
outcome available: an authoritative-looking page asserting nothing exists.

It is now a `DISTINCT ON` in a database function carrying its own statement
timeout (migration `0104`) — the honest cost of sorting 515,370 rows is about
twenty seconds, far past what the API allows — and precomputed by the catalogue
pass into a settings blob. **10.7s to compute once, 1.07s to serve.**

**`/results` never responded.** `collectRecordCandidates` read the top 200 of
every division of every finished event — 218 events, 2,692 divisions — on a page
render. Bounded to the 30 most recent, which is not a compromise: the only
caller passes the result straight to `freshRecords`, which keeps records set in
the last fourteen days, so scanning eight seasons to discard all but a fortnight
was work whose output was thrown away.

**The station guides took 95 seconds**, and that one was mine.
`getStationDistribution` walked every event, listed its divisions, and read every
column of every row of the matching ones to pull one station's time off those
that had it — and 99.5% of rows have no splits, so nearly all of it was reading
`splits: {}`. The histogram I added made each guide call it twice, which turned
a slow query into a visible one.

The pattern across all three: written against the demo dataset, where the
shortcut is free, meeting a real database for the first time.

Verified rendering in live mode with real data and no demo notice:
`/rankings/world-records` (1.19s), `/events/uk` (1.35s), `/events`,
`/event/s8-2026-rotterdam`.

### The writes were unbounded, and the index made them dearer

Two failures that only appear when ingest meets a database with real
indexes on it.

`upsertResults` sent **every changed row of a division in one statement** —
2,721 rows of `splits` JSONB for Rotterdam's open men. It had no chunking at
all, which went unnoticed while divisions were small, and a timeout cost the
whole division rather than one batch.

What pushed it over the edge was my own fix: the trigram index that took
search from 13s to 220ms costs about **ten times more to write** — measured
on `results_athletes.name`, 1,030ms against 102ms per 200 rows. That removed
the headroom the existing batch sizes assumed, and athlete writes started
timing out too, failing three divisions of one event.

Both writes now share one helper that halves a batch on timeout, down to a
single row, and rethrows anything that is not a timeout immediately so a
genuinely bad row is not retried sixty-four times on its way to failing. No
fixed size would have been right: the cost depends on how loaded the database
is at that moment, and a constant chosen against an idle one is what broke.

### Smaller correctness fixes

- **The Elite boards print `MM:SS.hh`.** "60:08.73" is a sixty-minute race, and
  rejecting minutes over 59 quarantined 516 real elite results.
- **A name must contain a letter.** "- -" is the source's placeholder for an
  unnamed entry, and one reached the world-record board as the fastest women's
  HYROX ever recorded. 35 flagged for review and held off that board.
- **The division average was drawn from mostly nothing.** 99.5% of rows have no
  splits, so averaging segment times across the whole field reported an average
  race far faster than anybody ran.
- **The event page printed a bare "· first wave "** with nothing after it. Wave
  start times are not on the source at all.

## Built alongside

- **The archive has a place.** Only 15 of 223 events had a country: the
  published calendar lists upcoming races only. A city resolver handles
  championship decoration ("World Championships Manchester") and German
  exonyms ("München", "Wien") against an archive table of host cities. **218 of
  223 events now have a country and region.** The five that do not name no city
  at all ("Elite 12", "Belgium") and stay null, with tests asserting that.
- **`/events/{place}`** — twelve regional calendars with their own titles and
  copy, replacing `/events?region=…` in the sitemap.
- **Station guides** gained a race-spec table, links to the percentile tool and
  simulator, and `StationHistogram` — `Distribution.histogram` had been computed
  all along with a comment saying it was for these pages, and no chart existed.

## Tests

**1,032 passing, 9 skipped** (skipped are operator tools: backfill,
contamination repair, live smoke). `tsc --noEmit` clean, ESLint clean,
`next build` clean at 8,175 static pages.

## What is left

### Mine, in progress

1. **Finish the backfill.** 187 of 223 events checkpointed. It stopped early
   once when processes it shared the machine with were killed; restarted.
2. **Run the contamination repair.**
   `HYROX_REPAIR=1 HYROX_REPAIR_APPLY=1 HYROX_SOURCE_ACCESS=authorised npx vitest run repair-contamination`
   Report-only by default. Re-fetches each suspect division and deletes only
   rows the source no longer returns, skipping any where the fetch fails or
   would remove more than nine tenths of what is held.
3. **Re-measure the serving timings** once the backfill stops writing — several
   figures above were taken while it contended for the same database.

### Yours

1. **Decide when to go live.** Set `NEXT_PUBLIC_DATA_MODE=live` in Vercel
   production. ⚠️ `RESULTS_SOURCE` outranks it — if that is ever set to `api`,
   `feed` or `file`, the mode flag is ignored entirely.
2. **Pro loads on the station guides.** `spec.mensPro` / `spec.womensPro` are
   optional and unset, so the table renders Open only. They are real published
   standards, but the Open figures held here disagree with public sources on the
   sled stations, and I would rather the page say nothing than quote a race
   weight wrong. Fill them from the official rules and the rows appear.

### Known and accepted

- **Splits are ~0.5% filled.** One request per athlete: 515,370 results is not
  a backfill, it is a permanent background process. The worker runs every five
  minutes, prioritising claimed athletes, then podiums, then the long tail
  oldest-first, so the results people actually open fill first. Pages render
  their summary without splits, and `StationHistogram` renders nothing rather
  than an empty axis. Full coverage is months away; that is the design.
- **A 34:20 women's open result at Incheon** survives validation because the
  floor is 30 minutes, and that floor exists because Adaptive and Youngstars
  genuinely run a shorter course. A division-aware floor would fix it properly;
  I have not written one because I am not confident of those course lengths.
- **The 2019 team formats do not have their rosters parsed.** `BT1`, `BT2`,
  `GT1` and `GT2` at Hamburg 2019 store one row per entry with no partners, so
  they read short against a published figure that counts the whole roster —
  "stored 31 of 55". Confined to the oldest season and a few dozen rows; the
  formats render differently from the modern boards. Modern doubles and relay
  are complete: Rotterdam 2026 has partners on 2,148 of 2,148 doubles rows,
  Vienna on 850 of 850. Worth knowing that the completeness check *reported*
  this rather than quietly storing half a division.
- **The demo record board is empty**, so the `demo` fallback tier for
  `/rankings/world-records` shows nothing rather than sample records. This is
  what made the timeout above present as "No records yet" instead of visibly
  wrong data, and it is worth seeding.
- **`/events` renders 1.67 MB** — every one of 223 events as a tile. It works,
  but it wants pagination or a season default before it grows further.

---

# Part 2 — The frontend build

Branch `lane/results` · worktree `~/code/vyrek-results` · dev port 3005
Brief `docs/suv-results-build-prompt.md` · Plan `PLAN.md` · Decisions `DECISIONS.md`

Run it: `cd ~/code/vyrek-results && pnpm dev -p 3005` → http://localhost:3005/results

---

## 1. Routes

All server-render complete metadata. All verified at 1440px and 390px.

| Route | What it does |
|---|---|
| `/results` | Landing. Search-first, live board, latest results with winner chips, upcoming, tools |
| `/events` | Season calendar. Filters are real URLs (`?season=s9&region=Europe`) that server-render |
| `/event/{slug}` | Dual mode — UPCOMING (countdown, start lists), LIVE (20s polling board), FINAL (podiums, divisions, report link) |
| `/ranking/{event}-{division}` | Full leaderboard. Local sort/filter/search over 3,221 rows, splits expand in place |
| `/result/{id}` | Race strip, pacing, stations weakest-first, Roxzone, work:run, what-if, share |
| `/athlete/{slug}` | Progression, career station axes, race history, claim-profile |
| `/starters/{event}` | Start lists by wave, searchable across every division at once |
| `/simulator` | Build a race, **or** set a goal and get the required splits |
| `/results/compare` | Two races, cumulative gap chart, segment deltas |
| `/tools/good-hyrox-time` | Percentile tool + editorial + FAQPage schema |
| `/rankings`, `/rankings/world-records`, `/rankings/season-bests` | Boards |
| `/reports`, `/reports/{event}` | Automated race reports |
| `/api/og/result/{id}`, `/api/og/event/{slug}` | 1200×630 share cards |
| `/sitemap-results.xml` | 2,250 URLs, registered in `robots.txt` |

**Route decisions that differ from the brief**, all forced and all logged:
`/compare` was already live indexed content ("Hyrox vs CrossFit"), so athlete comparison is
`/results/compare` (D20). `/hyrox/{station}` is not buildable alongside the existing
`app/hyrox/[city]`, so guides stay at `/hyrox/stations/{station}` (D9).

## 2. Numbers

- **76,185 races**, 14 events, 4,000 profiled athletes, generated from a fixed seed in **0.6s**
- Largest division: **3,221 rows** (London Open Men) — the case virtualisation exists for
- Ranking DOM stays at **~85 rows** regardless of field size
- Full division payload **245KB** raw (~60KB gzipped) as compact tuples, fetched once
- Simulator TTFB **0.08s** warm (was 2.0s before references were precomputed — D21)
- Share card generation **~0.9s**, 59KB PNG
- **266 unit tests**, **60 Playwright checks** (2 viewports), **0 axe critical/serious**
- Typecheck clean, lint clean, **zero new dependencies**

## 3. Features the reference site does not have

1. **Race strip** — the whole race as one proportional timeline, chartreuse where you beat the division average. Also printed on the share card.
2. **What-if projection** — "fixing your Wall Balls moves you from 1600th to 1517th".
3. **Roxzone leak** — transition time as a headline number vs the division.
4. **Pacing consistency** — run drift as one 0–100 score with a named verdict.
5. **Weakest station by percentile, not seconds** — the slowest station is usually just the longest one.
6. **Target-split mode** — their simulator answers "what would I run?"; this answers "what must I hit?".
7. **Split plausibility flags** — theirs plots a 42:21 run and a 0:03 burpee station as fact; ours flags them and excludes outliers from career axes.
8. **Share cards + save-image** — a PB dead-ends on their page.
9. **Local sort/filter on 3,000 rows** — theirs round-trips every filter.
10. **Jump-to-rank** on large boards.

## 4. What is NOT done

Stated plainly rather than rounded up.

- **Station guides are untouched.** `/hyrox/stations/*` still serves the pre-existing eight guides. The brief's additions — weights-by-division table, time-distribution histogram, the two empty human-content slots, and a ninth "run" guide — are **not built**. Result pages already deep-link to these guides, so the links work; the pages just do not yet carry the new sections.
- **No athlete OG card.** Result and event cards exist; `/api/og/athlete/{slug}` does not.
- **No Lighthouse run.** Budgets (Performance 90+, LCP < 2.0s, CLS < 0.05) are **unverified**. The known risks are the 60KB ranking payload and the `next/font` load; everything else is server-rendered with fixed-dimension media.
- **Live mode is polling-verified, not motion-verified.** The 20s poll, "updated Xs ago" and the FLIP wiring all work, but demo data is static, so no actual position change has ever animated. This needs a mutating source to prove.
- **Claim-profile is a preview.** Deliberate: verification has nowhere to land until you choose Supabase or the lead pipeline. Disabled button and a plain "not live yet" notice, rather than a form that silently drops what people type.
- **`docs/results/REFS.md` covers 7 templates in depth**, not all 107 screenshots.

## 5. Wiring up a live feed

1. Implement `lib/results/live-source.stub.ts`. Every method carries typed TODOs naming what a provider must supply.
2. Set `NEXT_PUBLIC_DATA_MODE=live`. `getResultsSource()` switches and the "Demo data" pill disappears on its own. **No UI file changes.**
3. Precompute `references.json` on ingest, the way `scripts/generate-demo-data.ts` does. Do not aggregate per request — that was a 2s TTFB.
4. **Decide athlete identity first.** Feeds usually key on name + DOB rather than a durable id, and athlete URLs depend on it. Churning slugs later costs every link and every ranking.
5. Confirm whether records are ratified. An unratified record shown as fact is a correction waiting to happen.

## 6. Open questions for Kieron

- **D1 — brand.** The brief says "SUV Athletic"; the repo says that name is superseded by Suth Performance (`docs/strategy/BRAND-NAME-CORRECTION.md`, dated 2026-07-29). I used Suth Performance. If SUV is a deliberate revival, it is one constants file now.
- **D8 — the gate.** Sprint 1 shipped a sign-up gate over results. The new brief's SEO requirements are incompatible with gating, so new entity pages are public and the gate components sit unused. That reverses a deliberate monetisation choice and is the decision most worth a second opinion.
- **Pre-existing lint error** at `app/api/feedback/cancellation/route.ts:67` (`prefer-const`). Not mine, not touched, but it will fail a strict CI lint.

## 7. Bugs the browser caught that typecheck and lint did not

Kept as a record of where the risk actually was.

| Bug | Why static checks missed it |
|---|---|
| `${siteUrl}` without `()` in 10 metadata URLs — function source stringified into every canonical and og:image | Template literals accept any type. Now guarded by a test |
| `results-*` Tailwind utilities generated nothing; race strip rendered as black blocks | `@theme` is ignored in a stylesheet imported from a layout |
| SVG `<title>` with multiple text children → hydration mismatch on every result page | Valid JSX, valid types |
| Expanded splits panel not counted in virtualisation offsets → rows overlapped | Pure layout arithmetic |
| Athlete names 24px above their row | A global 48px tap-target floor on every `<a>` |
| Chart dots rendered as ovals | `preserveAspectRatio="none"` stretches circles |
| Tertiary text at 4.39:1 on percentile-band tints | Passes on the base surface; only fails on the tint |
| Elite Men won by a 60-64 athlete, straight into a generated report | Statistically valid, physically absurd |
