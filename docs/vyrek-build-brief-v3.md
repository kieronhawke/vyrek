# Vyrek — Claude Code Build Brief (v3 / FINAL)

**Working name:** Vyrek
**Aesthetic:** Editorial dark, mobile-first
**Voice:** The Trainer's Notebook (direct, technical, no hype)
**Stack:** Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui
**Scope:** Phase 1 — front-end + Stripe-backed onboarding funnel ending at trial started
**Quality bar:** Fully functioning, not demos. Lighthouse 95+. UK English. 90% mobile traffic.

---

## How to use this brief

Paste this entire document into Claude Code as your opening prompt. Build in the order in §22. Install MCP servers (§2) first.

This brief is the single source of truth. If any other context conflicts, this wins.

---

## 1. Project overview

Vyrek is a premium web-based Hyrox training platform. Users land, take a 90-second quiz, give their email, see a real dated Week 1 plan, and start a 7-day free trial via Stripe.

The strategic moat is **plan-before-pay**: we show Week 1 free, gate Weeks 2-12 behind subscription. Marchon and Runna both hide the plan. We don't.

Brand-led, not coach-led. Ben's Elite 15 status is one credential among others (real or future). The brand has to survive any single coach leaving.

90% mobile traffic. Every UX decision favours mobile-first. The site should feel like a native iOS app, not a website.

Phase 1 ends at "trial started." Phase 2 (workout dashboard + iOS app + RevenueCat) comes later. The Phase 1 data model is built so Phase 2 slots in without rebuild.

---

## 2. MCP servers to install first

```bash
claude mcp add context7 --scope user -- npx -y @upstash/context7-mcp
claude mcp add playwright --scope user -- npx -y @playwright/mcp@latest
claude mcp add chrome-devtools --scope user -- npx -y chrome-devtools-mcp@latest
claude mcp add shadcn --scope user -- npx -y shadcn@latest mcp
claude mcp add stripe --scope user -- npx -y @stripe/mcp --tools=all
```

- **Context7** — fresh docs for GSAP, Next.js, Motion, Stripe
- **Playwright** — real browser for visual testing, mobile viewport first
- **Chrome DevTools** — perf, network, console
- **shadcn** — installs components cleanly
- **Stripe** — manages products, prices, coupons, webhooks

---

## 3. Tech stack (locked)

**Core**
- Next.js 15 (App Router)
- TypeScript (strict)
- Tailwind CSS v4
- shadcn/ui base components

**Animation**
- GSAP + ScrollTrigger + SplitText (free, all plugins)
- Motion (React) for UI micro-interactions
- Lenis for smooth scroll (desktop only; native iOS scroll on touch)

**Infrastructure**
- Vercel hosting
- Stripe Checkout (hosted) with `trial_period_days: 7`
- Resend for transactional email
- React Email for templates
- PostHog (analytics, session recording, funnels, feature flags)
- Sentry (error tracking)
- Supabase (Postgres for customers, quiz, referrals, waitlist)
- Upstash Redis (rate limiting)

**Do NOT install**
- RevenueCat (Phase 2)
- Framer (the website builder; we use Motion the React library, already in stack)
- Any "AI animation" library — GSAP and Motion are enough

---

## 4. Voice & tone — The Trainer's Notebook

**Principles**
- Direct. Short sentences.
- Technical when accuracy matters. Plain when it doesn't.
- No hype. No exclamation marks except in error states (rare).
- Lowercase nav and supporting text. Sentence case for headlines and CTAs.
- Never apologetic. Never overly warm. Trust the work.
- Numbers and times preferred to adjectives.

**Examples**

| Default copy | Vyrek voice |
|---|---|
| "Submit my answers!" | "Get plan →" |
| "Continue" | "Next →" |
| "Welcome to Vyrek!" | "You're in. Day 1 starts tomorrow." |
| "Personalised plans for your goals!" | "12 weeks. Built around your race." |
| "Loading..." | "One moment." |
| "Oh no, something went wrong!" | "That didn't work. Try again." |
| "Awesome! You're all set!" | "Done." |
| "We're here to help" | "Reply to this email. We answer." |

**Headline patterns**
- Hero: 5 words max. Verb-first or noun-first. Declarative.
- Section: 3-5 words. Statement, not question.
- CTA: 2-3 words ending in arrow. "Get plan →", "Start trial →", "Next →"

**Forbidden words**: amazing, incredible, revolutionary, game-changer, journey, unleash, unlock (your potential), elevate, transform.

**Permitted intensifiers (use sparingly)**: precise, dated, real, specific, measured.

---

## 5. File structure

```
vyrek/
├── app/
│   ├── layout.tsx              # Root, font loading, analytics, PWA meta
│   ├── page.tsx                # Landing
│   ├── globals.css             # Tailwind + design tokens
│   ├── not-found.tsx
│   ├── error.tsx
│   ├── loading.tsx
│   ├── manifest.ts             # PWA manifest
│   ├── sitemap.ts
│   ├── robots.ts
│   ├── opengraph-image.tsx     # Dynamic OG image
│   ├── quiz/
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Intro
│   │   ├── [step]/page.tsx     # Dynamic step renderer
│   │   ├── padding/[slot]/page.tsx  # Padding screens
│   │   ├── email/page.tsx      # Email gate before plan
│   │   └── calculating/page.tsx
│   ├── plan/page.tsx
│   ├── plan/share/[id]/page.tsx # Shareable plan URL
│   ├── checkout/page.tsx
│   ├── welcome/page.tsx
│   ├── account/
│   │   ├── page.tsx
│   │   ├── refer/page.tsx
│   │   └── cancel/page.tsx
│   ├── legal/
│   │   ├── privacy/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── cookies/page.tsx
│   │   └── refunds/page.tsx
│   └── api/
│       ├── quiz/route.ts
│       ├── email-gate/route.ts        # Save email + quiz state
│       ├── stripe/
│       │   ├── create-checkout-session/route.ts
│       │   ├── create-portal-session/route.ts
│       │   └── webhook/route.ts
│       ├── referral/
│       │   ├── validate/route.ts
│       │   ├── generate/route.ts
│       │   └── claim/route.ts         # Mark bounty payable
│       ├── waitlist/route.ts
│       ├── stats/active/route.ts      # Real-time social proof
│       └── email/route.ts
├── components/
│   ├── ui/                     # shadcn primitives
│   ├── marketing/
│   │   ├── hero.tsx
│   │   ├── plan-teaser.tsx     # NEW v3: animated phone mockup
│   │   ├── social-proof-bar.tsx
│   │   ├── programs.tsx        # Carousel, 4 programmes
│   │   ├── bento-features.tsx
│   │   ├── week-in-life.tsx    # NEW v3: Tuesday/Wednesday/Saturday vignette
│   │   ├── not-ready.tsx       # NEW v3: objection handling
│   │   ├── coach-hub.tsx       # Multi-coach architecture
│   │   ├── plan-deep-dive.tsx  # NEW v3: example week structure
│   │   ├── testimonials.tsx
│   │   ├── faq.tsx
│   │   ├── final-cta.tsx
│   │   └── footer.tsx
│   ├── quiz/
│   │   ├── question-shell.tsx
│   │   ├── progress-arc.tsx    # Premium progress indicator
│   │   ├── option-card.tsx
│   │   ├── slider-input.tsx
│   │   ├── calendar-input.tsx
│   │   ├── multi-select-sheet.tsx
│   │   ├── email-gate.tsx
│   │   ├── padding-screen.tsx
│   │   ├── gesture-hint.tsx    # First-time swipe hint
│   │   └── preview-chip.tsx    # Mid-quiz "decided so far" chip
│   ├── plan/
│   │   ├── week-grid.tsx
│   │   ├── workout-card.tsx
│   │   ├── workout-sheet.tsx   # Bottom sheet detail
│   │   ├── paywall-overlay.tsx
│   │   └── share-button.tsx
│   ├── pwa/
│   │   ├── install-prompt.tsx
│   │   └── ios-install-instructions.tsx
│   ├── referral/
│   │   ├── share-card.tsx
│   │   ├── bounty-status.tsx
│   │   └── code-input.tsx
│   ├── legal/
│   │   └── cookie-banner.tsx
│   ├── skeleton/
│   │   ├── plan-grid-skeleton.tsx
│   │   └── program-card-skeleton.tsx
│   └── shared/
│       ├── live-counter.tsx    # Real-time training count
│       ├── resume-banner.tsx   # "You're 4 questions in" recovery
│       └── countdown.tsx       # Race-date countdown
├── lib/
│   ├── stripe.ts
│   ├── quiz-schema.ts          # Questions + branching + entry-point routes
│   ├── plan-generator.ts
│   ├── analytics.ts
│   ├── supabase.ts
│   ├── referral.ts
│   ├── rate-limit.ts
│   ├── email/                  # React Email templates
│   │   ├── welcome.tsx
│   │   ├── day-1.tsx
│   │   ├── day-3.tsx
│   │   ├── day-5.tsx
│   │   ├── day-6.tsx           # The conversion email with Week 2 teaser
│   │   ├── trial-converted.tsx
│   │   ├── payment-failed.tsx
│   │   ├── cancellation.tsx
│   │   ├── winback.tsx
│   │   ├── abandoned-plan.tsx  # NEW v3: email-captured but no signup
│   │   ├── referral-bounty.tsx
│   │   └── waitlist-welcome.tsx
│   └── utils.ts
├── hooks/
│   ├── use-quiz-state.ts
│   ├── use-haptics.ts
│   ├── use-magnetic-cursor.ts
│   ├── use-prefers-reduced-motion.ts
│   ├── use-live-counter.ts
│   ├── use-visual-viewport.ts
│   ├── use-network-information.ts
│   ├── use-pwa-install.ts
│   ├── use-native-share.ts
│   └── use-resume-quiz.ts      # Detects abandoned quiz state
├── public/
│   ├── logo-primary.svg
│   ├── logo-monogram.svg
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-192.png
│   ├── icon-maskable-512.png
│   ├── og-image.png
│   └── sounds/
│       ├── select.mp3          # Quiz option select
│       ├── advance.mp3         # Next button
│       └── reveal.mp3          # Plan reveal swoosh
└── (config: next.config.ts, tailwind.config.ts, tsconfig.json, .env.local)
```

