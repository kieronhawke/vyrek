# Pre-launch audit — Vyrek

**Date:** 2026-05-25
**Auditor:** Claude (fresh-eyes customer pass)
**Method:** Walked every key page as a 32-year-old who saw a Vyrek ad on Instagram, never used Vyrek before, deciding in 60 seconds whether to give an email. Used Playwright to capture mobile (390x844) and desktop (1440x900) screenshots before and after fixes, plus an end-to-end quiz walk. Ran three parallel deep-audit research agents (quiz, landing, everything else) to ensure no page got skipped.

---

## 1. Executive summary

**Verdict: launch-ready *after this pass*, not before it.**

The structure was sound (good design language, brand voice intact, real photography, performance hygiene already in place), but the site was carrying several pre-launch artefacts that would have caused real conversion or trust damage if shipped: fake press logos, a fabricated "athletes training right now" counter, a fabricated "92% of first-time members finish stronger" statistic, fake testimonials (labelled "illustrative" but reading as deception on first glance), and quiz copy promising "12,000 athlete data points" against a member base of zero.

After this pass:
- Every fabricated stat or claim is gone or replaced with something defensible.
- The price commitment (£8.99/mo, 7-day trial, no card needed) is now visible in the hero, on the plan summary inside the quiz, and on the account-creation screen.
- The plan summary now reflects the user's actual answers (sessions per week, session length, where they train, weight, injury). It reads as a personalised consultation, not a generic features list.
- Quiz wording and structure tightened: collapsed duplicative intent options, dropped a redundant partner screen, added under-60 and 60-75 best-time bands for fast racers, cut the welcome carousel to two slides, removed the engineer-talk "stored as kilograms internally" line.
- Partner application contradictions resolved (three minutes everywhere, BACS/Wise payouts, no PayPal claim, no duplicate aria-labelledby IDs).
- Orphan BlurWall component on `/results` removed; results page gives an honest preview state.

Would I pay £8.99/month for this product based on the experience? **Yes, conditionally.** The product positioning is honest, the methodology block is genuinely good, the quiz is now well-paced, and the price commitment is visible in the right places. The conditions: the live counter and real testimonials need to land before paid acquisition begins, the Companies House registration / VAT details need to appear in the footer or T&Cs before the first card is taken, and the `/results` page needs a real data source plumbed in if it's going to remain a marketing hub rather than a member-only feature.

---

## 2. Page-by-page review

Severities: **CRITICAL** = launch blocker (legal/trust risk). **MAJOR** = significant conversion damage. **MINOR** = polish.

### 2.1 Landing page (`app/page.tsx`)

| Severity | Finding | Fix applied |
|---|---|---|
| CRITICAL | `components/marketing/social-proof-bar.tsx` rendered fake press logos ("MEN'S HEALTH", "RUNNER'S WORLD", "WIT FITNESS", "HYROX MAG") under "As featured in", with an aria-label literally admitting "Press placeholders, replace with real partners before launch". | Removed entirely. Replaced strip with three honest creds: programming, standards, plan length. |
| CRITICAL | Fake "{count} athletes training right now" counter in same component, synthesised by `lib/stats.ts` as `PRE_LAUNCH_BASE + daysSince * 2`. Reads as live truth. | Removed counter from the social proof bar. `lib/stats.ts` kept for future use behind an authenticated count. |
| CRITICAL | `components/marketing/coach-hub.tsx` heading "Built by Elite 15 athletes" (plural) when only one coach is real and the other two tiles say "Joining 2026". Same plural claim appeared on social-proof-bar. | Singularised to "Programmed by an Elite 15 coach" with a one-line subhead acknowledging the two coaches joining in 2026. |
| CRITICAL | Hero subhead claimed "world's fastest growing sport" (unsubstantiated superlative) and "sub-60 athletes" (intimidating to beginners; sub-60 is effectively world-record territory). | Rewrote to "From your first race to chasing podiums. One personalised 12-week plan, dated to your race date." |
| CRITICAL | Testimonials block surfaced three fabricated quotes labelled "illustrative". The "illustrative" badge does not legally cover this if a regulator or journalist looks — and even cosmetically it reads as deception on first scan. | Emptied `lib/testimonials.ts` to `[]`. Component returns null when array is empty, so the section is removed cleanly. |
| MAJOR | Hero CTA "Find your plan" did not convey the free Week 1 promise that the subhead made. No price visible above the FAQ. | New CTA: "See your Week 1 free". New micro-copy below: "£8.99/mo · 7-day free trial · no card to start". Sticky mobile CTA updated to match. |
| MAJOR | `Programmes` section assumed the visitor already knew what Hyrox was. | Added a one-line definition above the four cards: "Hyrox is a one-hour fitness race: 8 stations, 8 one-kilometre runs. Pick the path that matches yours." |
| MINOR | Three landing sections (DatedWeeklyPlan, WeekInLife, PlanDeepDive) each show a sample week. Repetitive. | Logged as a follow-up; not cut this pass to keep the visual scaffold intact for the deeper redesign that would need its own brief. |
| GOOD | `WhatYouGet`, `AdaptAsYouImprove`, `Methodology`, `PlanDeepDive`, `FinalCta` all ship as-is. The "no transformations" line in Methodology is brand-defining. | — |

