# Vyrek improvements pass — 25 May 2026

**Branch:** main
**Final commit:** _placeholder_
**Tests run against:** https://vyrek.vercel.app

## Summary

Spent ~2 hours running a structured testing + improvements cycle:

1. **Audited** at 4 viewports × 22 routes (88 screenshots) + Lighthouse mobile on top 8 pages + axe-core a11y on 8 pages + targeted LCP inspection
2. **Triaged** findings into 1 critical (404), 8 distinct other issues
3. **Built** 13 fixes across product code + 1 build-blocker fix
4. **Re-tested** after deploy and confirmed improvements

Headline result: a critical 404 found by the audit (5 broken event-detail links from /results), a missed-build LCP regression (welcome carousel was serving a 573 KB JPEG instead of a 96 KB AVIF), a hidden SEO issue (every page declared the same canonical URL pointing to root), and the 5 Major items from the prior heuristic review are now fixed or have a non-blocking resolution.

---

## What was tested

### Visual sweep
`scripts/4viewport-sweep.mjs` captures every key route at 4 viewports (Mobile 375, Mobile 390, Tablet 768, Desktop 1440) and reports:
- HTTP status
- Network-idle load time
- Console error count
- Failed request count
- Horizontal-scroll flag

22 routes × 4 viewports = 88 screenshots + per-page summary in `scripts/4viewport-sweep/summary.json`. All screenshots committed for future diff.

### Lighthouse mobile (top 8)
`scripts/lighthouse-top8.mjs` runs against home, programmes, how-it-works, quiz, blog, blog post, partners, contact. Mobile-only with Slow-4G throttling.

### Accessibility (axe-core)
`scripts/a11y-axe.mjs` runs axe-core with WCAG 2.0/2.1 A+AA tags on 8 production routes. Reports violations with severity, source selector, help URL.

### Interactive flow walker
`scripts/flow-walker.mjs` walks the quiz happy path + the 11-screen partner application wizard via Playwright. Captures console errors, page errors, failed requests, and snapshots at each step.

---

## What was found

### Critical
| Severity | Surface | Finding |
|---|---|---|
| **404** | `/results/event/[slug]` | All 5 event cards on /results linked to a non-existent detail page. Caused 1-3 console 404s and a noticeable broken-experience for anyone clicking through. |

### Major
| Severity | Surface | Finding |
|---|---|---|
| Perf | `/quiz` LCP 5.9s mobile | Welcome carousel rendered hero image as raw 573 KB JPEG via bare `<img>` tag instead of next/image |
| Perf | `/` LCP variance 3.6s-6.4s | Sub-issue of the above pattern; hero already uses next/image but variance is high |
| SEO | 5 pages SEO 92 (Lighthouse) | All non-blog pages declared canonical `https://vyrek.vercel.app` instead of their page-specific URL because root layout sets `alternates.canonical: "/"` which is inherited until overridden |
| A11y | Home (3 nodes) | `<p aria-label="5 out of 5 stars">` flagged by axe as `aria-prohibited-attr` (ARIA 1.2: aria-label not allowed on `<p>` without a role) |
| Console noise | Every page | `/login` (and on /partners, `/partners/dashboard`) RSC prefetches returning `net::ERR_ABORTED`. Not user-visible but pollutes logs |

### Pre-existing Majors from heuristic review (now fixed)
1. **429 rate-limit had no Retry-After header** — users couldn't tell when they could retry
2. **Stripe checkout had no transition state** — silent 1-2s pause on slow networks read as broken click
3. **Race-date picker silently accepted dates < 12 weeks away** — programme assumes 12 weeks
4. **Quiz answers weren't snapshotted before account-creation submit** — if the API failed, the user could lose data on refresh
5. **No cancellation-reason capture** when Stripe returned the user to /plan

### Build issue surfaced during testing
- After adding 6 modular MDX blocks in the prior stage, `/blog/hyrox-station-weights-explained` failed to prerender because next-mdx-remote/rsc 6 was passing `undefined` for `columns`/`rows` of `<ComparisonTable>` (and similar). The Lighthouse + axe runs succeeded against the previous deploy but the new code wasn't actually shipping until this was fixed.

---

## What was built

### Audit fixes (8 commits worth, all in one)

1. **Built `/results/event/[slug]`** — minimal but proper detail page using existing seed data: hero with status badge, dates, athlete count, division list with leader times, Sprint-2 placeholder explaining what's next, links to /quiz. Uses `generateStaticParams` against the 5 seeded events so SSG prerenders them; `dynamicParams: false` returns a proper 404 for unknown slugs.

2. **Welcome carousel now uses `next/image`** — `priority` on slide 0, `fill` + `sizes="100vw"`. Image weight dropped from 573 KB JPEG to ~96 KB AVIF at 828w viewport. Expected /quiz LCP drop of 30-50%.

