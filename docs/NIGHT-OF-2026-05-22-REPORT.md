# Vyrek — Overnight build report

**Session:** 2026-05-22 (overnight)
**Brief:** Phase B2 (Parts 1–5) plus build/test/competitor analysis per the
user's instruction to "build the end product, test it, test it against our
competitors."

This is the morning hand-off doc. Read this first.

---

## What I did

### Part 1 — Copy + navigation fixes ✅

Most of Part 1 was already done in prior work. Verified:

- All hero / nav / final-CTA / plan-teaser CTAs use **"Find your plan"** or
  **"Start training"**. No "Get your plan" or "Start free trial" remain on
  CTAs.
- Coach is **James Wright** throughout (`lib/coaches.ts`, FAQ, layout).
- Quiz top bar already has the **✕ close icon** with the
  "Leave quiz? Your progress is saved." confirm
  (`components/quiz/question-shell.tsx:62–69`).
- Footer monogram present (`components/marketing/footer.tsx:60`).
- Footer links repointed:
  - `Contact` → `/contact` (was `mailto:hello@vyrek.com`)
  - `How it works` → `/how-it-works` (was anchor `/#plan-teaser`)
  - Added `Pricing` to Product column
  - Social links point at `instagram.com/vyrek` and `tiktok.com/@vyrek`.

### Part 2 — Media folder ✅ *(scaffolded only — no Drive download)*

I cannot download from your Google Drive folder (auth required and outside my
sandbox). Instead I:

- Created `public/media/{video,images}/` with the exact filenames the site
  references.
- Copied existing `/public/posters/*.jpg` and `/public/hero.{mp4,poster.jpg}`
  in as **placeholders** so every page renders cleanly today.
- Wrote `public/media/README.md` with the mapping of Adobe Stock filename →
  target filename. When you drop the licensed files in, replace by filename.

### Part 3 — Quiz rebuild ✅ *(full 15-screen rebuild shipped)*

After the initial pass I came back and built the full Phase B2 §3 quiz flow.
The v1 quiz at `/quiz/[step]` still exists as legacy code but is no longer
linked; `/quiz` now renders the new flow.

**Helpers** (`lib/quiz-schema.ts`):
- `RunnaQuizAnswers` type (intent / bestTime / raceDate / raceSuggestion /
  days / sessionLength / location / equipment / partner / injuries).
- `determineProgramme(answers)` with the priority order from §3.4
  (doubles → first-race → pro vs sub-90 → conservative fallback).
- `determineStartDate(today?)` — next Tuesday from today, never today.
- `determineRaceDate(start, weeks, userRaceDate?)` — user date wins,
  otherwise project N weeks out.
- 11 stand-alone tests in `scripts/test-quiz-helpers.mjs`, all pass.

**Flow definition** (`lib/quiz-flow.ts`):
- 15 screens defined as a typed discriminated union with `showIf` predicates
  for the four conditional screens (best time / race suggestion / equipment
  / partner).
- `visibleScreens(answers)` filters the list to only the screens that apply
  to the current answers — moving forward or back recomputes automatically.
- `applyProgrammeShortcut(answers, slug)` honours `/quiz?program=first-race`
  / `sub-90` / `doubles` / `pro` by pre-filling intent + bestTime.

**State** (`hooks/use-runna-quiz.ts`):
- Persists to `vyrek:quiz:v2:state` (separate from v1 storage key —
  no migration drama).
- Round-trips `raceDate` through `toISOString()` so it survives JSON.
- `setAnswer`, `mergeAnswers`, `setScreenIndex`, `reset`.

**Screens** (`components/quiz-v2/`):
- `welcome-carousel.tsx` — 3-slide story carousel, 4s auto-advance,
  swipeable, tap-to-skip, top-progress bars (CSS keyframes), `Skip` exit.
- `interstitial-screen.tsx` — full-bleed image + headline + caption,
  4s auto-advance, tap-to-advance, top progress bar.
- `single-select-screen.tsx` — Phase B2's auto-advance rule
  (200ms delay after tap), supports optional `detail` line under each
  option.
- `multi-select-screen.tsx` — chip layout, Continue button only.
- `calendar-screen.tsx` — native `<input type="date">` with min=today,
  midnight-UTC normalisation.
- `summary-screen.tsx` — review screen (NOT a question), renders the
  computed programme + start/race dates via `date-fns format`.
- `email-gate-screen.tsx` — 16px input, `[ TRIAL STARTS WHEN YOU SUBSCRIBE ]`
  mono helper, RFC-ish email regex.

**Shell** (`components/quiz-v2/quiz-shell.tsx`):
- ← back / slim 2px progress bar / `X / N` counter / ✕ close (confirms
  before exiting if any answers exist).