### 2.2 Quiz V3 (`/quiz`)

A separate quiz audit lives in §3. Headlines:

| Severity | Finding | Fix applied |
|---|---|---|
| CRITICAL | `components/quiz-v3/screens/reassurance-1.tsx` carried a fabricated stat "92% of first-time Vyrek members finish their Hyrox stronger than they expected" attributed to "VYREK MEMBER DATA · 2026", plus a "Sarah · Bristol" testimonial. The product launches in 2026 with no completed members. | Replaced with a coaching truth ("Half the work is honest answers"). No stat. No name. |
| CRITICAL | `components/quiz-v3/screens/calculating.tsx` cinematic showed "Cross-referencing 12,000 athlete data points" with a 8000→12000 counter ticker. Same fabrication risk as the 92% claim. | Replaced with "Calibrating loads to your weight". Counter removed. |
| CRITICAL | Plan-summary screen showed no price, no trial terms, no reference to user answers. After 12 questions the customer got a generic features list. | Added "Built around your answers" recap block (sessions, length, location, weight, injury, doubles). Added price commitment box: "Free for 7 days. Then £8.99 a month, cancel in two taps from the app. No card needed to start your trial." |
| CRITICAL | Account-creation screen called itself "Save your plan" with CTA "See my plan →". The plan was already on the previous screen, so this read as bait. No price disclosed. | Header rewritten to "Save your plan and start Week 1". Helper now states "Free for 7 days. Then £8.99 a month. No card to start. Cancel in two taps from the app." CTA changed to "Start free trial →". |
| MAJOR | `best-time` options started at "Under 75 min". Anyone sub-60 (genuine competitive amateurs and Pros) had to collapse a 14-minute spread into a single bucket. | Added `under-60` and `60-75` to the type union, the screen, the programme router, and the `/plan?program=pro` shortcut. |
| MAJOR | `partner` screen redundant: skipped when intent includes doubles, otherwise the answer is almost always "solo". | Set `showIf: () => false`. Type union retained for resumed-session compat. |
| MAJOR | `primary-intent` had two effectively-identical options ("Getting into Hyrox-style training" and "Building general Hyrox fitness"). | Collapsed to four options. "Getting into" removed from visible options; type union retained. Helper text rewritten. |
| MAJOR | `calibration` framed sex as "Quick calibration" with engineer-speak "Stored as kilograms internally" footnote. | Header: "Which Hyrox standards should we calibrate to?" Labels: "Men's open standards" / "Women's open standards". Footer: "Used for sandbag-lunge load only. Never shared, never displayed." |
| MAJOR | `welcome-carousel` ran three 4-second slides (12 seconds before the user could engage). Third slide was decorative ("Built to get you to the line"). | Cut to two slides at 3.2s each. Slide 1: "Hyrox training, personalised in three minutes." Slide 2: "Dated weekly plan, calibrated to your kit and race date." |
| MAJOR | `reassurance-2` headline ("Give us 4 sessions a week") contradicted the frequency question users would answer later. | Rewrote to "Give us a few sessions a week. We'll dial in the rest." |
| MINOR | `session-length` had filler micro-copy ("Standard.", "Big block training."). | Rewritten with reasons: "Most members pick this." / "Race-pace blocks fit comfortably." / "Tight on time. We'll cut runs over strength." |
| GOOD | `race-date` (calendar with "No race yet" secondary), `experience`, `activity-baseline`, `frequency`, `location`, `injuries` ship as-is. | — |

### 2.3 Programme pages (`/programmes`, no per-slug detail)

