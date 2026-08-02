# SUV RESULTS DATA ENGINE: Autonomous Build Prompt for Claude Code

Paste everything below the line into Claude Code at the repo root. This pairs with the earlier frontend brief (`docs/suv-results-build-prompt.md`) and implements the real `LiveDataSource` that brief left as a stub.

---

You are building the **data engine** behind SUV Results: the ingestion pipeline and our own API that fetches publicly available Hyrox results data, normalises it into our schema, stores it in Supabase, and serves it to the SUV Results frontend through our own endpoints, with a live-race fan-out mode.

The frontend already exists and reads everything through a `ResultsDataSource` interface. Your job is to make that interface real, backed by our own database of ingested public results, and to flip `NEXT_PUBLIC_DATA_MODE=live` on cleanly.

## 1. How to work (autonomy rules)

- Work fully autonomously. Do not stop to ask questions. When something is ambiguous, make the call a strong backend engineer would make and log it in `DECISIONS.md` with one line of reasoning.
- First produce `SOURCE.md` (findings on the data source, section 3) and `PLAN.md` (phases, schema, endpoints, workers). Then begin immediately.
- Commit at the end of each phase with a clean message. Keep artefacts out of git.
- Finish with `REPORT.md`: schema, endpoint list, ingestion behaviour, test results, and an operator runbook (how to trigger a backfill, how live mode arms itself, how to handle a removal request).
- Keep going until the Definition of Done is fully green. Fix failures and re-test. Do not declare done with failing checks.

## 2. Hard constraints (read twice, never violate)

**Permission and legal basis**
- The site owner has confirmed directly with Hyrox that using publicly available Hyrox results data is permitted. Build on that basis.
- Ingest only factual results data: event metadata, divisions, athlete names, nationalities, age groups, ranks, finish times, station and run splits, Roxzone times, wave and bib data.
- Attribute the official timing source. Every results view credits the official Hyrox timing (mika:Timing) as the source of the underlying data, with a link to the official results where appropriate.
- Do NOT copy any competitor's original written content, page design, CSS, markup or assets (hyresult, HyroxVault, roxfit or any other). We take none of their creative work. All copy and design in this project is original and already built. You are ingesting Hyrox's factual data, nothing else.

**Responsible fetching (this protects the business, treat it as sacred)**
- Never hammer the source. Live polling interval is 20 seconds per live event, configurable via env, floor of 15 seconds. There is no per-second polling anywhere.
- One server-side worker fetches per live event and fans out to clients. Client browsers must NEVER poll the source directly. See section 8.
- Identify the fetcher with a clear, honest User-Agent that names SUV Athletic and a contact URL.
- Exponential backoff with jitter on any error or rate-limit signal. Respect `Retry-After` and any 429/503.
- Cache aggressively. Use ETag / If-None-Match or a content hash so unchanged data is never re-processed. Finalised events are fetched once and then left alone.

**Data protection (results are personal data)**
- Results contain names, nationalities and age groups, so treat the store as containing personal data under UK GDPR.
- Implement a removal path that anonymises rather than hard-deletes (replace identifying fields with an anonymised token, keep the row for ranking integrity), matching the project's existing erasure policy.
- The "claim your profile" flow already specced is the authorised route for a person to control their own athlete page; wire ingested athletes so a claim can attach to an existing ingested record.

**Architecture and hygiene**
- Ingestion runs OUTSIDE the web request path (worker / cron / queue), never inside a page render.
- Our frontend and public API read only from our own database, never live-fetch the source in a request. If the source is down, we still serve from our store.
- Follow existing Supabase conventions and migration patterns in the repo. Idempotent everything. No bulk data files committed to git.

## 3. Investigate the source first (write SOURCE.md before coding)

Do not assume the shape of the source. Investigate results.hyrox.com (the mika:Timing platform) and document, in `SOURCE.md`:

- Whether structured data is reachable (a JSON or CSV export, an internal data endpoint used by their own frontend, or a raceresult/mika data URL), or whether it requires HTML parsing. Prefer the most structured, lowest-impact access available.
- The identifiers available for events, divisions, athletes and individual results, and which are stable enough to key our upserts on.
- How live data appears during an active race versus finalised data afterwards.
- Rate-limit behaviour and any caching headers.
- Formats for time, age group, nationality codes, division naming, and how doubles and relay partners are represented.