- `withViewTransition(update)` helper — wraps state updates in
  `document.startViewTransition` where supported, falls back to plain calls.

**Orchestrator** (`components/quiz-v2/quiz-flow.tsx`):
- Single component, single `useRunnaQuiz` state. Reads `?program=` once on
  mount via a ref-guarded effect (no setState-in-effect violation).
- Computes the visible-screen list once per answer change.
- Clamps `screenIndex` if the visible list shrinks after answering.
- Renders welcome/interstitial full-bleed (no shell); renders question
  screens inside `QuizShell` with appropriate footer (auto-advance vs
  Continue vs Continue/Skip vs final Submit).
- Email-gate submit best-effort POSTs to `/api/email-gate` (route does not
  exist yet — fails silently, then routes to `/quiz/done`).

**Smoke-tested** at `next start` on `localhost:3010` — all 17 routes still
return 200 including all four `/quiz?program=…` shortcuts.

### Part 4 — 5 missing pages ✅

All under `/app`:

| Route | File | Notes |
|---|---|---|
| `/about` | `app/about/page.tsx` | Hero band, "Why Vyrek?" 3 paragraphs, "Built in the UK", CTA |
| `/contact` | `app/contact/page.tsx` | 3 inbox cards, social, office line |
| `/press` | `app/press/page.tsx` | Press contact, brand assets (logo SVGs live, zip/PDF "Coming soon"), about paragraph |
| `/how-it-works` | `app/how-it-works/page.tsx` | 4 numbered sections, alternating image/text |
| `/programmes` | `app/programmes/page.tsx` | 4 detail sections, "Who this is for" + "What you'll do" bullets, per-programme CTA |

All routes return 200. All in Trainer's Notebook voice, UK English.

### Bonus — `/api/email-gate` route ✅ *(code-complete, waiting on DB)*

`app/api/email-gate/route.ts` (~120 lines):

1. Validates email (RFC-ish regex) and UUID (v4 regex).
2. Normalises the incoming partial `RunnaQuizAnswers` (defaults missing
   fields, parses `raceDate` string back to Date).
3. Computes the recommended programme via `determineProgramme`.
4. `upsert`s into `customers` keyed by email, minting an 8-char
   referral code (`A-Z2-9` minus look-alikes) from `crypto.getRandomValues`.
5. Inserts a snapshot into `quiz_responses` with the computed programme
   and entry path.
6. Inserts into `abandoned_plans` so the +1hr recovery email job can
   pick up the row if checkout never completes.
7. Returns 200 with `{ ok, persisted, programme, customerId, quizResponseId }`.
8. On any DB error, logs server-side and returns `persisted: false` — the
   client-side quiz keeps moving regardless.

**Integration tested** against `localhost:3010` with a synthetic POST.
The route handled the payload correctly but came back with
`persisted: false` because the Supabase tables don't actually exist yet —
see the migration note above.

### Part 5 — Content + SEO + functional QA ✅

- All 4 **legal pages** rewritten with real content (Privacy / Terms /
  Cookies / Refunds) — replaced `ComingSoon` stubs. UK GDPR compliant,
  Consumer Contracts Regulations 2013 Reg 37(1)(a) referenced for the
  cooling-off waiver, HMRC 7-year retention noted, ICO complaint link
  included. Reusable shared layout in
  `components/shared/legal-layout.tsx` and prose primitives in
  `components/shared/prose.tsx`.
- **`Week in your life` vignettes** updated to the Phase B2 §5.2 copy
  (Tue/Thu/Sat — Hyrox-specific / Strength block / Race simulation).
- **Testimonials** rebuilt with portraits: now 3 entries (Sarah/Bristol,
  Marcus/Manchester, Alex & Jamie/Edinburgh) with image refs and a
  testimonials.tsx component that renders portraits with a gradient overlay.
- **SEO baseline:**
  - Organization + WebSite JSON-LD in `app/layout.tsx`.
  - FAQPage JSON-LD on landing FAQ (`components/marketing/faq.tsx`).
  - `app/sitemap.ts` updated with all 12 routes + programme anchors.
  - `app/robots.ts` already correct (allow root, disallow api/account/checkout/studio).
- ESLint cleanup (was 5 errors in pre-existing hooks):
  - `usePrefersReducedMotion` → `useSyncExternalStore` rewrite.
  - `useShouldServeHeavyAssets` → `useSyncExternalStore` rewrite.
  - 3 other effect-init patterns kept but documented with justified
    `eslint-disable` (canonical sync-from-storage pattern).

### Build verification ✅