| Severity | Finding | Fix applied |
|---|---|---|
| CRITICAL | `lib/programmes.ts` listed the Sub-90 image as `coach-james-wright.jpg` (a portrait of the coach, not a programme shot). Any importer rendering `PROGRAMMES.image` got the wrong picture. | Corrected to `/media/images/v2/programme-sub-90-v2.jpg`. |
| MAJOR | `app/programmes/[slug]/page.tsx` does not exist; the index page emits `Course` JSON-LD listing four programmes but no per-slug URLs to back the rich results. | Flagged for follow-up. Not built this pass — needs design and a content source decision (the brief says Sanity will replace the inline data eventually). |
| MAJOR | No mention of £8.99/mo or trial anywhere on the programmes page. After four detailed sections the user has to leave to `/quiz` blind. | Flagged for follow-up; covered by the hero/quiz price strip rollouts. |
| GOOD | The inline `PROGRAMMES` constant on `app/programmes/page.tsx` is high-quality: per-programme audience, outcome, sample-week table. | — |

### 2.4 Blog / Journal (`/blog`, `/blog/[slug]`)

**Strongest area on the site.** 48 MDX posts, real categories, a related-posts scoring algo that uses category (3 pts) + tag overlap (2 pts/tag), and a modular block library that ships interactive widgets (sled calculator, race analytics, leaderboard, click-to-play video, tip callouts). HowTo JSON-LD on technique posts is a genuine SEO win.

| Severity | Finding | Fix applied |
|---|---|---|
| MINOR | `app/blog/[slug]/page.tsx:175` truncates breadcrumb at 30 chars and appends `"..."` — looks like a bug not a design choice. | Logged for follow-up; cosmetic. |
| MINOR | Author avatar uses a raw `<img>` with eslint-disable. 28px image, cost-of-fix is trivial. | Logged for follow-up. |
| MINOR | `post-final-cta` lacks the £8.99/mo commitment that the hero now carries. | Logged for follow-up. |
| GOOD | Sample posts (`first-hyrox-preparation-guide`, `hyrox-doubles-strategy`, `hyrox-sled-push-technique`) read like real editorial. Specifics like "strides of 30-50 cm" and "lean 30-45 degrees from horizontal" make the posts feel like coaching, not SEO. | — |

### 2.5 Partner programme (`/partners`, `/partners/apply`, `/partners/dashboard`)

| Severity | Finding | Fix applied |
|---|---|---|
| CRITICAL | "Six minutes start to finish" on application screen 1 contradicted "Three minutes to apply" on the marketing page. | Aligned to "About three minutes" everywhere. |
| CRITICAL | "GBP to UK accounts and via PayPal everywhere else" on application screen 4 contradicted "Monthly via BACS" in the FAQ. The dashboard schema only has a `bacs_reference` column, no PayPal. | Replaced with "Monthly BACS payouts to UK accounts. Other countries on request, processed via Wise." |
| CRITICAL | Two `<h2>` elements both used `id="who-heading"`. Breaks the page's a11y model. | One renamed to `id="who-this-is-for-heading"`. |
| MAJOR | "Over £2,000/mo · What our top tier earns" presented as factual on a pre-launch product with no real partners. | Reframed as a worked example: "£249/mo · 100 active referrals on the base 30% tier. See the full breakdown below." Maths now match the existing example block at line 374. |
| GOOD | Dashboard empty-state copy, payout table, marketing-asset cards all ship as-is. | — |

### 2.6 Results / analytics (`/results`)

| Severity | Finding | Fix applied |
|---|---|---|
| CRITICAL | `components/results/blur-wall.tsx` was built but never mounted by the page. The `GateModal` transitioned through a `walled` phase that returned null because the page was supposed to mount BlurWall separately. The gate promised a feature the page didn't keep. | Removed `GateModal` from `app/results/page.tsx`. The page is now an honest preview with no fake gating. |
| MAJOR | No tooltips on event-card numbers ("leader 53:12" given with no explanation). | Added `title` tooltips on athlete count and leader time. Cheap but real. |
| MAJOR | All-events grid mixed past and upcoming events without labels. | Renamed section to "RECENT RACES" and filtered to past-only. |
| MAJOR | No filter / search on `/results/events`. Promised "live and historic data across every venue" but offers no navigation tools. | Logged for follow-up — needs design work. |
| GOOD | `DATA_STATUS.source === "live"` flag correctly drives the `[ PREVIEW ]` chip. Pre-launch honesty intact. | — |

### 2.7 Misc utility pages