Save two or three small real response samples as test fixtures (small, representative, gitignored if large). Build the parser against reality, not guesses.

## 4. Canonical data model

Store our own normalised model, decoupled from the source. Supabase Postgres tables:

- `events`: id, slug (`s{season}-{year}-{city}`), name, city, country, region, season, status (`upcoming|live|final`), start_date, end_date, venue, athlete_count, source_event_id, last_synced_at.
- `divisions`: id, event_id, division_key, display_name, entrant_count.
- `athletes`: id, slug, name, nationality, source_athlete_id, claimed_by_user_id (nullable), is_demo (bool).
- `results`: id, event_id, division_id, athlete_id, source_result_id, rank_overall, rank_age_group, age_group, sex, finish_time_ms, roxzone_time_ms, status (`finished|dnf|dns`), wave, bib, splits (JSONB: ordered runs and stations with time_ms), created_at, updated_at.
- `station_distributions`: precomputed medians and percentile buckets keyed by (scope=event|global, division_key, station_key, age_group, sex). Rebuilt after ingestion so the percentile engine reads instantly.
- `ingestion_runs`: id, mode, started_at, finished_at, events_touched, rows_upserted, errors, status. Observability.
- `sync_state`: source_event_id, last_seen_hash, last_polled_at, is_live. Drives incremental sync and change detection.

Store splits as JSONB on the result for fast race-strip rendering, and maintain `station_distributions` separately for the percentile and comparison tools. This gives fast reads for both the individual page and the analytics.

## 5. Ingestion modes

**Catalog sync (scheduled)**
- Fetch the event list, upsert events and divisions.
- For any event newly `final`, fetch full results for every division and upsert idempotently keyed on source_result_id.
- Run on a schedule (for example hourly) to catch newly finalised events. Skip anything unchanged via hash.

**Backfill (one-off, resumable)**
- Walk historical seasons and pull results into the store to seed depth. Must be resumable (checkpoint per event) and rate-limited hard, since this is a large one-time pull. Prioritise UK events first, then India and Hong Kong, then the rest, matching market priorities.

**Live mode (self-arming)**
- An event auto-arms as live when its date is today and the source shows an active leaderboard.
- While live, poll that event every 20 seconds, diff against last_seen_hash, upsert only changed rows, and publish changes to that event's realtime channel.
- Auto-disarm when the source marks divisions closed or the event date passes.

## 6. Parser and adapter layer

- `SourceAdapter`: the only code that talks to the source. Returns raw source records. All source-specific quirks live here.
- `Normaliser`: maps raw records to the canonical model. Handles time parsing to ms, age-group and nationality normalisation, division-key mapping, DNF/DNS, and doubles/relay partner linking.
- If the source format ever changes, only these two files change. The rest of the system is insulated.

## 7. Our serving API

Build our own REST endpoints under `/api/results/...` that satisfy the existing `ResultsDataSource` contract and read only from our database:

- `listEvents`, `getEvent`, `getRanking` (cursor-paginated, filter by age group, in-table search), `getResult`, `getAthlete`, `getStarters`, `searchAll`, `getRecords`, `getStationDistribution`.
- Heavily cached at the edge with stale-while-revalidate. Ranking endpoints paginate; never return thousands of rows in one payload.
- This is our own API. Structure it cleanly enough that a documented public version could be exposed later as a separate product, but v1 only needs to power our frontend.
- Flip the frontend: implement the real `LiveDataSource` against these endpoints, and make `NEXT_PUBLIC_DATA_MODE=live` use it while `demo` keeps the seeded data for local dev.

## 8. Live fan-out (the signature capability)

- One worker polls the source per live event. That is the only thing touching the source during a race.
- On each upsert of new splits, publish to a per-event realtime channel (Supabase Realtime on Postgres changes, or an equivalent pub/sub).
- Frontend ranking and event pages subscribe to that channel and update via push, with FLIP position animations already built on the frontend. Zero client-side polling of the source.
- Net effect: source load is constant regardless of audience size, and users see updates within a couple of seconds. Verify this explicitly in tests: N subscribers, one upstream poll per interval.