```
✓ TypeScript    : clean (0 errors)
✓ ESLint        : 0 errors, 7 warnings (all `<img>` vs `<Image />` advisory)
✓ next build    : 23 routes generated, all static where possible
```

### Smoke tests ✅

All 13 routes return 200 against `next start` on localhost:

```
200  /
200  /about
200  /contact
200  /press
200  /how-it-works
200  /programmes
200  /pricing
200  /legal/privacy
200  /legal/terms
200  /legal/cookies
200  /legal/refunds
200  /quiz
200  /quiz/experience
```

### Lighthouse — local prod (post quiz V2 rebuild)

Measured against `next start` on `localhost:3010`. These numbers are
optimistic vs real network; treat as a sanity floor, not absolute truth —
real Vercel-CDN numbers will look better, but the LCP gap is real.

| Route       | Mobile Perf | Desktop Perf | A11y | BP  | SEO |
|-------------|-------------|--------------|------|-----|-----|
| /           | **89**      | 79           | 100  | 100 | 100 |
| /pricing    | **95**      | 83           | 100  | 100 | 100 |
| /quiz       | **91**      | 80           | 100  | 100 | 100 |
| /quiz/done  | **93**      | 81           | 100  | 100 | 100 |

A11y / BP / SEO are 100 across the board. Mobile LCPs sit at 2.9–3.7s
(target <1.8s per brief §21). The `/quiz` mobile score moved from 93 → 91
after the V2 rebuild — the new flow ships more client JS (carousel
auto-advance + screen state machine) so this is expected; LCP is unchanged
(~3.5s). Top opportunity reported by Lighthouse is "Reduce unused
JavaScript" — mostly GSAP + Motion on the landing. Full reports are saved
under `.lighthouse/*.json`.

### Competitive analysis ✅

Full doc: **`docs/competitive-analysis.md`** (1,456 words, sources cited
inline).

TL;DR:
- **Runna** £15.99/mo, ~25-screen onboarding, plan **gated** until payment,
  **no Hyrox programme** (running-only, Strava-owned since 2025).
- **Marchon** £29.99/mo (Core, 3-month lock-in) or £39.99/mo (Pro). Hyrox is
  2 of 9 programmes. **No doubles**, no beginner Hyrox path, no plan-before-pay.
- **Hybrid Athlete Club** £44.99/mo (highest in market). Founder James Kelly
  is an Elite-15 athlete — direct credential parity with James Wright. Has a
  doubles programme. **No own app** — delivered via Fitr.training third-party.

Vyrek's clearest wedges:
1. Only one of the four to show a dated plan **before** payment.
2. Hyrox-first AND the full ladder (First Race / Sub-90 / Doubles / Pro) —
   no competitor covers all four.
3. Cheapest Hyrox option at £14.99/mo, simplest pricing (no Core/Pro
   decision, no lock-in).
4. £20 BACS referral is unique to Vyrek.

---

## What I didn't do (and why)

- **Did not run `vercel --yes --prod`.** Production deploys are a "shared
  state, hard to reverse" action that warrants explicit approval. Run it
  when you're awake to confirm.
- **Did not download Adobe Stock + Mixkit files from your Drive.** Drive
  needs you in front of it. Placeholders are in `public/media/`; one
  filename swap per real asset.
- **Did not apply the Supabase migration.** ⚠️ Important: `supabase/migrations/0001_init.sql`
  is the canonical schema from brief §18, but I discovered it has **never
  been applied** to your live Supabase project. The 6 tables (`customers`,
  `quiz_responses`, `subscriptions`, `referrals`, `waitlist`,
  `abandoned_plans`) do not exist yet. The original `scripts/verify-supabase.mjs`
  was reporting OK because Supabase's HEAD-only count requests return
  `{ error: null, count: null }` for missing tables instead of erroring —
  I've patched the script to do a real `SELECT id LIMIT 1` first, and it
  now correctly reports the tables as missing. **Apply 0001_init.sql via
  the Supabase SQL Editor (or `supabase db push` if you set up the CLI)
  to unblock the new `/api/email-gate` route.**
- **Did not push performance from 89 → 95 mobile on the landing.** Real fix
  is to defer GSAP SplitText (big chunk) or replace with CSS-only. Worth
  trying on awake-mode.
- **Did not delete the v1 quiz code** (`/quiz/[step]/page.tsx`,
  `/quiz/done/page.tsx`, `components/quiz/*`, `hooks/use-quiz-state.ts`).
  V2 is wired into `/quiz` directly and v1 is no longer linked, but the
  files remain so you can A/B compare and so any deep links (e.g.
  Sentry/analytics) keep resolving. Delete after a deploy + smoke check
  in production.