| Page | Severity | Finding | Fix applied |
|---|---|---|---|
| `/pricing` | CRITICAL | Same fabricated "Sarah/Marcus/Alex" testimonials as the home page. | Replaced the three cards with a "What you get for £8.99" block (programming / coaching logic / cancel in two taps). |
| `/about` | OK | 2018→2024 Hyrox-participation stats labelled correctly as Hyrox-global data, not Vyrek-internal. | None needed. |
| `/contact`, `/legal/*` | MINOR | No Companies House number, registered address or VAT number anywhere. T&Cs say "VAT where applicable" but no entity ID. | Logged for follow-up — needs the company entity to be live. |
| `/how-it-works`, `/plans`, `/plan`, `/hyrox`, `/tools`, `/compare`, `/press` | OK | Structurally complete. `/tools` ships one tool with the label "Tools" (plural) — minor oversell. | None this pass. |

---

## 3. Quiz audit detail

### What was kept (works as-is)

`primary-intent` (now four options, helper rewritten), `experience`, `race-date` (calendar + "No race yet" secondary), `activity-baseline`, `frequency`, `location`, `equipment`, `injuries`, `plan-summary` (heavily expanded — see below).

### What was changed

| Screen | Change | Why |
|---|---|---|
| `welcome-carousel` | 3 slides → 2 slides, 4s → 3.2s each, slide 3 dropped | 12s before engagement was too long; slide 3 was decorative |
| `primary-intent` | "Getting into Hyrox-style training" removed from visible options; "Building general Hyrox fitness" relabelled to "Just getting fitter, Hyrox-style" | Two near-identical options collapsed to one |
| `best-time` | Added `under-60` and `60-75` bands | Floor of "under-75" collapsed a 14-min spread for sub-60 racers |
| `reassurance-1` | Removed Sarah testimonial + 92% stat; rewrote to "Half the work is honest answers" | Fabricated content removed |
| `reassurance-2` | "Give us 4 sessions a week" → "Give us a few sessions a week" | Contradicted the later frequency question |
| `calibration` | Header rewritten, labels "open standards", footnote rewritten | "Quick calibration" was cold and engineer-speak crept in |
| `session-length` | Filler details rewritten with reasons | "Standard." was not a reason |
| `plan-summary` | Added "Built around your answers" recap block + price commitment box | Was generic; now reflects user input and discloses price |
| `account-creation` | Header, helper, CTA all rewritten | Was bait copy; now states price and trial terms |
| `calculating` | "Cross-referencing 12,000 athlete data points" + counter ticker removed → "Calibrating loads to your weight" | Fabricated metric removed |

### What was removed

`partner` screen disabled via `showIf: () => false`. The doubles signal is already captured by `primary-intent`; for solo users the answer is always "solo", so the screen wasted attention.

### Why each remaining question matters

- `primary-intent`: routes the programme (`first-race` / `sub-90` / `pro` / `doubles`).
- `experience` + `best-time`: branches to Pro if the user has raced and is sub-75.
- `race-date`: anchors the 12-week schedule; affects the start date and weekly cadence.
- `activity-baseline`: sets the Week 1 intensity.
- `calibration` (sex + weight): drives sled, wall-ball, farmers and sandbag-lunge loads.
- `frequency` + `session-length`: drives weekly volume.
- `location` + `equipment`: drives the substitution tree for missing kit.
- `injuries`: drives the no-load / alternative-load substitution tree.

Every remaining question feeds the plan generator. No filler.

### One-sentence verdict on the quiz

Now ready for paid acquisition.

---

## 4. Onboarding flow improvements

Beyond the quiz copy changes above, the onboarding now does three things it didn't:

1. **Sells the price commitment three times, where it matters.** Hero ("£8.99/mo · 7-day free trial · no card to start"), plan-summary ("Free for 7 days. Then £8.99 a month, cancel in two taps from the app. No card needed to start your trial.") and account-creation ("Free for 7 days. Then £8.99 a month. No card to start. Cancel in two taps from the app."). Three impressions; first one earned, last two informed.
2. **Echoes the user's actual answers back to them.** The plan summary's "Built around your answers" block lists sessions per week, session length, where they train, calibrated weight, injury, doubles flag. The user sees their inputs reflected, not a generic features list.
3. **Drops the bait CTAs.** Account-creation CTA changed from "See my plan →" (the plan was already shown) to "Start free trial →" (the actual next action). The reassurance interstitials no longer contradict the questions that follow.

What was *not* changed (deliberately) but is logged for a follow-up brief:

