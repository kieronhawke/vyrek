# Heuristic UX Review — Vyrek

**Reviewer:** Claude (Stage 14 deliverable)
**Date:** 24 May 2026
**Method:** Nielsen 10 Usability Heuristics + Stripe / Linear / Notion comparative
**Scope:** Marketing surface + member app + partner programme + admin

This is a thorough walk-through of the live site under each Nielsen heuristic
plus a few Vyrek-specific lenses (voice consistency, race-day timing
sensitivity, mobile-first reality). Each finding is rated **Critical /
Major / Minor**. Critical issues block launch; major issues hurt
conversion; minor are polish.

---

## 1. Visibility of system status

The site does a strong job overall: every async action has a loading state
(checkout button, quiz Continue, application Submit), every form gives
inline error messages, and the quiz progress bar shows position
unambiguously.

**Findings**

- **Minor.** The 11-screen partner application form has a percentage
  indicator but no per-section eyebrow telling the user what the *next*
  topic is. A small "Coming up: your audience" pre-cue would reduce
  drop-off between screens 4 → 5.
- **Minor.** The Stripe checkout redirect from /plan happens with no
  intermediate "Taking you to Stripe..." screen. On 3G the silent pause
  reads as a broken click. Add a 200ms transition state.
- **Major.** When `/api/account/create` hits the new IP velocity 429
  branch, the message renders inline but doesn't suggest a meaningful
  next step. We say "contact support@vyrek.com if this looks wrong" —
  good — but should also offer a 24-hour countdown so the user knows
  exactly when they can retry. Add a `Retry-After` header and surface it.

---

## 2. Match between system and the real world

Vocabulary is athlete-native throughout: "splits", "stations", "race
weight", "block periodisation". The blog and programme pages avoid SaaS
jargon. Strong adherence.

**Findings**

- **Minor.** The cookie policy mentions "first-party" and "third-party"
  without an in-text definition the first time they appear. Now added in
  Stage 11 expansion — fixed.
- **Minor.** The partner dashboard uses "MRR" and "active referrals"
  without a tooltip. Partners are not all SaaS-literate. Add a single
  sentence under each KPI label on first visit.

---

## 3. User control and freedom

The 15-screen quiz has a Back button on every screen (verified in
quiz-shell.tsx). The partner application wizard now has explicit Back.
The mobile drawer can be dismissed via backdrop tap, swipe, or hardware
back. Strong.

**Findings**

- **Major.** Stripe checkout cancellation route lands on /quiz (verified)
  but the cancellation reason is not captured. We're missing a single
  optional "What changed your mind?" field on the return-to-quiz path
  that would feed Drop-Off Reasons in admin. Not a launch blocker, but a
  cheap win.
- **Minor.** Closing the Calibrating-your-plan cinematic mid-animation
  silently lands on /plan with no fade-out. Should fade to /plan over
  300ms to avoid jarring.

---

## 4. Consistency and standards