- **Did not write a comprehensive unit test suite.** Just the quiz-helpers
  smoke test. The codebase had no existing test harness; adding one without
  your input on framework choice would have been a guess.

---

## Files changed

New:
- `app/api/email-gate/route.ts`
- `app/about/page.tsx`
- `app/contact/page.tsx`
- `app/press/page.tsx`
- `app/how-it-works/page.tsx`
- `app/programmes/page.tsx`
- `components/shared/legal-layout.tsx`
- `components/shared/prose.tsx`
- `components/quiz-v2/quiz-flow.tsx` *(orchestrator)*
- `components/quiz-v2/quiz-shell.tsx`
- `components/quiz-v2/screen-question.tsx`
- `components/quiz-v2/welcome-carousel.tsx`
- `components/quiz-v2/interstitial-screen.tsx`
- `components/quiz-v2/single-select-screen.tsx`
- `components/quiz-v2/multi-select-screen.tsx`
- `components/quiz-v2/calendar-screen.tsx`
- `components/quiz-v2/summary-screen.tsx`
- `components/quiz-v2/email-gate-screen.tsx`
- `hooks/use-runna-quiz.ts`
- `lib/quiz-flow.ts`
- `public/media/README.md` (+ image/video placeholders copied in)
- `scripts/test-quiz-helpers.mjs`
- `docs/competitive-analysis.md`
- `docs/NIGHT-OF-2026-05-22-REPORT.md` (this file)

Modified:
- `scripts/verify-supabase.mjs` — now does a real `SELECT` so a missing
  table no longer reports as "✅ null row(s)"
- `app/legal/{privacy,terms,cookies,refunds}/page.tsx` — full real content
- `app/layout.tsx` — Organization + WebSite JSON-LD
- `app/sitemap.ts` — all new routes + programme anchors
- `app/quiz/page.tsx` — now renders the new `QuizFlow` (was the v1 intro)
- `app/quiz/[step]/page.tsx` — eslint-disable justification (legacy)
- `components/marketing/footer.tsx` — link reshuffle
- `components/marketing/week-in-life.tsx` — Phase B2 §5.2 vignette copy
- `components/marketing/testimonials.tsx` — portrait grid layout
- `components/marketing/faq.tsx` — FAQPage JSON-LD
- `components/legal/cookie-banner.tsx` — eslint-disable justification
- `hooks/use-prefers-reduced-motion.ts` — rewritten with `useSyncExternalStore`
- `hooks/use-network-information.ts` — rewritten with `useSyncExternalStore`
- `hooks/use-quiz-state.ts` — eslint-disable justification (legacy v1 hook)
- `lib/quiz-schema.ts` — added Phase B2 §3.4 helpers
- `lib/testimonials.ts` — 3 portrait-bearing testimonials per §5.3

---

## What I'd suggest you tackle next

1. **Apply the Supabase migration.** ⚠️ Open the Supabase SQL Editor for the
   `iiezxhzbissemvsfytwl` project, paste `supabase/migrations/0001_init.sql`,
   run it. Then re-run `node scripts/verify-supabase.mjs` — you should see
   6 green ticks with `0 row(s)`. Without this, the new quiz cannot
   persist emails.
2. **Walk through the new quiz on a real device.** The flow renders client-
   side after URL-param hydration — first paint shows "One moment." then
   the welcome carousel. Verify the carousel transitions, swipe, auto-
   advance feel right; tune timings in `welcome-carousel.tsx` and
   `interstitial-screen.tsx` if needed.
3. **Drop the real media in.** Replace the 12 files in `public/media/images/`
   and the hero MP4 by filename. The site (including welcome carousel +
   interstitials) is wired up.
4. **Production deploy** (`vercel --yes --prod`) and re-run Lighthouse
   against the real CDN. LCP should drop substantially.
5. **Performance pass on the landing.** Defer or replace GSAP SplitText.
   Aim for mobile perf 95+.
6. **Replace the testimonial copy with consented real names** before any
   paid acquisition (ASA rule 3.7).
7. **Stripe wire-up.** `/api/stripe/create-checkout-session` and webhook
   handlers are not started. Brief §14 + §18.
8. **Decide on v1 quiz removal.** Once V2 has been used in production for a
   few days, delete `/quiz/[step]/page.tsx`, `/quiz/done/page.tsx`,
   `components/quiz/*`, and `hooks/use-quiz-state.ts`.

---

## Process notes

- `caffeinate -d` was restarted near the end of the session (PID was killed
  accidentally during cleanup); kill it manually when you no longer need it
  (`pkill -f caffeinate`).
- All work is uncommitted. I did not create a git repo or commit — that
  remains your call.
- Background prod server killed cleanly; nothing listening on :3010 now.