## 9. Data integrity

- Idempotent upserts keyed on stable source IDs. Running any sync twice must never create duplicates.
- Wrap multi-row event syncs so a partial failure does not leave an event half-updated.
- Recompute `station_distributions` after each successful event sync.
- Validate parsed rows (times within sane bounds, splits sum roughly to finish plus Roxzone) and quarantine anything that fails validation into an errors table rather than writing bad data.

## 10. Observability and operations

- Every ingestion run writes to `ingestion_runs` (mode, timings, events touched, rows upserted, errors, status).
- Wire error tracking (Sentry or equivalent, free tier is fine to start) so exceptions are captured with context.
- Wire an external dead-man's-switch monitor (UptimeRobot, Better Stack, cron-job.org or similar, free tier): a heartbeat the catalog sync pings on every successful run, so an alert fires when a sync does NOT happen, not only when one errors. This catches silent stoppage.
- Runbook in `REPORT.md`: trigger a backfill, force-sync one event, arm/disarm live manually, restore from backup, process a removal request.

## 11. Resilience and backups (design for fail-safe, not zero-failure)

The system depends on a third-party source we do not control, so assume the source will at some point change, slow down, rate-limit us, or go offline. The requirement is not that nothing ever fails; it is that the public site never breaks and ingestion heals itself. Build all of the following:

- **Our database is the primary buffer.** The frontend and public API read only from our own store, never live-fetch the source in a request. If the source is down, the site keeps serving the last good data with no visible impact.
- **Automatic database backups.** Rely on Supabase Pro daily backups, and document the restore procedure in the runbook. Optionally also dump a nightly snapshot of core tables to cheap object storage as a second copy.
- **Fallback fetch chain.** Define an ordered list of access methods for the source (for example structured endpoint first, HTML parse second). If the primary method fails, automatically try the next. If all methods fail, do not write anything: freeze on last-good data, mark affected live events as `updates_paused` (never present stale data as live), and alert.
- **Self-healing workers.** Trigger ingestion on a schedule so each run is independent; a crashed run must never stop future runs, the next tick resumes. Failed fetches retry with exponential backoff and jitter, respecting `Retry-After`.
- **Post-race reconciliation for accuracy.** Results are sometimes corrected after a race (DQs, timing fixes). Re-sync each finalised event on a decaying schedule for a window after the event so amendments are captured, then leave it alone.
- **Validation and quarantine.** Validate every parsed row (times within sane bounds, splits sum to finish plus Roxzone within tolerance, required fields present). Anything failing goes to a quarantine table with the raw payload; it is never written to live tables. Surface quarantined rows in the dashboard for review and reprocessing.
- **Safe recovery by construction.** Every write is idempotent and keyed on stable source IDs, so any sync can be safely re-run at any time with zero risk of duplicates or corruption. Recovery is always "just run it again."

## 12. Admin dashboard (Operator Mode)

All ingestion must be observable and controllable from the admin dashboard, built in the project's Operator Mode and following the "timing system, not a CRM" thesis: a status console with tabular Geist Mono numbers and status indicators, not a busy CRM. It must include:

- **Component health board:** green / amber / red status per component (catalog sync, live poller, source reachability, database, realtime).
- **Per-job status:** current state (`idle | running | live-polling | error | paused`), last successful pull as a relative time ("14s ago"), and next scheduled run.
- **Live events panel:** every event currently armed live, with last-update time and current refresh interval each.
- **Error log:** recent errors and quarantined rows with detail, severity, affected event/division, and timestamp; filterable.
- **Manual controls:** force-sync a specific event, arm or disarm live for an event, re-run a failed job, and reprocess quarantined rows. Guard destructive actions with a confirm step.
- **Copy-for-fix:** every error and quarantined row has a "copy report" action that bundles the message, stack, source context and relevant identifiers into a single ready-to-paste block, so the operator can hand it straight to an AI assistant or developer to fix. This is a first-class feature, not an afterthought.
- **Live interval control:** a setting to adjust the live-race refresh interval, with a hard safety floor of 15 seconds enforced server-side so it can never be set aggressively enough to get the fetcher blocked. Default live interval 20 seconds; default idle behaviour is the hourly catalog sync. Live mode still self-arms and self-disarms automatically; this control only tunes within safe bounds.
- **Data mode indicator:** clearly show whether the site is serving `live` or `demo` data.

