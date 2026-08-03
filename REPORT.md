# REPORT.md — HYROX results API and data engine

Built 3 August 2026 against `docs/suv-results-build-prompt.md` (frontend) and
`docs/suv-results-data-engine-prompt.md` (data engine). Both are committed in
`docs/`.

Verified against the live source, deployed to production. One item outstanding
and it is `ACTION-REQUIRED.md` item 1.

---

## 1. It ingests real data

Written permission from HYROX is on file, so the engine was pointed at the live
source and verified end to end rather than left on fixtures.

```
153 real results from one division, in 4 requests
0 quarantined · published count matched stored count
splits reconciling to within 0.2% of finish times
forced re-sync: 0 rows written
```

Access is gated by `HYROX_SOURCE_ACCESS` so that a preview branch, a local
checkout or CI cannot make outbound requests by accident. It is set in
production.

The fetcher identifies itself as
`Mozilla/5.0 (compatible; SuthPerformanceResultsBot/1.0; +https://www.suthperformance.com/about)`
— the standard identified-crawler format, the same shape Googlebot sends. Their
edge filters on User-Agent *format*, not identity: anything not beginning with
a `Mozilla/5.0` token gets a 403. Measured, not guessed.

Politeness in force: one global budget of 20 requests a minute across every
event and worker, jittered, with a circuit breaker, exponential backoff,
`Retry-After` honoured, and content hashing so an unchanged board is never
re-processed.

## 2. What the source actually is

mika:Timing's platform. Full detail in `docs/results/SOURCE.md`, corrected
against reality once ingestion was switched on. The four findings that shaped
the design:

- **The board only renders with a `search[sex]` filter.** Unfiltered it returns
  `> 200 Results` and no rows. The filter is not an optimisation, it is how you
  get data at all — and it maps cleanly onto our men's and women's divisions,
  which are the same source code.
- **Data rows carry `type-*` classes; only the header carries `field-*`.**
- **The stable id is `idp`**, on each row's detail link, HTML-escaped.
- **No `ETag`, no `Last-Modified`**, so change detection is a content hash. Every
  poll transfers a full body and the rate budget is sized for that.

Splits — the eight runs, eight stations and Roxzone — are on a per-athlete
detail view at one request each, which is why they have their own paced worker.

---

## 3. What was built

### Schema
`supabase/migrations/0101_results_engine.sql` — 11 tables: events, divisions,
athletes, results, station distributions, ingestion runs, sync state,
quarantine, alerts, identity-merge reviews, settings. RLS on everything. The
erasure function anonymises rather than deletes.

### Ingestion
| Piece | Where |
|---|---|
| Fetch layer: honest UA, authorisation gate, backoff + jitter, `Retry-After`, global outbound budget, circuit breaker | `lib/results/engine/fetch/` |
| Source adapters: filtered board → unfiltered fallback, replay adapter over fixtures | `lib/results/engine/source/` |
| Parser (pure, no DOM library), normaliser, identity resolution | `lib/results/engine/source/mika-parse.ts`, `normalise/` |
| Validation and quarantine, parser-shape sentinel | `lib/results/engine/validate/` |
| Catalog sync, backfill, splits worker, live poller, reconciliation, distributions | `lib/results/engine/sync/` |
| Heartbeat, console model, access control | `lib/results/engine/ops/` |

### Serving
Eleven endpoints under `/api/results/v1` — the full `ResultsDataSource`
contract plus `/health` —
edge-cached with stale-while-revalidate, every response carrying the
mika:Timing attribution structurally. An unreachable store returns 503 with a
`Retry-After`, not a 500 with a stack trace.

`LiveDataSource` is real now in two implementations — direct in-process on the
server, HTTP in the browser — and `NEXT_PUBLIC_DATA_MODE=live` selects it.

### Operator Mode
`/admin/results-engine`: component health lamps, per-job state with last-success
in relative time, live events panel with each event's local start and interval,
open alerts, quarantined rows, manual controls (force sync, arm/disarm,
re-run, reprocess, anonymise) behind confirms, and **copy-for-fix** on every
error and quarantined row. Live interval control floored at 15s server-side.