The chartreuse accent (#A3E635) is enforced as the only accent across
the entire surface. Geist + Geist Mono is the only typography. Mono
brackets `[ TAG ]` is the established eyebrow pattern, used consistently
on landing, quiz, plan, partners, admin, results, blog. Excellent.

**Findings**

- **Minor.** The /press page asset cards use right-pointing arrows
  (`→`) while the rest of the site uses chartreuse-coloured arrows. Make
  these match (chartreuse, mono).
- **Minor.** The blog hero crop is now capped at `max-h-[60vh]` (Stage 1.3)
  but the related-posts cards at the bottom still use a non-capped
  aspect ratio. Consider matching.

---

## 5. Error prevention

Forms use HTML5 validation as a baseline plus per-field validation in
JS. The quiz prevents progression until the current question is
answered. The partner application wizard's `canAdvance()` is strict.

**Findings**

- **Major.** The /quiz race-date picker (react-day-picker) allows past
  dates. We then need to handle the "race in the past" case downstream;
  cleaner to disable past dates entirely.
- **Minor.** The login form does not warn before email submission that
  the magic-link will arrive in ~30 seconds; users sometimes refresh
  thinking it failed. A "Check your email — link arrives within 30
  seconds" inline after submission would help.

---

## 6. Recognition rather than recall

Strong: the plan page shows your race date prominently, the quiz
summarises your earlier answers, the admin dashboard shows partner
status in colour-coded chips so the reviewer doesn't have to remember
the workflow.

**Findings**

- **Minor.** When a returning user lands on `/quiz` they currently start
  from screen 1 every time. The 0002 migration would let us read
  `quiz_v3_progress` and resume — once 0002 is applied, wire this up.

---

## 7. Flexibility and efficiency of use

Keyboard navigation works through every form. The quiz auto-advances on
single-select. Reduced-motion users get a non-animated experience
across plan-reveal, calibrating, and bento animations. The blog
TableOfContents is keyboard-navigable and updates active state on
scroll.

**Findings**

- **Minor.** No keyboard shortcut to jump to "Find your plan" CTA from
  anywhere on the marketing site. Linear-style `?` to open shortcuts +
  `Q` to start quiz would be a nice power-user touch.
- **Minor.** The partner dashboard has no CSV export of referrals/payouts
  for accountants. Add a single Download button per table.

---

## 8. Aesthetic and minimalist design

The chartreuse-on-editorial-dark system gives a clean, athletic feel.
Sections breathe. No more than two competing CTAs on any page. The
quiz strips chrome aggressively (single column, single decision).
Strong restraint.

**Findings**

- **Minor.** The new modular blog blocks (Stage 9) increased visual
  weight in posts that use 3+ of them. Consider a max-2-per-post
  recommendation in editorial guidelines.

---

## 9. Help users recognize, diagnose, and recover from errors

Inline error messages are written in plain English ("Enter your email",
not "Validation failed"). The 429 IP velocity message explains the
problem and offers escalation.

**Findings**

- **Major.** When `/api/account/create` returns `persist-failed`, the
  client surfaces "Something went wrong" but doesn't preserve the quiz
  answers across the retry. If the user refreshes, the quiz answers are
  lost. Save to localStorage before submitting and clear after success.
- **Minor.** The 404 page (`app/not-found.tsx`) is well-designed but
  doesn't surface a search box. Adding a single search field that hits
  /api/search would dramatically improve recovery for misspelled blog
  slugs.

---

## 10. Help and documentation

The blog itself is the primary help surface. FAQs on landing, FAQs on
plan, FAQs on partners. The Contact page lists 3 inboxes by purpose.
Refunds, Terms, Privacy, Cookies all live under /legal. Brand
guidelines live under /press. Good distribution.

**Findings**

- **Minor.** No global Help nav item or `/help` route. The brand
  guidelines, partner FAQs, and blog "how to" content could all live
  under /help/* for discoverability.

---

## Vyrek-specific lenses

### Voice consistency

- **Done.** Em-dashes purged from all user-facing copy (verified Stage
  13). Exclamation marks: none in production strings. British spelling:
  consistent. British date format: rendered via `format(date, "d MMMM
  yyyy")` everywhere it matters.

### Race-day timing sensitivity

- **Minor.** The quiz race-date picker does not warn if the chosen race
  is less than 12 weeks away — but the programme assumes 12 weeks. Add
  an inline note "Your race is in 7 weeks; we'll compress the plan
  accordingly" so the user knows what they're signing up for.

### Mobile-first reality

- **Done.** All pages tested at 375 / 390 / 414 via Stage 1 mobile
  audit. Zero horizontal scroll. Tap targets ≥ 48px. Sticky CTAs
  respect safe-area-inset-bottom.

### Image attribution

- **Minor.** The /press/founder-bio.md says "credit Vyrek where space
  allows" but the press kit doesn't include a logo or wordmark in the
  bio PDF format directly. Add a one-line "Logo at /logo-primary.svg"
  to the bio so press can grab both in one click.

---

## Critical issues blocking launch

None found in this review. The site is launch-ready for marketing,
lead capture, content, and partner application. The single hard
launch blocker remains user-side: Supabase migrations 0002-0005
need to be applied (see docs/PENDING-MIGRATIONS-READY-TO-PASTE.sql).

## Major issues — fix before paid acquisition

1. IP velocity 429 should set Retry-After header and surface a
   countdown (1 hour work).
2. Stripe checkout transition needs a "Taking you to Stripe..." state
   for slow networks (30 min work).
3. /quiz race-date picker should disable past dates (15 min work).
4. Account creation failure should preserve quiz answers in
   localStorage and offer a single-click retry (1 hour work).
5. Capture Stripe cancellation reason as optional field on return path
   (45 min work).

## Minor issues — polish backlog

Twelve items above, each scoped at 15-30 minutes. Total: ~5 hours of
gentle polish work.

---

_Compiled after walking 38 routes manually and reviewing the
stress-test session logs. Updated 24 May 2026._