## 13. Hardening and correctness (review pass)

Operational targets that define "foolproof" in measurable terms: public site availability effectively 100 percent (the site serves from our own database even when the source is unreachable); live updates propagate to clients within a few seconds; ingestion recovers automatically from any transient failure without manual intervention. Build all of the following to hit them:

- **Global outbound rate budget and circuit breaker.** Independent of how many events are live at once, cap total requests to the source under one global budget with jittered scheduling, so a busy weekend with several simultaneous live events never aggregates into an aggressive request rate from our IP. A circuit breaker trips and backs everything off if error rate or volume crosses a threshold. Enable the Vercel spend cap alongside so a bug can never cause a cost blow-up.
- **Parser-shape sentinel.** Distinguish "source is down" from "source changed shape." If parse success rate drops sharply or expected fields disappear across a batch, raise a distinct loud alert ("parser may be broken") instead of silently quarantining everything. This is how a mid-season structure change is caught in hours, not weeks.
- **Completeness reconciliation (accuracy checksum).** Event pages publish per-division entrant counts. After syncing an event, compare stored row counts against those published counts and flag any division that does not match, so a missed page of results can never pass unnoticed. Apply the same expected-versus-stored check across the initial backfill.
- **Athlete identity resolution.** Unified athlete history is the core value. Resolve athletes on the stable source athlete ID where present. Where it is absent or ambiguous, use a conservative match and flag uncertain cases for review; never auto-merge two records that could be different people. Fragmented or wrongly-merged athletes are a correctness failure, not a cosmetic one.
- **Timezone-aware self-arming.** Events are global. Arm and disarm live mode from each event's actual local start datetime (stored in UTC with offset), never from a naive calendar "today," so events in Sydney, Mumbai, Hong Kong or New York arm at the right moment. Vercel cron is UTC-only, so do the offset maths in the handler.
- **Realtime saturation fallback.** If concurrent realtime connections approach the plan ceiling during a very large race, overflow clients fall back to light polling of OUR cached API (never the source), so the board keeps updating for everyone. Degrade gracefully, never drop users.
- **Access control.** The admin dashboard and every worker trigger endpoint are protected: only operators reach the dashboard controls, and sync endpoints require a cron secret so they cannot be triggered by anyone. Powerful actions (force sync, arm/disarm, reprocess) sit behind auth and a confirm step.

## 14. Testing

- Parser unit tests against the saved source fixtures.
- Idempotency test: run a sync twice, assert zero duplicates.
- Live diff test: feed two successive leaderboard snapshots, assert only changed rows upsert and the realtime event fires once per change.
- Fan-out test: many subscribers, assert exactly one upstream fetch per interval.
- API contract tests: every endpoint returns data satisfying the `ResultsDataSource` shape the frontend expects.
- Backoff test: simulate a 429 and assert the fetcher backs off and respects `Retry-After`.
- Fallback test: force the primary fetch method to fail and assert the chain falls through to the next method, and that total source failure freezes on last-good data and marks live events `updates_paused` without writing anything.
- Source-down test: simulate the source being unreachable and assert the public site still serves cached data with no error.
- Validation test: feed an implausible row (splits that do not sum, out-of-range time) and assert it is quarantined, not written.
- Safety-floor test: attempt to set the live interval below 15 seconds via the dashboard control and assert it is rejected server-side.
- Aggregate rate test: simulate several simultaneous live events and assert total outbound request rate stays under the global budget; assert the circuit breaker trips under a forced error spike.
- Parser-shape test: feed a batch with missing or changed fields and assert a distinct "parser may be broken" alert fires rather than silent mass-quarantine.
- Completeness test: sync an event whose stored rows fall short of the published entrant count and assert a mismatch is flagged.
- Identity resolution test: the same athlete across two events resolves to one profile; two different people sharing a name are not merged.
- Timezone arming test: an event in a non-UTC zone arms at its local start time, not on the UTC calendar date.
- Realtime saturation test: at the connection ceiling, overflow clients fall back to cached-API polling and still receive updates.
- Access control test: unauthenticated access to dashboard controls and to sync trigger endpoints is rejected.
- Deterministic vs live tests: all of the above run against recorded fixtures so they are fast and reliable in CI; a separate, clearly labelled live smoke test may run against the real source on a schedule but never blocks the build.