---

## 6. Design tokens

`app/globals.css`:

```css
:root {
  /* Surfaces */
  --bg-base:        #0A0A0A;
  --bg-elevated:    #141414;
  --bg-overlay:     #1C1C1C;

  /* Borders */
  --border-subtle:  #1F1F1F;
  --border-default: #2A2A2A;
  --border-strong:  #3D3D3D;

  /* Text */
  --text-primary:   #F5F5F3;
  --text-secondary: #A8A8A6;
  --text-tertiary:  #5C5C5A;
  --text-disabled:  #3D3D3B;

  /* Accent (single warm orange, used sparingly) */
  --accent:         #FF5A1F;
  --accent-hover:   #FF7A47;
  --accent-muted:   #4A1F0E;

  /* Semantic */
  --success:        #00D26A;
  --warning:        #FFB800;
  --danger:         #FF4646;

  /* Radii */
  --radius-sm:      6px;
  --radius-md:      12px;
  --radius-lg:      24px;
  --radius-pill:    9999px;

  /* Spacing (8pt grid) */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-6:  24px;
  --space-8:  32px;
  --space-12: 48px;
  --space-16: 64px;
  --space-24: 96px;
  --space-32: 128px;

  /* Type scale */
  --text-xs:   12px;
  --text-sm:   14px;
  --text-base: 16px;            /* iOS minimum prevents zoom */
  --text-lg:   20px;
  --text-xl:   24px;
  --text-2xl:  32px;
  --text-3xl:  48px;
  --text-4xl:  64px;
  --text-5xl:  96px;

  /* Motion */
  --ease-out:   cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --duration-fast: 180ms;
  --duration-base: 320ms;
  --duration-slow: 640ms;

  /* Safe areas */
  --safe-top:    env(safe-area-inset-top);
  --safe-bottom: env(safe-area-inset-bottom);
  --safe-left:   env(safe-area-inset-left);
  --safe-right:  env(safe-area-inset-right);
}

* {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

html {
  height: 100svh;
}

body {
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overscroll-behavior-y: none;
  font-variant-numeric: tabular-nums; /* numbers don't dance */
}

input, textarea, select {
  font-size: 16px; /* critical: prevents iOS auto-zoom */
}

button, a, [role="button"] {
  min-height: 48px;
  min-width: 48px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Typography**
- Headings: Geist 900, tracking -0.04em to -0.07em
- Body: Geist 400, line-height 1.6
- Technical mark: Geist Mono 500, tracking 0.18em, uppercase, opacity 0.55

Load via `next/font/google`.

**Rules**
- No gradients on text or buttons
- No drop shadows except focus rings (2px solid accent)
- No emoji in UI
- Border lift in dark mode, not shadow
- Hover: opacity 0.85 or background lift to bg-elevated
- Active: scale(0.98)
- Tabular figures for all numbers
- Links underline left-to-right on hover (not appear at once)

---

## 7. Logo

`public/`:
- `logo-primary.svg` — VYREK wordmark, Geist 900, currentColor
- `logo-monogram.svg` — V in rounded square, currentColor
- `apple-touch-icon.png` — 180x180, monogram on bg-base
- PWA icons 192 + 512 (any + maskable variants)

Swap to real name in minutes when ready.

---

## 8. Landing page (`app/page.tsx`) — 13 sections

Mobile-first. Desktop is secondary. Each section has rationale baked in from the Marchon + Runna analysis.

### 8.1 Nav (sticky, 56px)
- Vyrek monogram left (32px)
- Single CTA right: "Start" (40px height, accent bg)
- Background: transparent → backdrop-blur(24px) over bg-base/80 on scroll
- Safe-area-inset-top padding
- No hamburger menu. No secondary links.

### 8.2 Hero
- Full viewport (`100svh`)
- Background: looping dark video of Hyrox training (placeholder MP4 from Pexels until Ben supplies real footage)
- Network-aware: if `effectiveType` is `slow-2g` / `2g` or `saveData` true → poster image only
- **Headline:** "Train like a Hyrox athlete."
- **Sub-headline:** "Personalised programmes for the world's fastest growing sport. See your Week 1 in 90 seconds."
- **Primary CTA:** "Get your plan →" — full-width mobile, 56px tall, accent bg
- **No trust signals in hero** — moved to section 8.3 (the hero answers "should I scroll?" not "should I commit?")
- Headline animates in character-by-character via GSAP SplitText on load

### 8.3 Social proof bar (thin band under hero)
- Single line: "★★★★★ · 327 athletes training · As featured in [press logo strip]"
- Real number from `/api/stats/active`, cached 5min, floor of 100
- Press logos placeholder until partnerships confirmed (do not fake — ASA rules)

### 8.4 Plan reveal teaser
- Heading: "See your plan in 90 seconds"
- Animated phone mockup showing a Week 1 grid (blurred workout names, real structure)
- Workouts shimmer in one at a time via GSAP timeline
- Below mockup: 3 steps with bracketed labels
  - `[ 01 ]` Take the 90-second quiz
  - `[ 02 ]` See your real Week 1 — every workout, every day
  - `[ 03 ]` Start your trial. First week free.
- Secondary CTA: "Get your plan →"

### 8.5 Programs grid (4 cards, horizontal swipeable carousel on mobile)
- Heading: "Find your programme"
- 4 cards, CSS scroll-snap on mobile, 2x2 grid on desktop

| Card | Tag | Audience |
|---|---|---|
| **First Race** | `[ BEGINNER / 12 WEEKS ]` | Never raced. Build to your first finish line. |
| **Sub-90** | `[ INTERMEDIATE / 12 WEEKS ]` | Completed Hyrox. Break the 90-minute barrier. |
| **Doubles** | `[ PARTNER / 12 WEEKS ]` | Train together. Race together. One plan, two athletes. |
| **Pro** | `[ ADVANCED / 12 WEEKS ]` | Sub-75 athletes chasing podiums. |

Each card:
- Background image (Hyrox station relevant to level)
- Programme name (large, weight 900)
- Tag (small mono, top-right)
- One-liner
- Tap area = full card. Routes to `/quiz?program=first-race` etc.
- Indicator dots below carousel on mobile

### 8.6 Bento feature grid (3 cards, varied sizes)

Steal from Marchon. Three cards in bento layout:

1. **Large (top, full-width on mobile):** "A dated weekly plan, built around your life."
   - Visual: animated mockup of Mon-Sun grid
   - Sub: "Every Sunday, your next 7 days appear. Hyrox-specific. Your equipment. Your time."

2. **Medium (bottom-left desktop, stacked mobile):** "Built by Elite 15 athletes."
   - Visual: portrait grid of coaches (Ben prominent, 3-4 placeholder squares)
   - Sub: "Programming designed by athletes who race at the top of the sport."

3. **Medium (bottom-right):** "Adapts as you improve."
   - Visual: ascending performance chart
   - Sub: "Log your sessions. Plans recalibrate every Sunday."

### 8.7 Week in your life (vignette)

**NEW vs v2.** This addresses "can I actually fit this into my life?"

Heading: "A week in your life with Vyrek"

Three time-stamped vignettes:

```
Tuesday, 6:15am
Day 2. Hyrox Hybrid: Run + Sled.
45 minutes. Coach notes loaded.
You log it after.