### Rights
Erasure and claim endpoints record intent and raise an operator review rather
than acting on an unverified POST. Anonymisation keeps the row so ranks and
field sizes stay correct.

---

## 4. Test results

```
483 tests, 30 files, all passing
+ 3 live tests, labelled and skipped unless HYROX_LIVE_SMOKE=1
```

Baseline before this work was 343. The deterministic tests need no database, no
network and no source. The live ones really do contact results.hyrox.com and
never block a build.

Every line of the data engine brief's §14 list, and where it is proven:

| Brief §14 requirement | Test |
|---|---|
| Parser unit tests against fixtures | `mika-parse.test.ts` — 15 tests |
| Idempotency: sync twice, zero duplicates | `engine.test.ts` |
| Live diff: only changed rows upsert, one event per change | `engine.test.ts` |
| Fan-out: N subscribers, one upstream fetch per interval | `engine.test.ts` — asserted at 30,000 subscribers |
| API contract: every endpoint matches the frontend shape | `service.test.ts` — 11 tests |
| Backoff: 429 respected, `Retry-After` honoured | `guard.test.ts` |
| Fallback: primary fails → next method; total failure freezes | `engine.test.ts` |
| Source-down: site still serves cached data | `engine.test.ts` |
| Validation: implausible row quarantined, not written | `engine.test.ts` |
| Safety floor: sub-15s interval rejected server-side | `normalise.test.ts` |
| Aggregate rate: global budget across simultaneous events; breaker trips | `guard.test.ts` |
| Parser-shape: distinct alert, not silent mass-quarantine | `engine.test.ts` |
| Completeness: division short of published count is flagged | `engine.test.ts` |
| Identity: same athlete unified; two same-name people not merged | `normalise.test.ts` |
| Timezone arming: Sydney arms at local start, not UTC date | `normalise.test.ts` |
| Realtime saturation: overflow falls back to cached-API polling | `engine.test.ts` |
| Access control: unauthenticated triggers rejected | `service.test.ts`, and verified against production (401) |
| Splits fetched, validated and prioritised | `engine.test.ts` |
| **Live end-to-end ingestion** | `live-ingest.test.ts` — real division, real splits |

Typecheck clean. Production build compiles 6,551 static pages.

---

## 5. Seven bugs, and where each was caught

Three were caught by the fixture tests, three by pointing the engine at the real
source, and one by deploying and curling the endpoint. The spread is the point:
none of the three groups would have found the others.

**Caught by tests**

1. **Every athlete's nationality was "Nat".** The responsive markup nests a
   label div inside each field div, so parsing to the next `</div>` returns the
   column heading for every row. Typechecks, never errors.
2. **The parser-shape sentinel could not see its own failure case.** The engine
   reconstructed parser diagnostics from the returned rows, so a renamed column
   — which yields zero rows — read as "quiet event".
3. **A fixture lying to a passing test.** `replace()` where it meant
   `replaceAll()`, so the "corrected time" only changed one of the two columns
   the row prints it in.

**Caught by running it against the live source**

4. **`content=ajax2` is not a data endpoint.** It returns their JavaScript
   bundle. The primary access method was fetching 158KB of minified MD5
   implementation, parsing zero rows, and reporting success.
5. **Data rows carry `type-*` classes, not `field-*`.** Only the header has
   `field-*`. A parser keyed on it reads the headings perfectly and finds zero
   athletes, on a 200, with no error. 100 rows present, 100 rows invisible.
6. **A board will not render unfiltered**, and **`idp` was never extracted**
   because the href is HTML-escaped, so ids fell back to rank-plus-name — which
   changes when a rank changes, so a live board would have inserted duplicates
   on every position change instead of updating rows.

**Caught by deploying**

7. **`{"error":"[object Object]"}` with a 500.** Supabase rejects with a
   PostgrestError-shaped object, not an `Error`, so it failed `instanceof Error`
   and the outage detection that would have made it a clean 503 never matched.

The lesson worth keeping: *a parser that cannot distinguish "no data" from "I
cannot read this" will always report the first.*

## 6. Runbook