## 15. Build order

1. Investigate source, write `SOURCE.md` and `PLAN.md`.
2. Supabase migrations for the canonical schema plus `ingestion_runs`, `sync_state` and the quarantine table.
3. `SourceAdapter` (with the fallback fetch chain) and `Normaliser` with fixture-based tests, plus validation and quarantine.
4. Catalog sync worker with idempotent upserts, backoff, honest User-Agent, heartbeat ping, and the global outbound rate budget and circuit breaker.
5. Serving API endpoints plus the real `LiveDataSource`; flip `live` mode on.
6. Station distribution recomputation and the percentile feed.
7. Live mode plus realtime fan-out plus subscriber wiring on the frontend, with timezone-aware self-arming, the `updates_paused` state, and realtime saturation fallback.
8. Resilience layer: fallback chain wired end to end, post-race reconciliation, backup restore procedure documented, dead-man's-switch monitor connected.
9. Correctness layer: completeness reconciliation against published entrant counts, parser-shape sentinel, and athlete identity resolution.
10. Admin dashboard (Operator Mode) with access control: health board, per-job status, live panel, error and quarantine log, manual controls, copy-for-fix, and the safety-floored live interval control.
11. Backfill worker (UK first, then India and Hong Kong), rate-limited and resumable, with completeness checks.
12. Removal/anonymisation path and claim-to-ingested-athlete linking.
13. Full test pass (deterministic against fixtures), then the runbook and final commit.

## 16. Definition of Done

- Operational targets met: public site availability is effectively 100 percent because it serves from our own database even when the source is unreachable, and live updates reach clients within a few seconds.
- `SOURCE.md` documents the real source structure and the access method chosen.
- The full `ResultsDataSource` contract is served from our own database; `NEXT_PUBLIC_DATA_MODE=live` works end to end and `demo` still works for local dev.
- Catalog sync, backfill and self-arming live mode all function, all idempotent, all rate-limited with backoff and honest User-Agent.
- Live races update via server-side poll and realtime fan-out; browsers never poll the source; one upstream fetch per event per interval regardless of audience, proven in tests.
- The site keeps serving from our database when the source is down; the fallback fetch chain works; total source failure freezes on last-good data and marks live events `updates_paused` rather than showing wrong data.
- Database backups are enabled and the restore procedure is documented; the dead-man's-switch heartbeat is connected and alerts on a missed sync.
- Bad or implausible rows are quarantined, never written; post-race reconciliation captures amendments to finalised events.
- The admin dashboard shows component health, per-job status with last-pull time, live events, and an error and quarantine log, and provides working manual controls, copy-for-fix on every error, and a live interval control with an enforced 15-second floor.
- Aggregate outbound request rate stays within a single global budget across simultaneous live events; the circuit breaker and the Vercel spend cap are in place.
- A source structure change raises a distinct "parser may be broken" alert rather than failing silently; completeness reconciliation flags any division short of its published entrant count.
- Athlete identity resolves to unified profiles on stable IDs, with uncertain cases flagged and never wrongly merging distinct people.
- Live self-arming is timezone-correct for global events; realtime saturation degrades gracefully to cached-API polling without dropping users.
- The admin dashboard and all worker trigger endpoints are access-controlled.
- Every results view attributes the official timing source. No competitor content, design or markup copied anywhere.
- Removal path anonymises rather than deletes; claim-your-profile can attach to an ingested athlete.
- All tests green (deterministic against fixtures; live smoke tests do not block the build). `SOURCE.md`, `PLAN.md`, `DECISIONS.md`, `REPORT.md` present and current, runbook included.

Begin now. Do not stop until the Definition of Done is green.