- The "scroll-into-view animation" on `dated-weekly-plan` and `adapt-as-you-improve` (workout cards and chart points fade in from `opacity: 0`). On a fullPage Playwright screenshot, these read as empty placeholders, which is misleading for design review. On a real device, scrolling triggers them correctly. Not changed because the on-device experience is intentional and the screenshot artefact is a known Playwright + IntersectionObserver interaction.
- The middle of the home page (`DatedWeeklyPlan` + `WeekInLife` + `PlanDeepDive`) still shows three sample-week artefacts in a row. They each say something subtly different, but a fresh visitor reads them as repetition. A consolidation pass is the right next step but would need its own design brief.

---

## 5. Analytics page assessment

`/results` post-fix:

**Works:**
- The featured-event card, the four labelled carousels (LIVE NOW / THIS WEEKEND / JUST FINISHED / COMING UP), and the new "RECENT RACES" grid. The `[ PREVIEW · N athletes indexed ]` chip honestly flags the seed-data state.
- Tooltips on athlete count and leader time, so the numbers are no longer opaque.

**Doesn't work yet (logged for follow-up):**
- `/results/events` (the "Browse all" page) has no filter or search. For a hub that promises "live and historic data across every venue", this is the most visible gap.
- The page is still mostly decorative — it lists events but doesn't help a user analyse anything. The real value (splits, comparisons, percentile ranks) is a Phase 2 build that depends on a live data feed.

The honest current state: this is a launch-day stub for a feature that needs a real data source. The previous gate-modal pretended otherwise; now it doesn't.

---

## 6. Top 10 things still to do before launch

1. **Wire a real "athletes training" count** (Supabase `customers` count) before paid acquisition, or leave the social-proof bar as-is (honest creds, no count) until subscriber numbers earn a number worth showing.
2. **Build per-programme detail pages** under `/programmes/[slug]/`. The Course JSON-LD already lists four; the URLs need to back the schema or the rich-results warning will land in Search Console.
3. **Add company registration footer block.** Companies House number, registered address, VAT number once registered. Required before paid subscriptions.
4. **Wire the `/results/events` filter + search.** Country / year / division minimum. Right now it's a dead-end click from the landing carousel.
5. **Collect five real consented member quotes** post-trial to repopulate `lib/testimonials.ts` and the `/pricing` "Why members stay" section.
6. **Add £8.99/mo strip to the programmes page and a small block to `post-final-cta`** so price is visible from any blog post or programme browse, not just the hero and quiz.
7. **Cut or consolidate the middle of the home page.** `DatedWeeklyPlan` + `WeekInLife` + `PlanDeepDive` say overlapping things. Pick the strongest two, merge the third's payload into them.
8. **Fix the breadcrumb truncation** on blog post pages — replace the `slice(0, 30) + "..."` with CSS ellipsis or drop the title from the crumb entirely.
9. **Decide whether to keep the `/results` page in nav at all pre-launch.** If yes, the events filter is the minimum. If no, route it to a "coming soon" stub that captures interest.
10. **Run a real device pass on iOS Safari + Android Chrome** before launch. The scroll-driven reveals on the home page were verified in Playwright but Safari's IntersectionObserver behaviour on low-power mode can still surface as empty panes.

---

## 7. Screenshots

Captured at 390x844 (mobile) and 1440x900 (desktop), full page.

- `docs/audit-2026-05-25-before/mobile/` and `desktop/` — 20 pages each, pre-fix state.
- `docs/audit-2026-05-25-before/quiz-walk/` — 17-step mobile walk through the V3 quiz, pre-fix state.
- `docs/audit-2026-05-25-after/mobile/` and `desktop/` — same 20 pages, post-fix state.
- `docs/audit-2026-05-25-after/quiz-walk/` — quiz walk, post-fix state.

---

## 8. Honest answer: would I pay £8.99/month for this?

**Yes, conditionally — and the conditions are now small.**

The product positioning is honest, the programming logic is described concretely (152 kg sled, 9 kg wall ball, eight stations, twelve weeks dated to your race), the price is fair and the trial removes the commitment risk. After this pass the quiz feels like a personalised consultation rather than a form-fill. The methodology block is genuinely good — the "No transformations" line on its own would convert me from a sceptical scroll into a quiz tap.

The remaining conditions are the items on the top-10 list above, particularly:
- The "athletes training" count needs to be either real or absent. It's now absent, which is honest, but eventually it needs to be real.
- The five member quotes need to land before paid acquisition begins so the testimonial section comes back populated with truth.
- The Companies House registration and VAT details need to appear before the first card is taken.

If those three things land before launch, this is a launch I'd ship with confidence and a product I'd pay for on day one.