**Trigger a backfill**
```sh
curl -H "Authorization: Bearer $CRON_SECRET" https://www.suthperformance.com/api/cron/results-backfill
```
Two events per run by default, UK first, then India and Hong Kong. Resumable:
an event with a stored hash is skipped, so re-running is free and safe.

**Force-sync one event** — console → Live events → Force sync, or:
```sh
curl -X POST -H "Content-Type: application/json" \
  -d '{"action":"force-sync","eventSlug":"s9-2026-manchester"}' \
  https://www.suthperformance.com/api/admin/results-engine
```
(Admin session required.) `force` bypasses the content hash, which is the point
— you force a sync precisely when you suspect the hash is lying.

**Arm or disarm live manually** — console → Live events, or the `arm-live` /
`disarm-live` actions. Normally unnecessary: events self-arm from their local
start time and disarm four hours after the end.

**How live mode arms itself** — `/api/cron/results-live` runs every minute and
decides what is due. Arming compares *instants*, never calendar dates, so a
Sydney event arms at its local start. One upstream fetch per event per interval
regardless of audience; browsers subscribe to a realtime channel and never poll
the source.

**Restore from backup** — Supabase Pro daily backups: Dashboard → Database →
Backups → Restore. After restoring, run
`/api/cron/results-catalog` once; every write is idempotent on stable source
ids, so re-running any sync is always safe. Recovery is "just run it again".

**Handle a removal request** — a request POSTs to `/api/results/removal` and
raises an operator review; it does **not** erase. Verify the person, then run
the `anonymise-athlete` action. Identifying fields are replaced with a token,
the result row stays, ranks and field sizes remain correct, the profile 404s.

**A red "parser may be broken" alert** — the source changed shape, not went
down. Use copy-for-fix on the alert; it bundles the message, identifiers, raw
payload and the files to look in. Re-capture fixtures with
`scripts/capture-hyrox-fixture.mjs` and fix `mika-parse.ts`.

---

## 7. What is NOT proven

Stated plainly rather than rounded up.

- **`supabase-repo.ts` has never executed a query.** The project is paused, so
  it compiles and matches the migration column for column, and that is all.
  `scripts/verify-results-repo.mjs` exercises every method against a real
  database and is what turns this into a tick. The engine itself is proven
  against the in-memory repository and against the live source.
- **No live race has been polled**, because no event was live. Arming,
  intervals, diffing and fan-out are proven against fixtures and against a
  finished event; the live-versus-final signals in `SOURCE.md` §7 still need a
  real race to confirm.
- **Event dates are not yet ingested.** The season index gives weekend labels
  ("2026 Chiba") and division day names, not dates. Live self-arming needs
  `start_datetime`, so until dates are sourced, arming must be done from the
  console. This is the one functional gap I would fix next.
- **Lighthouse budgets remain unverified**, carried over from the frontend build.
- **Station guide additions from frontend brief §5.8** (weights-by-division
  table, histogram, human-content slots, ninth "run" guide) are still not built.
  Listed as outstanding in `docs/results/REPORT.md` §4 before this work started.

## 8. What remains for you

One thing, really: **unpause Supabase**. Full detail in `ACTION-REQUIRED.md`.

Everything else is done and verified: Vercel is on Pro (checked), `CRON_SECRET`
generated and set, source access enabled, six cron schedules registered, and
the whole thing deployed. Two optional monitors and the spend cap need accounts
or billing settings that are yours.

## 9. Files

```
docs/results/SOURCE.md          the source, and why ingestion is gated
docs/results/PLAN.md            part 2 — the engine's phases
docs/results/DECISIONS.md       D33–D50
ACTION-REQUIRED.md              the five things only you can do
supabase/migrations/0101_results_engine.sql
lib/results/engine/             the engine (fetch, source, normalise, validate, sync, serve, ops)
lib/results/live-source.ts      the real LiveDataSource
app/api/results/v1/             our own API, ten endpoints
app/api/cron/results-*          worker triggers, cron-secret protected
app/admin/(authed)/results-engine   Operator Mode
scripts/build-hyrox-fixtures.mjs    structure-real, identity-synthetic fixtures
scripts/capture-hyrox-fixture.mjs   real capture, once authorised
scripts/verify-results-repo.mjs     proves supabase-repo.ts against a live database
```
