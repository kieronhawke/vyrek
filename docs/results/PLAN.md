# PLAN.md — Results build

Branch `lane/results` · worktree `~/code/vyrek-results` · dev port 3005
Brief: `docs/suv-results-build-prompt.md` · Decisions: `docs/results/DECISIONS.md`

---

## 0. Constraints that shape the plan

**Dependencies are serialised.** `VYREK-LANES.md` rule 6: `package.json` changes go through
`main` and every lane rebases. So this build adds **zero new runtime dependencies**:

| Brief suggests | We use instead | Why |
|---|---|---|
| Recharts or lighter | Hand-built inline SVG charts | Lighter than any library, and the race strip / distribution curves are bespoke anyway |
| Virtualised table lib | Hand-rolled windowed list | ~80 lines, no dep, full control of the sticky header |
| `faker` names | Seeded name generator from bundled lists | Deterministic, no dep, and we control the nationality mix |

Already present and used: `motion` (FLIP + reduced-motion), `@axe-core/playwright`,
`playwright`, `lighthouse`, `vitest`, `sharp`, `next/og` via Next 16.

---

## 1. Data model

```
Event        slug (s{season}-{year}-{city}), city, country, flag, venue, dates,
             status: UPCOMING | LIVE | FINAL, season, region, divisions[]
Division     id, label, entrantCount, waveWindows[], type (open|pro|doubles|relay|adaptive)
Athlete      slug, name, nationality, ageGroup, gender, isPlaceholder, races[]
RaceResult   id, athleteSlug, eventSlug, division, rank, ageGroupRank, finishTime,
             splits: { runs[8], stations[8], roxzone }, status: FINISHED | DNF
Distribution division × station → { mean, sd, p1,p5,p10,p25,p50,p75,p90, histogram[] }
```

Segment order is fixed: Run1 → SkiErg → Run2 → SledPush → Run3 → SledPull → Run4 →
BurpeeBroadJump → Run5 → Row → Run6 → FarmersCarry → Run7 → SandbagLunges → Run8 → WallBalls,
plus Roxzone as an aggregate.

**Scale.** 14 events × 15 divisions × realistic entrant counts ≈ 45–55k results, each with 17
splits. Written as per-event JSON shards to `data/results-demo/` (gitignored), so a ranking
page loads one shard, not the world.

## 2. Data layer

`lib/results/source.ts` — the `ResultsDataSource` interface exactly as the brief's section 8.
`lib/results/demo-source.ts` — full implementation over the generated shards.
`lib/results/live-source.stub.ts` — typed TODOs naming what a licensed feed must supply.
`lib/results/percentiles.ts` — the one shared percentile engine (brief 6.4).
`scripts/generate-demo-data.ts` — fixed seed, reproducible.

Rule enforced by lint: nothing under `components/results/**` may import a source directly.

## 3. Phases

Each phase ends in a commit and a working app. Order follows the brief's section 13.

| # | Phase | Ships |
|---|---|---|
| 1 | Data engine | Generator, source contract, demo source, percentile engine, vitest on distributions + percentiles |
| 2 | Shell | Sub-nav, demo-data pill, `⌘K` / bottom-sheet search, mobile bottom tab bar, tokens |
| 3 | Events | `/results`, `/events`, `/events/{region}`, `/event/{slug}` in all three modes |
| 4 | Rankings + results | `/ranking/{event}-{division}` windowed table, `/result/{id}` race strip, `/starters/{event}` |
| 5 | Athletes | `/athlete/{slug}`, progression chart, claim-profile entry point |
| 6 | Tools | `/simulator`, `/compare`, `/tools/good-hyrox-time`, `/rankings/*` boards |
| 7 | Guides | `/hyrox` + 9 station guides, original copy, histograms, empty human-content slots |
| 8 | Reports | Pure generator function, `/reports`, `/reports/{event}` |
| 9 | Share cards | `/api/og/*` for result, athlete, event, report |
| 10 | Live mode | 20s polling, FLIP position changes, "updated Xs ago" |
| 11 | SEO | Metadata, JSON-LD, split sitemaps, canonicals, internal-link audit |
| 12 | Test + critique | Playwright ×4 devices, axe, Lighthouse, 3× screenshot self-critique |
| 13 | REPORT.md | Route list, numbers, gaps, live-feed wiring notes |

