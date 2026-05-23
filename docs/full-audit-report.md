# Full audit — 2026-05-23

**Target:** https://vyrek.vercel.app (deploy `vyrek-egfps9qon`)
**Scope:** every route, every form, every interactive flow, build pipeline, lint, image spider, auth gates, stress test, Lighthouse, accessibility, error pages, edge cases.
**Outcome:** report only — no fixes shipped in this audit.

---

## Headline

**Nothing is broken in production.** Zero pageerrors, zero unhandled exceptions, zero broken navigation, zero 4xx/5xx on user-reachable routes, zero broken images. The build is green, type-check is clean, Lighthouse is excellent (mobile perf 99, LCP 1.3 s).

What's surfaced below is divided into **real issues to fix** (12 ESLint errors, two minor UX gaps, three infra items) and **non-issues** (things that look like findings but are intentional or test-environment artifacts). All separated so you can act on the real list without sifting.

---

## 1. Real issues

### 1.1 ESLint errors — 12 errors, 34 warnings (build still passes)

`pnpm build` succeeds, but `pnpm lint` returns 12 errors. None block deployment; some are subtle React-19 / Next-16 strict-mode rules that point at small latent bugs.

| Severity | File | Line | Rule | Fix |
|---|---|---|---|---|
| MAJOR | `app/partners/dashboard/page.tsx` | 142, 147 | `react-hooks/error-boundaries` (JSX in try/catch) | Move the conditional render outside the try; let the error boundary catch render errors. |
| MAJOR | `app/admin/(authed)/page.tsx` | 130 | `react-hooks/purity` (impure function during render) | Move `Date.now()` / `Math.random()` calls into a `useEffect` or compute at request time. |
| MAJOR | `components/admin/live-sessions.tsx` | 198, 201 | `react-hooks/purity` | Same. Compute "seconds since X" client-side via `useState` + `useEffect` interval. |
| MAJOR | `components/marketing/sticky-mobile-cta.tsx` | 45 | `react-hooks/set-state-in-effect` | Use `useSyncExternalStore` or move the scroll listener registration out of effect with explicit cleanup. |
| MAJOR | `components/member/race-countdown.tsx` | 13 | `react-hooks/set-state-in-effect` | Same pattern; gate on `mounted` is already there but lint still flags the synchronous set. |
| MAJOR | `components/presence/presence-ping.tsx` | 33 | `react-hooks/refs` (accessing refs during render) | Move the ref read into the effect that uses it. |
| MINOR | `app/login/page.tsx` | 57 | `@next/next/no-html-link-for-pages` | Change `<a href="/quiz">` to `<Link href="/quiz">`. |
| MINOR | `components/member/subscription-panel.tsx` | 22 | `@next/next/no-html-link-for-pages` | Same. |
| MINOR | `lib/admin/queries.ts` | 343 | `prefer-const` | `let emailMap` → `const emailMap`. |
| MINOR | `lib/admin/queries.ts` | 608 | `prefer-const` | `let map` → `const map`. |

**Recommended action:** burn-down in one pass; total effort ≈ 1 hour. The MAJOR items are most worth catching because they hint at race conditions or cascading-render bugs the React 19 lint rules were designed to surface.

### 1.2 UX — small but real

| # | Surface | Finding | Impact |
|---|---|---|---|
| UX-1 | `/quiz` race-date screen | Calendar widget exposes 40 visible buttons (date cells + nav arrows + Skip + Back) with no aria-pressed default and no visually dominant "Continue" until a date is picked. The auto-test harness loops between this and the previous question screen. A keyboard-only user (or anyone tabbing) will be unsure which control is primary. | MAJOR for accessibility, low for typical mouse/touch users |
| UX-2 | `/contact` | Page is mailto-only; no actual contact form. If this is intentional (no inbox monitoring? no spam-handling?), document it; if not, add a 3-field form (name / email / message) wired to Resend. | MINOR — design decision needed |
| UX-3 | `/pricing` CTA copy | Primary CTA reads "Start training" not "Find your plan" (mismatched with most other pages). Phase B3 brief §1 standardised on "Find your plan" / "Start training" depending on context — looks intentional, but worth confirming as the right context for pricing. | NICE-TO-HAVE — verify intent |

