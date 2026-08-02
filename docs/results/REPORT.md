# REPORT.md — Results build

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