## 4. Component inventory

**Primitives** — `StatTile`, `TimeCell` (tabular-nums), `DeltaBadge` (chartreuse/amber + sign),
`StatusBadge`, `DivisionChip`, `PercentileBar`, `MicroLabel`, `Skeleton`.

**Signature** — `RaceStrip` (proportional segment timeline), `StationBars` (vs division
average), `RunPacingChart`, `DistributionCurve` (shared by simulator and guides),
`PodiumBand`, `WindowedRankingTable`, `RankRow` with FLIP.

**Shell** — `ResultsNav`, `GlobalSearch`, `MobileTabBar`, `DemoDataPill`, `ContextualCTA`
(hard-limited to one instance per page by a React context that warns on a second mount).

## 5. States

Every route template ships loading (skeletons shaped like the real content, never spinners),
empty, error, populated. Enforced by a Playwright fixture that hits each template in all four
states rather than by convention.

## 6. Honest scope note

This plan describes the full Definition of Done. It is a large build — 20 route templates,
~50k synthetic results, a bespoke chart layer, an OG image system and a four-device test
matrix. Phases land in order and each one leaves the app working, so progress is inspectable
at any point rather than only at the end. `REPORT.md` will state exactly what is green and
what is not, without rounding up.

---

# PART 2 — THE DATA ENGINE

Added 3 August 2026, against `docs/suv-results-data-engine-prompt.md`.
Read `SOURCE.md` first: the source disallows automated access, which changes
what "live" means and is the reason for the gate in E2.

## Constraints that shaped the design

1. **The source says `Disallow: /`** and 403s honest bot User-Agents. So the
   HYROX adapter is complete but gated off by default (`HYROX_SOURCE_ACCESS`).
2. **Supabase is paused** — `iiezxhzbissemvsfytwl.supabase.co` does not resolve.
   So nothing may depend on a live database to be built or proven. Every store
   access goes through a `ResultsRepository` interface with two implementations:
   Supabase (production) and in-memory (tests, CI, local). This is not a test
   convenience, it is what makes the whole engine provable today.
3. **No ETag on the source.** Change detection is a content hash, per `SOURCE.md` §6.

## Phases

| # | Phase | Lands |
|---|---|---|
| E1 | Schema | `0101_results_engine.sql`: events, divisions, athletes, results, station_distributions, ingestion_runs, sync_state, quarantine, alerts, athlete_merge_reviews. RLS on. |
| E2 | Fetch layer | Honest UA, robots policy gate, `HYROX_SOURCE_ACCESS` authorisation gate, backoff + jitter, `Retry-After`, global outbound budget, circuit breaker |
| E3 | Adapter + fallback chain | `SourceAdapter` interface; `ajax2` primary → HTML parse fallback; `ReplayAdapter` over fixtures; `Normaliser`; validation → quarantine; parser-shape sentinel |
| E4 | Workers | Catalog sync, backfill (resumable, UK first), live poller (timezone-aware self-arming), post-race reconciliation, distribution recompute, `ingestion_runs`, heartbeat |
| E5 | Serving API + LiveDataSource | `/api/results/*` reading only our store; real `LiveDataSource`; `NEXT_PUBLIC_DATA_MODE=live` |
| E6 | Live fan-out | One poll per event per interval, realtime publish, subscriber hook, saturation fallback to cached-API polling, `updates_paused` |
| E7 | Correctness | Completeness reconciliation, athlete identity resolution with review queue |
| E8 | Operator Mode | Health board, per-job status, live panel, error + quarantine log, manual controls, copy-for-fix, interval floor 15s, access control |
| E9 | Rights | Anonymising removal path, claim-to-ingested-athlete linking |
| E10 | Frontend gaps | Station guide §5.8 additions, athlete + report OG cards, regional calendars |
| E11 | Tests, runbook, report | Every test in brief §14, deterministic against fixtures |

## The one architectural decision worth stating

**`ResultsRepository` is the seam, not Supabase.** Workers, the serving API and
the admin console all talk to that interface. The Supabase implementation is one
file. This is what lets the entire engine — including live fan-out, quarantine,
circuit breaking and completeness checks — be tested deterministically with no
database, no network and no source, in milliseconds, and it is why the test
suite proves behaviour rather than mocking it away.