Thursday, 7:30pm
Strength block. 60 minutes.
Three sled-relevant lifts.
Posted plan, video form checks.

Saturday, 8:00am
Race simulation. 90 minutes.
8 stations + 8 × 1km.
The big one.
```

Reads like a training journal. Specific. Believable.

### 8.8 What if I'm not ready (objection handling)

**NEW vs v2.** Three columns addressing the three biggest fears:

| Fear | Response |
|---|---|
| "I've never raced before" | First Race programme. 12 weeks. 92% of members finish their first Hyrox stronger than expected. |
| "I might get injured" | Built-in active recovery. Mobility weekly. Programmed deload weeks. |
| "What if I miss a session?" | Plan adapts. Missed sessions reshuffle. No guilt. No restart. |

### 8.9 Coach hub

Heading: "Built by Elite 15 athletes"

- Grid of coach tiles (Ben prominent as founding coach, plus 2-3 placeholder slots labelled "Coming soon" — don't fake additional coaches)
- Each tile: portrait, name, role tag (`[ FOUNDING COACH ]` etc), credential row
- Tap tile → bottom sheet with full bio, credentials, social links
- Architecture supports any number of coaches added later without rebuild

Ben's tile content:
- Portrait (ideally short looping video of him training, muted, 6sec)
- Name: Ben [surname]
- Role: `[ FOUNDING COACH ]`
- Credentials below: `[ ELITE 15 ]` `[ HYROX UK 2024/25 ]` `[ ELITE WORLD CHAMPIONSHIPS QUALIFIER ]`
- 80-word bio
- Instagram + TikTok links

### 8.10 Plan deep-dive

Heading: "What a week looks like"

- 7-day example grid (Mon-Sun) with example workouts (not personalised; clearly labelled "Example week")
- Each day: day name, workout type, duration, intensity zone
- Below: "Yours will be personalised to your goals, equipment, and race date."
- CTA: "Get your personalised week →"

### 8.11 Testimonials

- 4-6 quote cards
- Each: quote (1-2 sentences), first name, race time, city
- Auto-scroll carousel with swipe override on mobile
- For launch: use beta testers, real first names only
- Do not fake (UK ASA compliance)

### 8.12 FAQ (8 questions, accordion)

Accordion on mobile, 2 columns on desktop:

1. **What is Vyrek?** — Personalised Hyrox training programmes built by Elite 15 athletes. Take a 90-second quiz. See your first week. Start a 7-day free trial.

2. **Is this just an app?** — Right now, it's a web platform. Access from any device. iOS app coming. Add to your home screen for app-like use today.

3. **Who designs the programming?** — Programmes are designed by Elite 15 Hyrox athletes. Founding coach: Ben [surname]. More coaches joining.

4. **What if I've never done a Hyrox?** — The First Race programme is built for exactly that. 12 weeks to your first finish line.

5. **What equipment do I need?** — None to start. The quiz adapts to whatever you have. Full gym, home setup, or bodyweight.

6. **What happens after my trial ends?** — On day 8, you're charged £14.99/month. Cancel anytime in two taps.

7. **Can I cancel during the trial?** — Yes. Two taps. No questions. No charge.

8. **Will my plan change as I improve?** — Yes. Every Sunday, plans recalibrate based on your logged sessions.

### 8.13 Final CTA + footer

Final CTA block:
- Heading: "Ready to find your plan?"
- Sub: "90-second quiz. Real Week 1 before you pay."
- Primary CTA: "Get your plan →"
- Trust line: "First week free. Cancel anytime."

Footer:
- 3 columns desktop, single column mobile
- **Product**: Programmes / How it works / Refer & earn
- **Company**: About / Contact / Press
- **Legal**: Privacy / Terms / Cookies / Refunds
- Bottom row: monogram + technical mark `[ VYREK ] [ FITNESS / 2026 ] [ MADE IN UK ]` + Instagram/TikTok icons

**No pricing visible on landing.** Hidden until after quiz, per locked decision.

---

## 9. Quiz flow (`app/quiz/[step]/page.tsx`)

8 questions, 14 screens total. State persisted in localStorage as `vyrek:quiz:state`. UUID generated on quiz start (stored as `vyrek:customer:uuid`).

### Screen sequence

| # | Screen | Type |
|---|---|---|
| 1 | Welcome / intro | "You're 90 seconds from your plan" + 3 reviews + Begin |
| 2 | Q1: Experience | Single-select |
| 3 | Q2: Finish time | Single-select (conditional on Q1 = "raced") |
| 4 | **Padding 1** | Reassurance: "92% of First Race members finish stronger than expected" + 1 quote |
| 5 | Q3: Partner | Single-select |
| 6 | Q4: Days per week | Slider |
| 7 | Q5: Location | Single-select |
| 8 | Q6: Equipment | Multi-select (conditional on Q5 = "home") |
| 9 | **Padding 2** | Stat: "Give us 4 days a week. We'll give you Hyrox-ready fitness." + lifestyle photos |
| 10 | Q7: Session length | Single-select |
| 11 | Q8: Race date | Calendar (optional) |
| 12 | **Email gate** | Single email input. "Where should we send your plan?" |
| 13 | Calculating | 3.5s cinematic |
| 14 | Plan reveal | Real Week 1 + paywalled Weeks 2-12 |

### Question schema (`lib/quiz-schema.ts`)

```typescript
export const QUIZ_QUESTIONS = [
  {
    id: 'experience',
    question: 'Have you raced a Hyrox?',
    type: 'single-select',
    options: [
      { value: 'never', label: 'Never raced' },
      { value: 'signed-up', label: 'Signed up, not raced' },
      { value: 'raced', label: 'Raced one or more' },
    ],
    branch: {
      'never': () => 'first-race-path',
      'signed-up': () => 'first-race-path',
      'raced': () => 'continue',
    }
  },
  {
    id: 'finish-time',
    question: "What's your best Hyrox time?",
    type: 'single-select',
    showIf: (state) => state.experience === 'raced',
    options: [
      { value: 'under-75', label: 'Under 75 min' },
      { value: '75-90', label: '75 to 90 min' },
      { value: '90-105', label: '90 to 105 min' },
      { value: 'over-105', label: 'Over 105 min' },
    ],
    branch: {
      'under-75': () => 'pro-path',
      '75-90': () => 'sub-90-path',
      '90-105': () => 'sub-90-path',
      'over-105': () => 'sub-90-path',
    }
  },
  {
    id: 'partner',
    question: 'Solo or doubles?',
    type: 'single-select',
    options: [
      { value: 'solo', label: 'Solo' },
      { value: 'doubles', label: 'Doubles' },
    ],
    branch: {
      'doubles': () => 'doubles-path',
      'solo': () => 'continue',
    }
  },
  {
    id: 'days-per-week',
    question: 'How many days a week can you train?',
    type: 'slider',
    min: 3, max: 6, default: 4,
    labels: ['3', '4', '5', '6'],
  },
  {
    id: 'location',
    question: 'Where will you train?',
    type: 'single-select',
    options: [
      { value: 'gym-full', label: 'Full gym (sled, ski erg, rower)' },
      { value: 'gym-standard', label: 'Standard commercial gym' },
      { value: 'home', label: 'Home setup' },
    ],
  },
  {
    id: 'equipment',
    question: 'What kit do you have at home?',
    type: 'multi-select',
    showIf: (state) => state.location === 'home',
    options: [
      { value: 'dumbbells', label: 'Dumbbells' },
      { value: 'kettlebell', label: 'Kettlebell' },
      { value: 'rower', label: 'Rower' },
      { value: 'ski-erg', label: 'Ski erg' },
      { value: 'sled', label: 'Sled' },
      { value: 'nothing', label: 'Bodyweight only' },
    ],
  },
  {
    id: 'session-length',
    question: 'How long can your sessions be?',
    type: 'single-select',
    options: [
      { value: '30', label: '30 min' },
      { value: '45', label: '45 min' },
      { value: '60', label: '60 min' },
      { value: '90', label: '90 min or more' },
    ],
  },
  {
    id: 'race-date',
    question: 'Got a race booked?',
    type: 'calendar',
    optional: true,
  },
];
```

### Entry-point optimisations

Quiz schema adapts to URL params:

| Entry path | Skip questions |
|---|---|
| `/quiz` (default) | none — full 8 questions |
| `/quiz?program=first-race` | Skip Q1 (assume "never raced") |
| `/quiz?program=sub-90` | Skip Q1 (assume "raced"), start at Q2 |
| `/quiz?program=doubles` | Skip Q1, skip Q3 (assume doubles) |
| `/quiz?program=pro` | Skip Q1, Q2, start with intensity questions |

Cuts 30-90 seconds depending on path.

### Mobile interactions per question type

| Type | Mobile UX |
|---|---|
| `single-select` | Full-width option cards, accent border on selected, haptic light |
| `multi-select` | Bottom sheet slides up, chips toggleable, "Done" CTA, haptic light per toggle |
| `slider` | Native-feeling range with custom thumb, value live above slider, haptic medium at endpoints |
| `calendar` | Bottom sheet calendar (shadcn Calendar in Sheet), "No race booked" skip |
| `text-input` | Inline input, font-size 16px to prevent iOS zoom |

### Quiz screen layout

```
┌─────────────────────────────┐
│ ←  [03/08]              ⚙   │  Top bar (safe-area-top, 56px)
├─────────────────────────────┤
│ ▓▓▓▓░░░░░░░░░░░░░░░░░░     │  Progress arc (top-right, fills accent)
│                             │
│  What's your best           │  Question (text-2xl, weight 900)
│  Hyrox time?                │
│                             │
│  [ Pick one ]               │  Helper (mono, secondary)
│                             │
│  [ Programme matching:      │  Preview chip (NEW v3)
│    Sub-90 ]                 │
│                             │
│  ┌───────────────────────┐ │
│  │ Under 75 min          │ │  Option card (full-width, 64px)
│  └───────────────────────┘ │
│  ...                        │
│                             │
├─────────────────────────────┤
│  ←  Back        Next  →    │  Bottom bar (safe-area-bottom, 80px)
└─────────────────────────────┘
```

### First-screen polish

- Settings cog (top-right): bottom sheet with sound on/off + haptics on/off + reduced motion respect (read-only system pref shown)
- First-time gesture hint: small toast on screen 2 — "Swipe → or tap Next" — dismisses after first swipe
- "Your answers are saved" toast on first load (reassures iOS users about pull-to-refresh)
- Resume banner: if `vyrek:quiz:state` exists when landing on `/` — show banner "You're 4 questions in. Resume?"

### Padding screen layout

```
┌─────────────────────────────┐
│ ←  [04/08]                 │  Top bar
├─────────────────────────────┤
│ ▓▓▓▓▓▓░░░░░░░░░░░░░░       │
│                             │
│  ★★★★★                     │
│                             │
│  "Got me to my first Hyrox  │  Quote (text-lg)
│   finish feeling fresh.     │
│   Best £15 I've spent."     │
│                             │
│  Sarah · 92:14 · Bristol    │  Mono attribution
│                             │
│  ──────                     │
│                             │
│  92% of First Race          │  Stat block (text-3xl)
│  members finish their       │
│  first Hyrox stronger       │
│  than expected.             │
│                             │
├─────────────────────────────┤
│              Continue  →    │  Single CTA (no Back on padding)
└─────────────────────────────┘
```

### Keyboard handling

When email input focused on screen 12, `useVisualViewport` hook:
- Detects keyboard open (`window.visualViewport.height < window.innerHeight - 100`)
- Repositions bottom CTA above keyboard
- Scrolls input into view above centre line

### Edge cases

- Refresh mid-quiz: resume from last step via localStorage
- Direct link beyond progress: redirect to last valid step
- Empty optional answer: allow Next
- Background tab return: restore scroll position
- Pull-to-refresh disabled (`overscroll-behavior-y: none` on body)

---

## 10. Email gate (`app/quiz/email/page.tsx`)

**Inserted between Q8 and calculating cinematic.** Critical conversion lift.

### Layout

```
┌─────────────────────────────┐
│ ←  [Final step]            │
├─────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░         │
│                             │
│  Almost there.              │  Headline (text-2xl)
│                             │
│  Where should we send       │  Sub (text-secondary)
│  your plan?                 │
│                             │
│  ┌───────────────────────┐ │
│  │ you@email.com         │ │  Email input (16px)
│  └───────────────────────┘ │
│                             │
│  [ Saving your plan ]       │  Mono helper
│                             │
│  [ × ] We won't spam.       │  Trust signal
│        Unsubscribe anytime. │
│                             │
├─────────────────────────────┤
│              See plan  →    │
└─────────────────────────────┘
```

### On submit

POST to `/api/email-gate`:
1. Store email + UUID + full quiz state in Supabase (`customers` + `quiz_responses`)
2. Generate unique referral code for this customer
3. Schedule abandoned-plan email for +1hr if no checkout completion
4. Send to calculating cinematic

### Why this works

- Single field, no payment, low friction
- Captures the email asset before user sees the plan
- Powers abandoned-plan recovery (highest-ROI feature in build)
- 30-40% conversion lift vs collecting email at checkout

---

## 11. Calculating cinematic (`app/quiz/calculating/page.tsx`)

3.5 seconds. Routes to `/plan` on complete.

### Sequence (5 lines for credibility, not 4)

- 0.0s — Black. Single dot pulses centre.
- 0.4s — "Analysing your 8 answers..." (Geist Mono, opacity 0.55)
- 1.0s — "Cross-referencing 47 First Race programmes..."
- 1.7s — "Matching equipment to 12 workout templates..."
- 2.4s — "Calibrating to your race in 14 weeks..."
- 3.0s — "Your Week 1 is ready."
- 3.2s — Dot expands, soft white flash
- 3.5s — Route to `/plan`

The numbers don't have to be technically accurate — they have to feel earned. Each line uses the user's actual data (programme name, race date, equipment).

### Easter egg

If user's race-date is within 8 weeks AND finish time is sub-65, add one extra line at 2.7s: "You're faster than 99.4% of athletes. Adjusting."

### Implementation

- Single GSAP timeline
- Skip button bottom-right after 1.5s (small, opacity 0.55)
- Plan generated on edge during cinematic — no spinner on next page
- Soft "swoosh" sound at 3.2s (toggleable via settings)

---

## 12. Plan reveal (`app/plan/page.tsx`)

**The moat.** Week 1 dated, fully visible. Weeks 2-12 blurred behind paywall.

### Layout (top to bottom, mobile)

```
┌─────────────────────────────┐
│ Your plan                   │  Eyebrow (mono)
│                             │
│ First Race                  │  Programme name (text-3xl, weight 900)
│                             │
│ 12 weeks. Built around      │  Tagline (secondary)
│ your race on Saturday,      │
│ 14 March 2026.              │
│                             │
│ ┌──────┬──────┬──────┐     │
│ │ DAYS │ TIME │ START│     │  Stat row (mono, 3 cols)
│ │  4   │ 60m  │ Tue  │     │
│ └──────┴──────┴──────┘     │
│                             │
│ [ 14 weeks to your race ]   │  Countdown (NEW v3)
│                             │
│ ──────                      │
│                             │
│  Week 1 · Week 2 · Week 3   │  Week selector (h-scroll, snap)
│  ━━━━━━                     │
│                             │
│ ┌─────────────────────────┐│
│ │ Mon  21 May             ││
│ │ Easy run                ││
│ │ 45 min · Z2 endurance   ││
│ │ Tap to see structure →  ││
│ └─────────────────────────┘│
│                             │
│ ┌─────────────────────────┐│
│ │ Tue  22 May             ││
│ │ Hyrox Hybrid: Run+Sled  ││
│ │ 60 min · Race-specific  ││
│ └─────────────────────────┘│
│                             │
│ ...5 more days...           │
│                             │
│ ──────                      │
│                             │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  Weeks 2-12 blurred
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│  ┌─────────────────────┐   │
│  │ Unlock weeks 2-12   │   │  Paywall card centred
│  │ First week free.    │   │
│  │ [Start trial  →]    │   │
│  └─────────────────────┘   │
│                             │
├─────────────────────────────┤
│ Start free trial  →         │  Sticky bottom CTA
└─────────────────────────────┘
```

### Day card interaction

Tap any Week 1 day → bottom sheet slides up with full structure:

```
┌─────────────────────────────┐
│                        ✕    │
├─────────────────────────────┤
│ Tue 22 May                  │
│                             │
│ Hyrox Hybrid: Run + Sled    │  Title (text-2xl)
│ 60 min · Race-specific      │
│                             │
│ WARM-UP · 10 min            │
│ • 5 min easy jog            │
│ • Dynamic stretches × 5     │
│ • Sled push, light × 2      │
│                             │
│ MAIN · 40 min               │
│ • 1km run @ race pace       │
│ • Sled push 20m × 4         │
│ • 1km run @ race pace       │
│ • Sled pull 20m × 4         │
│ • 1km run @ race pace       │
│                             │
│ COOL-DOWN · 10 min          │
│ • Walk 5 min                │
│ • Stretches × 5             │
│                             │
│ [ Share workout ↗ ]         │  Native share
└─────────────────────────────┘
```

### Share functionality

Share button uses Web Share API. Pre-composed:
- WhatsApp: "Tuesday's training: 5km of running between sled pushes and pulls. From my Vyrek plan. vyrek.com/plan/share/[uuid]"
- Falls back to clipboard copy with toast on unsupported browsers

### Shareable URL (`app/plan/share/[id]/page.tsx`)

Anyone opening a shared link sees:
- "[Name]'s First Race plan — Week 1"
- The actual workouts
- "Want your own plan? Take the 90-second quiz →"

Viral loop. Marchon and Runna both miss this.

### Number animations

"45 min" counts up from 0 to 45 over 600ms when card scrolls into view. GSAP. Subtle premium signal.

### Connection-aware

If `effectiveType === 'slow-2g' || '2g'`: show icons instead of workout backgrounds. Faster load.

### Paywall enforcement

Weeks 2-12 data NOT in client bundle. Server-side API route guarded by subscription status. Dev tools cannot bypass.

---

## 13. Pricing (`app/pricing/page.tsx`)

Reached only via plan reveal CTA (hidden until then per locked decision).

### Layout

1. Headline: "One plan. All programmes."
2. Price card (centred, prominent):
   - **£14.99/month**
   - "First week free, then £14.99/month"
   - "Less than two coffees a week" (anchoring)
   - "Cancel anytime in two taps"
   - Inclusion list (6 bullets):
     - Personalised 12-week programme
     - Dated weekly plan, every Sunday
     - Built by Elite 15 athletes
     - Video form checks
     - Plan recalibrates as you improve
     - Cancel anytime, no questions
   - Primary CTA: "Start free trial →"
3. **Referral code input** (collapsible)
   - "Have a code from a friend?" — expand to text input
   - Validates against `/api/referral/validate` on blur
   - If valid: badge "✓ Code applied"
4. Mini-FAQ (4 most common from main FAQ)

---

## 14. Checkout (`app/checkout/page.tsx`)

Email already captured at gate. Skip step 1. Go straight to Stripe.

### Flow

1. Page loads with email + UUID + referral code from session
2. POST `/api/stripe/create-checkout-session` with:

```typescript
{
  mode: 'subscription',
  line_items: [{ price: STRIPE_PRICE_ID_MONTHLY, quantity: 1 }],
  subscription_data: {
    trial_period_days: 7,
    metadata: {
      vyrek_uuid,
      referrer_code, // null if none
    }
  },
  client_reference_id: vyrek_uuid,
  customer_email: email,
  metadata: { quiz_path, program },
  success_url: 'https://vyrek.com/welcome?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://vyrek.com/plan?cancelled=true',
  allow_promotion_codes: true,
  payment_method_types: ['card'],
}
```

3. Redirect to Stripe Checkout (hosted)
4. Apple Pay + Google Pay enabled automatically by Stripe on Checkout

### Rate limiting

`/api/stripe/create-checkout-session` — max 5/min per IP via Upstash.

---

## 15. Welcome (`app/welcome/page.tsx`)

Fired after Stripe redirect.

### Server-side

1. Verify `session_id` with Stripe
2. If invalid: redirect to `/pricing`
3. Generate referrer code for this customer (`/api/referral/generate`)
4. Trigger welcome email via Resend
5. Schedule day 1, 3, 5, 6 emails

### Layout

```
┌─────────────────────────────┐
│ You're in.                  │  Headline (text-3xl)
│                             │
│ Day 1 starts tomorrow.      │  Sub
│                             │
│ ┌──────────┬──────────┐    │
│ │ TRIAL    │ FIRST    │    │  Stat row (mono)
│ │ ENDS     │ WORKOUT  │    │
│ │ 28 May   │ Tue 22   │    │
│ └──────────┴──────────┘    │
│                             │
│ What happens next           │
│                             │
│ 01 — Add Vyrek to your      │
│      home screen            │
│ 02 — Open Tuesday morning   │
│ 03 — Hit the session        │
│                             │
│ ──────                      │
│                             │
│ Refer a friend. Earn £20.   │
│ [ See how →]                │
│                             │
│ [ View your plan →]         │
└─────────────────────────────┘
```

PWA install prompt fires after 3 seconds on this page (high-intent moment).

---

## 16. Account (`app/account/*`)

### `/account` — overview
- Subscription status, next bill date
- Quick links: refer, cancel, support

### `/account/refer` — referral hub
- Heading: "Refer a friend. Earn £20 cash."
- Mechanic: "When a friend's trial converts to paid, we'll BACS you £20. Within 5 business days of their first charge."
- Personal referral link in copy-paste card: `vyrek.com/?ref=K7M9X2P4`
- Native share button (mobile): pre-composed messages for WhatsApp / Twitter / Instagram / generic
- Stats panel:
  - "X friends referred"
  - "Y on trial right now"
  - "Z converted to paid"
  - "£XX earned · £YY pending payout"
- BACS details form (for first payout)
- Anti-abuse note: "Max 50 successful referrals per year. Self-referrals don't count."

### `/account/cancel` — cancellation with retention

**Step 1**: "Why are you cancelling?" — single-select bottom sheet:
- Too expensive
- Not using it
- Found another app
- Injury / break needed
- Other

**Step 2**: Retention offer (conditional):
- Too expensive → 50% off next month
- Not using it → Pause 30 days
- Found another app → No retention, proceed
- Injury → Pause 60 days
- Other → No retention, proceed

**Step 3**: Confirm
- "Your subscription ends 28 June. You keep access until then."
- Single button: "Confirm cancellation"
- POST to Stripe via API
- Schedule winback email +30 days
- Mark cancellation reason in Supabase

---

## 17. Legal pages (`app/legal/*`)

UK GDPR mandatory. Build all 4 before launch.

### `/legal/privacy`
What we collect (email, quiz answers, payment via Stripe), why, retention, UK GDPR rights (access, deletion, portability), DPO contact, ICO complaint link.

### `/legal/terms`
Service description, payment terms, cancellation rights, conduct, IP, liability, governing law (England & Wales). **Include referral programme T&Cs**: £20 bounty trigger conditions, cap, anti-fraud, payment timing.

### `/legal/cookies`
Every cookie listed, purpose, duration, opt-out.

### `/legal/refunds`
UK Consumer Contracts Regulations: digital services no cooling-off once accessed. Refund only for accidental charges (within 48hr of bill).

### Cookie banner (`components/legal/cookie-banner.tsx`)
- First visit
- Three options: Accept all / Reject all / Manage preferences
- Categories: Necessary / Analytics / Marketing
- Default: all non-necessary OFF (UK GDPR opt-in)
- PostHog + Sentry load only AFTER consent
- Preference: `vyrek:consent:v1`

Build custom — Cookiebot is overkill at this stage.

---

## 18. Stripe + Supabase

### Environment

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_ID_MONTHLY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
RESEND_API_KEY=
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=
POSTHOG_KEY=
SENTRY_DSN=
```

### Webhook events

| Event | Action |
|---|---|
| `checkout.session.completed` | Mark trial started. Send welcome email. Schedule day 1/3/5/6. Validate referral code. |
| `customer.subscription.created` | Store in Supabase. |
| `customer.subscription.updated` | Update status. |
| `customer.subscription.deleted` | Mark cancelled. Schedule winback +30d. |
| `customer.subscription.trial_will_end` | Send "trial ending" (Stripe sends 3 days before automatically). |
| `invoice.payment_succeeded` | If first paid invoice: send conversion email + **trigger £20 referral bounty payable if referred**. |
| `invoice.payment_failed` | Send payment-failed email. Stripe auto-retries 3 times. |

### Referral bounty logic (in `invoice.payment_succeeded` handler)

```typescript
// On first paid invoice (trial converted):
1. Lookup customer in Supabase
2. Check customer.referred_by_code
3. If present:
   a. Lookup referrer by code
   b. Create referral record (status: 'payable')
   c. Send referral-bounty email to referrer
   d. Queue for next monthly BACS payout batch
4. Increment referrer's earnings counter
```

Manual BACS payout monthly via Supabase report until volume justifies Stripe Connect.

### Supabase schema

```sql
create table customers (
  id uuid primary key,
  email text unique not null,
  stripe_customer_id text unique,
  referral_code text unique,           -- 8-char alphanumeric, generated post-signup
  referred_by_code text,               -- if signed up via someone's link
  bacs_sort_code text,                 -- for referral payouts
  bacs_account_number text,
  created_at timestamptz default now()
);

create table quiz_responses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  email text not null,                 -- captured at gate, may pre-date customer record
  answers jsonb not null,
  program text not null,
  path text not null,
  created_at timestamptz default now()
);

create table subscriptions (
  id uuid primary key,
  customer_id uuid references customers(id),
  stripe_subscription_id text unique,
  status text not null,                -- trialing | active | past_due | canceled
  trial_end timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz default now()
);

create table referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references customers(id),
  referee_id uuid references customers(id),
  status text not null,                -- pending | trial_started | payable | paid | refunded
  bounty_amount_pence integer default 2000, -- £20
  payable_at timestamptz,              -- set when referee first paid invoice succeeds
  paid_at timestamptz,
  payment_reference text,              -- BACS reference
  created_at timestamptz default now(),
  unique (referee_id)                  -- one bounty per referee
);

create table waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  source text,
  created_at timestamptz default now()
);

create table abandoned_plans (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  quiz_uuid uuid,
  program text,
  recovered_at timestamptz,
  created_at timestamptz default now()
);

-- Indexes
create index on customers(stripe_customer_id);
create index on customers(referral_code);
create index on customers(referred_by_code);
create index on subscriptions(customer_id);
create index on referrals(referrer_id);
create index on referrals(status);
create index on quiz_responses(email);
```

### Anti-abuse on referrals

- Self-referral check: referee email match referrer's → reject silently
- One bounty per referee (database unique constraint)
- Max 50 successful referrals per referrer per calendar year (enforced in API)
- Bounty only triggers after referee's first paid invoice (not just trial start) — prevents fake trial abuse

---

## 19. Plan generator (`lib/plan-generator.ts`)

Maps quiz answers to a Week 1 with real workouts.

### Rules by path

- **First Race**: 60% run / 30% strength / 10% Hyrox stations
- **Sub-90**: 40% run / 30% strength / 30% Hyrox stations
- **Doubles**: relevant path + 1 partner-station session
- **Pro**: highest volume, intervals, race-pace work

### Day types

Easy run · Hyrox-specific session · Strength (full body or push/pull) · Threshold/interval run · Active recovery · Rest

### Output

```typescript
type Workout = {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  date: string;
  type: 'run' | 'hyrox' | 'strength' | 'recovery' | 'rest';
  title: string;
  duration_min: number;
  intensity_zone: 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5';
  structure: {
    section: 'warmup' | 'main' | 'cooldown';
    duration_min: number;
    blocks: { name: string; reps?: string; duration?: string; notes?: string }[];
  }[];
};

type Plan = { week: 1; workouts: Workout[]; };
```

### Important

- Week 1 generated client-side (fast plan reveal)
- Weeks 2-12 server-only, gated by subscription status
- Seeded deterministic (same answers → same plan; helps testing)
- Recalibrates every Sunday based on logged sessions (Phase 2)

---

## 20. Mobile-first requirements (90% traffic)

### 20.1 PWA configuration

`app/manifest.ts`:

```typescript
import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vyrek',
    short_name: 'Vyrek',
    description: 'Personalised Hyrox training programmes',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0A0A0A',
    theme_color: '#0A0A0A',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
```

Install prompt fires on welcome page after 3 seconds (high intent moment). iOS shows custom "Tap share, then Add to Home Screen" instructions because `beforeinstallprompt` doesn't fire on iOS.

### 20.2 iOS Safari meta

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Vyrek" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

### 20.3 Critical mobile fixes (already in §6)
- `100svh` not `100vh`
- `overscroll-behavior-y: none`
- `-webkit-tap-highlight-color: transparent`
- `touch-action: manipulation`
- Inputs `font-size: 16px` minimum
- Safe-area-inset on top + bottom

### 20.4 Haptics granularity

```typescript
type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const patterns: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10],
  warning: [20, 100, 20],
  error: [30, 100, 30, 100, 30],
};
```

Mapping:
- Option selection → `light`
- Next button → `medium`
- Quiz completion → `success`
- Paywall hit → `warning`
- Payment failure → `error`
- Plan reveal → `success`

### 20.5 Connection-aware

Hero video skipped if `effectiveType === 'slow-2g' || '2g'` or `saveData === true` → poster image only.
Plan reveal: icons instead of images on metered.

### 20.6 Native share

Web Share API on plan workouts + referral page. Pre-composed text per platform. Falls back to clipboard with toast.

### 20.7 Skeleton loading

`loading.tsx` per route. Skeleton shimmer (shadcn Skeleton) for plan grid, programme cards, day workout details.

### 20.8 Thumb-zone audit

Every primary action in bottom 40% of screen. Settings cog moves to bottom-right sheet trigger (not top-right) on quiz screens.

### 20.9 Mobile gesture education

First-time visitor to quiz screen 2: toast "Swipe → or tap Next" (2.5s). Dismisses on first swipe. `vyrek:gestures:learned` in localStorage.

### 20.10 Image strategy

Next/Image. WebP/AVIF. Mobile-first srcset (320 / 640 / 750 / 828 / 1080). `priority` on hero only. `quality={75}` default, `{60}` on `saveData`.

---

## 21. Performance + accessibility

### Performance targets
- Lighthouse Performance ≥95 (mobile + desktop)
- LCP <1.8s on 4G
- TBT <200ms
- CLS <0.05
- TTI <3.5s
- Total blocking JS <200KB gzipped on landing

### Accessibility (WCAG 2.2 AA)
- All interactive keyboard accessible
- Focus rings 2px solid accent
- All images alt text or `aria-hidden`
- All inputs labelled (above field, never placeholder-as-label)
- Skip-to-content link
- Semantic heading order
- Contrast 4.5:1 text, 3:1 UI
- VoiceOver iOS + NVDA Windows tested
- `prefers-reduced-motion` globally respected
- Form validation announced via `aria-live="polite"`
- Required fields not marked with `*` — optional fields marked "(optional)"

---

## 22. Analytics events (PostHog)

| Event | When |
|---|---|
| `landing_viewed` | Landing mount |
| `pwa_installed` | beforeinstallprompt accepted / iOS install detected |
| `quiz_started` | First question rendered |
| `quiz_question_answered` | Each Next click |
| `quiz_padding_viewed` | Padding screen mount |
| `quiz_abandoned` | No completion in 30 min |
| `quiz_resumed` | User returns via resume banner |
| `email_gate_submitted` | Email captured pre-plan |
| `plan_revealed` | Plan page mount |
| `plan_workout_expanded` | Day card tapped |
| `plan_shared` | Native share fired |
| `plan_share_url_visited` | Someone opened a shared URL |
| `paywall_clicked` | Week 2+ tab clicked |
| `pricing_viewed` | Pricing page mount |
| `checkout_started` | Stripe session created |
| `checkout_abandoned` | No completion in 1hr |
| `trial_started` | Welcome page after webhook |
| `referral_link_copied` | Copy button |
| `referral_shared` | Native share from referral page |
| `referral_code_applied` | Code validated in checkout |
| `referral_converted` | Referee converted to paid |
| `referral_bounty_paid` | BACS payout sent |
| `cancellation_started` | /account/cancel mount |
| `cancellation_retention_accepted` | Retention offer taken |
| `cancellation_completed` | Subscription cancelled |

### Funnels

- Primary: `landing_viewed → quiz_started → quiz_completed → email_gate_submitted → plan_revealed → checkout_started → trial_started`
- Referral: `referral_shared → referral_code_applied → trial_started → referral_converted → referral_bounty_paid`
- Retention: `cancellation_started → cancellation_retention_accepted` (target: 20%+)

---

## 23. Email templates (Resend + React Email)

All emails: dark bg, Geist via SVG fallback for Outlook, accent CTA button, monogram top, technical mark footer.

| Email | Trigger | Subject | Key content |
|---|---|---|---|
| Welcome | Trial started | "You're in." | Trial end date, first workout, link to plan, PWA install hint |
| Day 1 | 24hr after trial start | "Day 1." | Tomorrow's workout summary |
| Day 3 | 72hr after trial start | "Three days in." | "Most members say Day 3 is the hardest. You've got this." |
| Day 5 | 5 days after trial start | "Two days left." | Stats: sessions logged, link to plan |
| Day 6 | 1 day before charge | "Tomorrow: £14.99." | Honest reminder. Easy cancel link. **+ Week 2 teaser image (3 workouts blurred names)** |
| Trial converted | First paid invoice | "Welcome. Here's your Week 2." | Unlocked, plan link, share referral link |
| Payment failed | invoice.payment_failed | "Payment didn't go through." | Stripe customer portal link |
| Cancellation | Subscription deleted | "Subscription ended." | Confirm end date, winback hint, exit feedback link |
| Winback | 30 days post-cancel | "We've changed since you left." | Re-engagement, 50% off first month |
| Referral bounty | Referee converts | "£20 on its way." | Bounty details, BACS payment ref, link to refer more |
| Abandoned plan | 1hr after email gate, no checkout | "Your plan is saved." | Direct link to /plan with same UUID |
| Waitlist welcome | Pre-launch | "You're on the list." | Expected launch date, refer a friend |

Templates in `lib/email/`. Test with React Email preview + HTML Email Check before launch.

---

## 24. Pre-launch waitlist mode

`NEXT_PUBLIC_LAUNCH_MODE`:
- `waitlist` — landing only, email capture
- `live` — full site

Waitlist landing:
- Same hero, modified CTA
- Single email input + "Join waitlist"
- POST `/api/waitlist`
- Waitlist count: "Joining 1,247 athletes" (real, Supabase)
- "Founding members get 50% off first year"

Switch via Vercel env var on launch day.

---

## 25. Social proof source-of-truth

`/api/stats/active` (cached 5min):
- Returns: `{ active: number, trial: number, last_24h: number }`
- Floor: never display below 100
- Pre-launch: pull from waitlist count

Used in: section 8.3 thin bar + plan reveal "Sarah is in her Tuesday session right now" indicator.

---

## 26. SEO + structured data

Per-page `generateMetadata`. Unique title (60 char) and description (160 char) per page.

Structured data:
- Landing: Organization + WebSite + FAQPage
- Pricing: Product + Offer
- FAQ accordion: FAQPage

`app/sitemap.ts` auto-generated.

`app/robots.ts`:
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /account/
Disallow: /checkout/
Sitemap: https://vyrek.com/sitemap.xml
```

Dynamic OG image via `app/opengraph-image.tsx` (Next.js ImageResponse, edge-rendered, 1200x630).

---

## 27. Security

### Rate limiting (Upstash Redis)
- `/api/quiz` — 5/min per IP
- `/api/email-gate` — 5/min per IP
- `/api/waitlist` — 3/min per IP
- `/api/referral/validate` — 10/min per IP
- `/api/stripe/create-checkout-session` — 5/min per IP

### CSP headers (in middleware)
Allow: self, Stripe, Resend, PostHog, Sentry, Vercel. Block all other inline scripts.

### CSRF
All POST/PUT/DELETE via Next.js Server Actions (built-in CSRF) where possible.

### Webhook signature verification
All Stripe events verified via `stripe.webhooks.constructEvent`. Reject invalid 400.

### Error boundaries
Global `app/error.tsx` + per-route. Sentry captures all uncaught. Optional Discord webhook for prod errors.

---

## 28. Build order (14 days, evenings/weekends pace)

### Phase A: Foundation (Day 1)
1. `pnpm create next-app@latest vyrek --typescript --tailwind --app`
2. `npx shadcn@latest init` + components: button, input, dialog, accordion, slider, tabs, sheet, skeleton, toast, calendar
3. `globals.css` with all design tokens
4. Geist + Geist Mono via `next/font/google`
5. Logos + PWA icons + favicon + apple-touch-icon
6. PWA manifest
7. Deploy empty shell to Vercel
8. Supabase project + all tables + indexes
9. Stripe test account + product + £14.99/mo price + webhook
10. Upstash Redis project
11. Resend account + domain verification
12. PostHog + Sentry projects created
13. MCP servers installed

### Phase B: Landing (Days 2-4)
14. Section 8.1 nav
15. Section 8.2 hero with network-aware video
16. Section 8.3 social proof bar + `/api/stats/active`
17. Section 8.4 plan reveal teaser with animated phone mockup
18. Section 8.5 programmes carousel (mobile snap)
19. Section 8.6 bento features
20. Section 8.7 week in your life vignettes
21. Section 8.8 objection handling
22. Section 8.9 coach hub
23. Section 8.10 plan deep-dive
24. Section 8.11 testimonials (placeholder content)
25. Section 8.12 FAQ
26. Section 8.13 final CTA + footer
27. Cookie banner
28. Lighthouse pass — 95+ mobile before moving on

### Phase C: Quiz (Days 5-7)
29. Quiz schema + branching + entry-point optimisation
30. `useQuizState` + localStorage
31. Question shell + progress arc + preview chip
32. All input types (single, multi, slider, calendar)
33. Padding screen layouts (2 padding screens)
34. `useVisualViewport` for keyboard handling
35. `useHaptics` integration
36. Gesture hint toast
37. View Transitions API between steps
38. Sound toggle persisted
39. Resume banner on landing for abandoned quizzes
40. Mobile flow tested end-to-end on real device

### Phase D: Email gate + cinematic + plan (Days 8-10)
41. Email gate page with `useVisualViewport`
42. `/api/email-gate` route
43. Abandoned-plan email scheduling
44. Calculating cinematic with 5-line GSAP timeline
45. Easter egg (sub-65 path)
46. Plan generator (client + server, seeded)
47. Plan reveal layout with countdown
48. Day card bottom sheet
49. Number animations on plan reveal
50. Native share integration on workouts
51. Shareable plan URL route + view
52. Paywall overlay (server-enforced)

### Phase E: Checkout + welcome + referral (Days 11-12)
53. `/checkout` page (skip step 1, straight to Stripe)
54. `/api/stripe/create-checkout-session`
55. Stripe webhook handler (all events)
56. Welcome page with PWA install prompt
57. All 11 Resend email templates
58. Account overview page
59. Referral page with native share + BACS form
60. `/api/referral/*` routes (validate, generate, claim)
61. Cancellation flow with retention
62. `/api/stripe/create-portal-session`

### Phase F: Legal + polish + ship (Days 13-14)
63. Privacy, Terms, Cookies, Refunds pages
64. Cookie banner enforcement (PostHog + Sentry gated by consent)
65. Pricing page
66. Error pages (404, 500)
67. Rate limiting on all API routes
68. CSP headers
69. SEO meta + structured data + sitemap + dynamic OG
70. Cross-browser test (Safari iOS, Chrome Android, Chrome desktop, Safari desktop, Firefox)
71. Cross-device test (iPhone SE, iPhone 15, iPad, Android phone, Android tablet, desktop)
72. Accessibility audit (axe-core + manual + VoiceOver)
73. Lighthouse final pass every page
74. Real content swap (replace Lorem)
75. Pre-launch checklist

---

## 29. Definition of done

Per page:
- [ ] Lighthouse Performance ≥95 mobile + desktop
- [ ] Lighthouse Accessibility = 100
- [ ] Lighthouse Best Practices = 100
- [ ] No console errors
- [ ] No TypeScript errors (strict)
- [ ] Works keyboard-only
- [ ] Works with JS disabled (graceful)
- [ ] Tested iPhone Safari + Android Chrome
- [ ] PWA install works (Android native, iOS instructions)
- [ ] Inputs prevent iOS zoom (16px min)
- [ ] Sticky CTAs above keyboard
- [ ] Safe-area-inset applied
- [ ] No CLS
- [ ] PostHog events firing

Whole project:
- [ ] Stripe test card completes trial signup end-to-end
- [ ] Webhook fires, stores subscription
- [ ] All 11 emails arrive correctly
- [ ] Referral code applies → 7-day trial works → £20 bounty record created on conversion
- [ ] Cancellation flow + retention + winback email
- [ ] Quiz state survives refresh
- [ ] Resume banner appears for abandoned quizzes
- [ ] Paywall unbreakable via dev tools
- [ ] Plan share URL accessible publicly
- [ ] All legal pages live + cookie banner enforces consent
- [ ] Rate limiting blocks abuse
- [ ] Sentry captures errors
- [ ] PWA installs on Android (real device test)

---

## 30. Out of scope

- Workout dashboard / training log
- Coach messaging / WhatsApp
- Video form-check upload
- Weeks 2-12 generator (server stub returns Week 1 again until Phase 2)
- iOS app
- RevenueCat
- Custom CMS
- Blog
- Community forum
- Multi-language
- BACS payout automation (manual monthly until volume justifies Stripe Connect)

---

## 31. When stuck

- Library docs → Context7 MCP
- Visual testing → Playwright MCP (mobile viewport first)
- Performance → Chrome DevTools MCP
- Stripe → Stripe MCP
- Components → shadcn MCP

If ambiguous: build simpler version, ship, iterate.

---

**End of brief v3. This is the final brief. Paste into Claude Code and begin Phase A.**
