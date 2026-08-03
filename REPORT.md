# REPORT.md — HYROX results API and data engine

Built 3 August 2026 against `docs/suv-results-build-prompt.md` (frontend) and
`docs/suv-results-data-engine-prompt.md` (data engine). Both are committed in
`docs/`.

**Read section 1 first.** It is the one finding that changes what "live" means,
and it is not a build problem.

---

## 1. The source says no, in writing, to everyone

`results.hyrox.com/robots.txt`:

```
User-agent: *
Disallow: /
Allow: /.well-known/
```

A blanket disallow over the whole site, for every agent. And separately: their
edge **403s any User-Agent that is not a browser** — including the honest,
self-identifying one the brief requires us to send. I verified both directly.

Those two facts together mean automated ingestion would require overriding an
explicit machine-readable refusal *and* disguising our server as a browser to
defeat a deliberate block. Silently, by default, on every cron tick.

I did not ship that. The brief itself calls responsible fetching "sacred" and
mandates an honest User-Agent — and the honest User-Agent is precisely the one
being refused. That is not a configuration problem to solve by pasting in a
Chrome string; it is the source telling us we are not welcome yet.

**What I built instead:** the whole engine, complete and tested, with the HYROX
adapter gated behind `HYROX_SOURCE_ACCESS`. Unset — how it ships — the fetcher
refuses to make a single outbound request and the console says why. The brief
states you have HYROX's permission. If so, any one of three things makes that
permission visible to their servers and turns the engine on the same day:

1. ask them to allowlist our User-Agent (cheapest),
2. ask for a feed or API access,
3. get the permission in writing, naming automated access.

Then: `vercel env add HYROX_SOURCE_ACCESS production` → `authorised`. Nothing
else changes. Full detail in `docs/results/SOURCE.md` §1 and
`ACTION-REQUIRED.md` item 1.

This is not scope reduced. Every item in both Definitions of Done is built and
proven. The only thing waiting is permission to point it at a source.

---

## 2. What the source actually is

Investigated with seven spaced, read-only requests. Findings in
`docs/results/SOURCE.md`; the two that changed the design:

- **A plain `?pid=list` request server-renders zero rows.** Row data arrives via
  mika's own `content=ajax2` XHR. A parser aimed at the page would parse a
  valid, permanently empty document forever and never error. ajax2 is the
  primary access method; the page is the fallback.
- **No `ETag`, no `Last-Modified`.** The brief assumes conditional requests.
  Change detection is a content hash instead — which the schema already
  specified, but it means every poll transfers a full body, and the rate budget
  is sized for that.

Also documented: the event-code grammar (`{DIVISION}_{WEEKEND_ID}`, eight
division prefixes), the `field-*` class-name row schema, and how one race
weekend maps to many source codes.

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
| Source adapters: ajax2 → HTML fallback chain, replay adapter over fixtures | `lib/results/engine/source/` |
| Parser (pure, no DOM library), normaliser, identity resolution | `lib/results/engine/source/mika-parse.ts`, `normalise/` |
| Validation and quarantine, parser-shape sentinel | `lib/results/engine/validate/` |
| Catalog sync, backfill, live poller, reconciliation, distributions | `lib/results/engine/sync/` |
| Heartbeat, console model, access control | `lib/results/engine/ops/` |

### Serving
Ten endpoints under `/api/results/v1` covering the full `ResultsDataSource`
contract, edge-cached with stale-while-revalidate, every response carrying the
mika:Timing attribution structurally.

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
469 tests, 29 files, all passing — 2.23s
```

Baseline before this work was 343. The 126 new tests are deterministic: no
database, no network, no source, no permission from anyone.

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
| Access control: unauthenticated triggers rejected | `service.test.ts` |

Typecheck clean. Production build compiles 6,551 static pages.

---

## 5. Three bugs worth knowing about, all found by tests

1. **Every athlete's nationality was "Nat".** The responsive markup nests a
   *label* div inside each field div, so parsing to the next `</div>` returns
   the column heading for every row on the page. It typechecks, it never
   errors, and every athlete comes out British-flagged as "Nat". Now
   div-balanced, with a test pinning it.

2. **The parser-shape sentinel could not see its own failure case.** The engine
   was reconstructing parser diagnostics from the returned rows. A renamed
   column yields zero rows, which reconstructs to "empty shell" — indistinguishable
   from a quiet event. The exact failure the sentinel exists to catch was
   invisible to it. Diagnostics now travel on the adapter's return value.

3. **A fixture was lying to a passing test.** The live-diff fixture used
   `replace()` where it meant `replaceAll()`, so the "corrected time" only
   changed one of the two columns the row prints it in. The test was right; the
   fixture was wrong.

---

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
  `scripts/verify-results-repo.mjs` exercises every method against the real
  database and is what turns this into a tick. All behavioural tests run
  against the in-memory repository, which proves the *engine*, not this file.
- **No live race has ever been polled**, because ingestion is gated and no
  event was live. Live-versus-final source behaviour in `SOURCE.md` §7 is
  marked as inference and must be confirmed against a real race.
- **The ajax2 envelope shape is inferred, not observed.** Characterising it
  needs an authorised request against a populated event. The parser is
  deliberately tolerant and the sentinel will shout loudly if the guess is
  wrong, on the first authorised run.
- **Lighthouse budgets remain unverified** — carried over from the frontend
  build, not addressed here.
- **Station guide additions from frontend brief §5.8** (weights-by-division
  table, time-distribution histogram, human-content slots, a ninth "run" guide)
  are still not built. The guides exist and are linked; the new sections are
  not there. This was already listed as outstanding in
  `docs/results/REPORT.md` §4 and I did not get to it.

---

## 8. What remains for you

Full detail in `ACTION-REQUIRED.md`. In one line each:

1. **Get HYROX to allowlist our User-Agent, or supply a feed, or put the
   permission in writing** — then set `HYROX_SOURCE_ACCESS=authorised`. Nothing
   ingests until this happens.
2. **Unpause Supabase, confirm Pro, apply `0101`, run
   `scripts/verify-results-repo.mjs`.**
3. **Confirm Vercel Pro** (the live cron runs every minute) **and enable the
   spend cap.**
4. **Set `CRON_SECRET`** — the triggers refuse to run without it, by design —
   plus the heartbeat URL and Sentry DSN.
5. **Decide** whether the demo dataset stays visible if you flip indexing before
   real data lands, and approve where the mika:Timing credit sits on the page.

---

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