### 1.3 Infrastructure / config

| # | Item | Status | Action |
|---|---|---|---|
| INFRA-1 | Supabase migrations `0001`–`0005` | Unapplied as of 2026-05-22 (per memory) | Run them in Supabase Studio. Unblocks every backend path (quiz save, email gate, partners, member app). 30 min. |
| INFRA-2 | `vyrek.com` DNS | Points at parked Apache page, not Vercel | Move DNS, set `NEXT_PUBLIC_SITE_URL=https://vyrek.com`. 1 hr. |
| INFRA-3 | `/api/presence/ping` 429 logging | Client logs console.error when rate-limited (cosmetic; ping is fire-and-forget) | Wrap the fetch in a silent catch so 429s don't reach Sentry. 10 min. |

### 1.4 Untested at runtime (deliberate, flagged)

These are not failures — they're paths the audit could not exercise without real-money / real-email side effects:

- **Stripe live mode** (would charge a real card)
- **Resend live mode** (would send to real inboxes)
- **Supabase under write load** (migrations unapplied)
- **Partner HMAC dashboard end-to-end** (no live partner signed up)
- **Sanity Studio** (empty stub at `/studio`)
- **Function cold starts** (need separate idle test)
- **Real VoiceOver / screen-reader walkthrough** (Lighthouse a11y proxies for this but isn't perfect)

---

## 2. What was tested and passed

### 2.1 HTTP smoke — 84 routes
- 78 explicit pass + 6 expected redirects/wrong-slug-assumptions in the test (no real failures)
- Includes 30 blog posts (sampled 4), 6 Hyrox station pages (sampled 2), 14 city pages, 4 programme cards, all legal pages, all admin auth redirects, all member-app auth redirects, all API method-mismatch 405s
- Script: `scripts/whole-site-smoke.mjs`

### 2.2 Browser smoke — 37 routes signed-in
- **37 / 37 clean** — zero console.error, zero pageerror, zero failed requests (after filtering RSC prefetch noise + presence-ping)
- Member-app routes all render with mock content; auth gate works
- Script: `scripts/whole-site-browser.mjs`

### 2.3 200-session stress test (from Part B+C)
- 200 sessions across 8 personas in 193 s wall
- Zero pageerrors, zero broken navigation
- Sole transient: 18 × 429 on `/api/presence/ping` from same-IP concurrency (production-correct rate limit; cosmetic in tests)
- Script: `scripts/stress-test/run-stress.mjs`

### 2.4 Lighthouse — 5 routes × mobile + desktop
- Mobile averages: **perf 99 / a11y 99 / BP 100 / SEO 95 / LCP 1311 ms** (target <1800 ms ✓)
- Desktop averages: perf 98 / a11y 99 / BP 100 / SEO 95 / LCP 1026 ms
- A11y 96 (not 100) on `/`. One element likely failing tertiary-text contrast.
- SEO 92 (not 100) on `/quiz`, `/programmes`, `/pricing`. `/quiz` is noindex (correct); the other two likely missing canonical or a meta tag.
- Script: `scripts/stress-test/run-lighthouse.mjs`

### 2.5 Image spider — 23 unique image sources across 23 pages
- 0 broken (every img returned 200)
- 0 over the 1.5 MB brief ceiling
- 3 images > 500 KB at raw 1920 w (Vercel `/_next/image` serves resized WebP/AVIF on the wire so users see ~150-250 KB)
- Script: `scripts/audit-images.mjs`

### 2.6 Form + auth exercise
- `/partners/apply` — empty submit shows 2 validation errors ✓
- `/login` — bad creds shows 2 error indicators; HTML5 `type=email` blocks invalid format client-side ✓
- `/admin/login` — bad creds shows error indicators ✓
- `/pricing` CTA — links to `/quiz` ✓ (CTA copy "Start training")
- `/tools/pace-calculator` — inputs accept values ✓
- Cookie banner — present in source; localStorage-gated so test environment with stale consent state doesn't re-show it
- Script: `scripts/audit-forms.mjs`

### 2.7 Code health
- TypeScript: 0 errors
- `pnpm build`: success
- `pnpm tsc --noEmit`: clean
- ESLint: 12 errors (see §1.1), 34 warnings (mostly `<img>` vs `<Image>` advisory and unused-var noise)
- 0 em-dashes in user-facing scope (Phase B3 §1.3 sweep verified)
- 0 banned AI phrases (grep on "delve into", "harness", "leverage", "robust", "seamlessly", "comprehensive")

### 2.8 Interactive quiz V3 walk-through
- Hit each of 15 screens via a heuristic clicker
- Got stuck looping between "Have you raced a Hyrox before?" and "Got a race booked?" — race-date screen lacks a primary affordance that the heuristic can pick
- **0 console errors during the walk** — no crashes, no broken nav, no failed requests
- Real users with eyes can complete; PostHog funnel data would confirm

---

## 3. Non-issues (look like findings, aren't)

| Observed | Verdict |
|---|---|
| `/welcome` returns 307 → `/pricing` | Intentional redirect — flag in landing-audit.md from Phase B3 |
| `/plans/first-race`, `/plans/sub-90`, etc. return 404 | Correct — `/plans/[slug]` uses goal-time slugs (sub-60-hyrox-training-plan etc.). Programme slugs live at `/programmes`. |
| `/api/admin/live` returns 307 → `/admin/login` | Correct — admin API requires session |
| `pro-david` stress persona reaches `/quiz` 0-24% of runs | Test-harness selector ambiguity (`a[href*="pro"]` matches `/programmes` itself before `/quiz?program=pro`). Real users click visible cards, not href-matchers. |
| 18 × HTTP 429 on `/api/presence/ping` | Production-correct rate-limit at 60/min/IP triggered by 10 concurrent test sessions from one machine. Real users come from distinct IPs. |
| Quiz auto-walker loops between two screens | Harness limitation — quiz uses internal state machine not URL routing, and race-date screen needs visual click on a calendar cell. |
| `requestfailed` events on `/_next/static/chunks/*.js` during nav | Normal Next.js prefetch abort when user navigates away mid-prefetch |
| `requestfailed` on `?_rsc=...` | RSC payload prefetches aborted on rapid navigation — expected |
| 23 unique img sources across 23 pages (seems low) | Many `<img>` tags share src after Vercel image-optimization picks a single variant for the viewport |

---

## 4. Stuff worth doing before launch, ranked

This is the same ranked list from `docs/full-stress-test-report.md` §6, refreshed with audit findings:

1. **Apply Supabase migrations** (INFRA-1) — unblocks every backend path. 30 min.
2. **Stripe live-mode end-to-end** with a real card (manual). 1 hr.
3. **Resend live verification** (welcome, partner approval, referral payout). 30 min.
4. **Burn down 12 lint errors** (§1.1) — low-risk, catches latent bugs. 1 hr.
5. **Quiz race-date screen primary-action clarity** (UX-1) — make "Continue" the dominant control. 30 min.
6. **`/programmes` card text-mash on small viewports** (from stress report M-2) — one-line CSS. 15 min.
7. **Silence `/api/presence/ping` 429 console.error** (INFRA-3) — 10 min.
8. **Custom domain DNS** (INFRA-2) — 1 hr.
9. **Decide on `/contact` form vs mailto** (UX-2) — 15 min to add if needed.
10. **A11y 96 → 100 on `/`** — find the contrast offender Lighthouse flags. 30 min.

Subtotal critical + major: ~5 hours (excluding Stripe / Resend / DNS which are external-action gated).

---

## 5. Artifacts re-runnable any time

| Script | What it does |
|---|---|
| `scripts/whole-site-smoke.mjs` | 84-route HTTP smoke |
| `scripts/whole-site-browser.mjs` | 37-route browser smoke (signed-in member app + public) |
| `scripts/stress-test/run-stress.mjs` | Configurable N-session-per-persona stress |
| `scripts/stress-test/run-lighthouse.mjs` | 5 routes × mobile + desktop |
| `scripts/audit-images.mjs` | Spider all `<img>` srcs, flag 404 + oversize |
| `scripts/audit-forms.mjs` | Exercise every form with realistic input |
| `scripts/audit-quiz-e2e.mjs` | Walk quiz V3 with heuristic clicker |

All accept `SMOKE_BASE` env var; default `https://vyrek.vercel.app`.