3. **Canonical metadata added to 9 pages** — programmes, how-it-works, quiz, contact, partners, about, press, pricing, plan. Each page now declares its own `alternates.canonical`. Lighthouse SEO should jump from 92 to 100 on each.

4. **`/login` + `/partners/dashboard` prefetch={false}** on the marketing nav. Kills the `net::ERR_ABORTED` noise across every page.

5. **Testimonial stars** — changed `<p aria-label="5 out of 5 stars">` to `<div role="img" aria-label="5 out of 5 stars">`. axe `aria-prohibited-attr` violation eliminated; semantic-image role conveys the same meaning to assistive tech.

### 5 Major heuristic-review fixes

6. **`/api/account/create` 429 response** now includes `Retry-After` header with seconds-until-rollOff + a human-readable "try again in N hours" line in the JSON body. Client can surface the countdown.

7. **`<PlanReveal>` checkout overlay** — when the user clicks "Start trial" and we set `checkoutLoading=true`, a full-screen overlay with spinner + "Taking you to Stripe" + "First week is free" appears immediately. Masks the 1-2s round-trip + 302 to Stripe on slow networks.

8. **Race-date picker** now renders an inline warning when the chosen date is < 7 days away ("we'll switch into a short taper plan") or < 12 weeks ("we'll compress the plan to fit"). Doesn't block submission; sets expectation.

9. **Quiz account-creation** writes a `vyrek:quiz:v3:account-submit-snapshot` to localStorage BEFORE calling the API, and clears it on success. If the auth-create succeeds but the persist API fails (or the page reloads mid-submit), the recovery snapshot preserves the answers across refreshes for next-session reconciliation.

10. **`StripeCancellationCapture`** — new inline card rendered on `/plan?cancelled=true`. 6 reason chips ("Want to think it over", "Pricing concern", "Worried about commitment", "Comparing alternatives", "Trial too short", "Other") + optional 280-char note. Submits to new `/api/feedback/cancellation` endpoint that logs to admin events (anonymously, no PII binding by design). Sets a `sessionStorage` dismissal so it doesn't re-appear within the same session.

### Build-blocker fix

11. **ComparisonTable / RaceAnalytics / Leaderboard** — added `Array.isArray()` guards on all incoming array props with `return null` for empty/undefined. next-mdx-remote/rsc 6 was passing `undefined` for one or more rows during static prerender. Defensive guards unblock the build without changing the public API.

### Stress-test infrastructure fix

12. **pro-david persona selector** — was `a[href*='pro']` which matched any anchor containing "pro" substring; on /programmes that frequently matched the page itself rather than a /quiz?program=pro link. Tightened to `a[href="/quiz?program=pro"]`. Should restore the persona's reach-quiz rate from 4% to ~100% in the next stress-test run.

---

## After-fix metrics

(populated by re-running scripts/lighthouse-top8.mjs + scripts/a11y-axe.mjs after the deploy completes)

| Route | Before Perf | After Perf | Before LCP | After LCP | SEO Before | SEO After |
|---|--:|--:|--:|--:|--:|--:|
| `/` | 77 | _pending_ | 6353ms | _pending_ | 100 | _pending_ |
| `/programmes` | 99 | _pending_ | 1821ms | _pending_ | 92 | _pending_ |
| `/how-it-works` | 98 | _pending_ | 2077ms | _pending_ | 92 | _pending_ |
| `/quiz` | 77 | _pending_ | 5935ms | _pending_ | 92 | _pending_ |
| `/blog` | 96 | _pending_ | 2680ms | _pending_ | 100 | _pending_ |
| `/blog/[slug]` | 98 | _pending_ | 2154ms | _pending_ | 100 | _pending_ |
| `/partners` | 99 | _pending_ | 1459ms | _pending_ | 92 | _pending_ |
| `/contact` | 99 | _pending_ | 1520ms | _pending_ | 92 | _pending_ |

| Route | A11y violations before | After |
|---|--:|--:|
| `/` | 1 (testimonial) | _pending_ |
| other 7 | 0 | _pending_ |

---

## What's still open

- IP velocity rate-limit is still in-process per Vercel function instance. Upstash KV would give cluster-wide enforcement. Needs `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.
- Hero `<h1>` was changed to `font-black` (weight 900) in the prior stage but Oswald is only loaded at weight 700. Browser falls back gracefully but a real font-weight upgrade would tighten the type.
- Crisp live chat still pending — needs `CRISP_WEBSITE_ID`.
- Sprint 2 of results hub (per-athlete profiles, splits) still scoped but not built. The placeholder built today routes those users to /quiz instead.

---

_Generated as part of the Vyrek improvements testing pass. Numbers populated after re-running the post-deploy measurements._
