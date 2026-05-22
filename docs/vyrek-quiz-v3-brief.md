# Vyrek — Quiz V3 brief: Final Marchon-Runna Hybrid Architecture

**Paste this entire document into Claude Code Terminal. Replaces the Quiz V2 from Phase B2 Part 3.**

## Context

Quiz V2 was a good first attempt but introduced auto-advance based on a misread of Runna's actual onboarding. We've now verified both Marchon (live fetch) and Runna (third-party teardown) and confirmed: **both use Continue buttons on every screen, not auto-advance.** This V3 brief corrects that and tightens the design to combine Marchon's proven structure with Runna's proven polish.

This is the final quiz architecture. Don't re-architect after this — iterate within the structure.

---

## Architecture principles (non-negotiable)

1. **Continue button on every screen.** No auto-advance. Matches what both Marchon and Runna actually do. Familiar pattern, lower risk for our stage (can't A/B test yet).

2. **Padding screens between question clusters.** Marchon-verified pattern. Reduces drop-off. Two interstitials in our flow at moments of friction.

3. **Imagery throughout, not just in padding.** Runna-verified. Each option card can have an icon. Interstitials are full-bleed photo.

4. **Pre-paywall plan summary.** Runna-verified conversion lift. Proves the app listened.

5. **Real plan reveal as the moat.** What neither Marchon nor Runna do. Week 1 dated and visible before payment. Weeks 2-12 paywalled.

6. **Account creation BEFORE Stripe paywall.** User explicitly requested Marchon-style email + password capture. Placed at screen 14, between plan summary and calculating cinematic.

7. **PostHog tracking on every screen transition.** Drop-off analysis is essential — we need to know where people quit so we can fix it.

---

## The 14-screen flow

### Screen 1 — Welcome carousel

**Type:** 3-slide auto-advancing carousel (Instagram story style), 4 seconds per slide, swipeable, tap to skip to next slide.

**This is the ONLY screen with auto-advance** (the carousel slides advance themselves; the user is not "answering" anything).

**Slides:**

```
SLIDE 1
Full-bleed image: /media/images/programme-first-race.jpg (runner on track)
Top progress: [▓▓▓] [    ] [    ]
Headline (overlaid bottom): "Hyrox training, personalised."

SLIDE 2
Full-bleed image: weekly plan mockup OR /media/images/bento-plan.jpg
Top progress: [▓▓▓] [▓▓▓] [    ]
Headline: "Every workout, dated and ready."

SLIDE 3
Full-bleed image: /media/images/bento-progress.jpg (or finish-line celebration)
Top progress: [▓▓▓] [▓▓▓] [▓▓▓]
Headline: "Built to get you to the line."
```

**Bottom CTA:** "Find your plan →" (full-width, 56px tall, accent background)
**Skip option:** small "Skip" button bottom-right corner (opacity 0.55)

After CTA tap or end of carousel: route to Screen 2.

---

### Screen 2 — Primary intent (multi-select, 1-2 options)

Marchon-style — multi-select Q1. Lets user pick 1-2 intents for smarter routing.

**Top bar:** "← back" left, progress "[01 / 13]" centre, "✕" close right (close routes to / with confirm if any answers given)
**Progress bar:** 2px slim line, fills accent, currently 1/13 = ~8% filled

```
What brings you to Vyrek?

Select 1-2 answers

┌──────────────────────────────────────┐
│ 🏁  Training for my first Hyrox      │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ ⚡  Done a Hyrox, want to go faster  │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ 👥  Training with a partner (Doubles)│
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ 🌱  Getting into Hyrox-style training│
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ 💪  Building general Hyrox fitness   │
└──────────────────────────────────────┘

[ Continue → ]  (disabled until 1+ selected, max 2)
```

**Selection visual:** tap toggles selected state. Selected card has accent border (2px) + accent dot top-right. Tap second card = adds. Tap third = replaces oldest selected.

**Routing logic:**
- "first" + "getting-into" → first-race-path
- "go-faster" → sub-90-path (refined at screen 4)
- "doubles" → doubles-path (always wins if selected)
- "building" alone → first-race-path

---

### Screen 3 — Reassurance interstitial #1 (padding)

**Type:** Full-bleed photo, overlay text, single Continue button at bottom.

```
Full-bleed image: /media/images/coach-james-wright.jpg
(or another moody portrait — cold-breath athlete from Drive)
Dark gradient overlay bottom 60%

[overlay text, centred lower third]

★★★★★
"Vyrek got me to my first Hyrox finish feeling fresh.
92 minutes when I'd planned for 105."
Sarah · Bristol

────

92% of first-time Vyrek members finish their Hyrox
stronger than they expected.

[ VYREK MEMBER DATA · 2026 ]
```

**Bottom CTA:** "Continue →"

This is the Marchon-style padding screen but Vyrek-themed. One testimonial + one stat. No skip option — they tap Continue.

---

### Screen 4 — Hyrox experience (single-select)

```
Have you raced a Hyrox before?

Pick one

┌──────────────────────────────────────┐
│ Never raced                          │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Signed up, not raced yet             │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Raced once or twice                  │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Raced multiple times                 │
└──────────────────────────────────────┘

[ Continue → ]  (disabled until selected)
```

**Routing influence:** if "Never raced" or "Signed up" → confirm first-race-path. If "Raced" → enable Screen 5 (best time). Otherwise skip Screen 5.

---

### Screen 5 — Best time (conditional, single-select)

**Show only if** Screen 4 = "Raced once/twice" or "Raced multiple times"

```
What's your best Hyrox time?

We'll calibrate your plan to match.

┌──────────────────────────────────────┐
│ Under 75 min                         │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ 75 to 90 min                         │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ 90 to 105 min                        │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Over 105 min                         │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ I don't remember                     │
└──────────────────────────────────────┘

[ Continue → ]
```

**Routing:**
- "Under 75 min" → pro-path
- "75 to 90 min" / "90 to 105 min" / "Over 105 min" / "I don't remember" → sub-90-path

---

### Screen 6 — Race date (calendar or skip)

```
Got a race booked?

We'll build the plan around the date.
Or skip and we'll suggest one.

┌──────────────────────────────────────┐
│  [shadcn Calendar component]         │
│                                      │
│  May 2026                            │
│  Mo Tu We Th Fr Sa Su                │
│  ...                                 │
└──────────────────────────────────────┘

[ No race booked →]   [ Continue → ]
```

**On mobile:** calendar opens in bottom sheet on tap. "Continue" disabled until date picked OR "No race booked" tapped.

**If date picked:** calculate `weeksUntilRace` for use in summary.
**If "No race booked" tapped:** skip to Screen 7 (don't show race suggestion screen — keeps flow tight; we suggest a race later in the welcome email instead).

---

### Screen 7 — Padding interstitial #2

**Type:** Full-bleed photo + lifestyle photo grid below + Continue button.

This is the second Marchon-style padding. Different feel from Screen 3.

```
Image-led layout:

[Headline text, top]
"Give us 4 sessions a week.
We'll give you Hyrox-ready fitness in 12 weeks."

[ 12-WEEK FIRST RACE PROGRAMME ]

[3-photo grid below, varied sizes]
- /media/images/bento-plan.jpg
- /media/images/programme-doubles.jpg
- /media/images/quiz-interstitial-1.jpg

[Body text, brief]
You don't need more hours in the gym.
You need better programming — where every block
has a purpose, and every session builds on the last.

[ Continue → ]
```

---

### Screen 8 — Activity baseline (single-select) — RUNNA-INSPIRED

Runna's approach — ask activity level, not technical pace. Calibrates intensity in Week 1.

```
How active are you right now?

Be honest. We'll start where you are.

┌──────────────────────────────────────┐
│ Training 5+ days a week              │
│ Athletic. Used to high volume.       │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Training 3-4 days a week             │
│ Regular. Solid base.                 │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Training 1-2 days a week             │
│ Occasional. Building back.           │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Just getting back into it            │
│ Returning after a break.             │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Brand new to training                │
│ Start from scratch.                  │
└──────────────────────────────────────┘

[ Continue → ]
```

---

### Screen 9 — Training frequency (single-select)

```
How many days a week can you train?

Most members train 4 days. Pick what you'll actually do.

┌──────────────────────────────────────┐
│ 3 days                               │
│ Minimum effective dose.              │
│ Race-ready in 16 weeks.              │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ 4 days  [ RECOMMENDED ]              │
│ Best balance of progress and recovery│
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ 5 days                               │
│ Faster progress.                     │
│ Higher recovery demand.              │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ 6 days                               │
│ Advanced volume.                     │
│ Used to high load.                   │
└──────────────────────────────────────┘

[ Continue → ]
```

---

### Screen 10 — Session length (single-select)

```
How long can your sessions be?

We'll build workouts that fit your time.

┌──────────────────────────────────────┐
│ 30 min                               │
│ Tight schedule.                      │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ 45 min                               │
│ Standard.                            │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ 60 min  [ RECOMMENDED ]              │
│ Covers warm-up + main + cool-down.   │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ 90 min or more                       │
│ Big block training.                  │
└──────────────────────────────────────┘

[ Continue → ]
```

---

### Screen 11 — Training location (single-select) + conditional equipment

```
Where will you train?

We'll adapt your plan to your space and kit.

┌──────────────────────────────────────┐
│ Full Hyrox gym                       │
│ Sled, ski erg, rower, wall balls     │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Standard commercial gym              │
│ Dumbbells, barbells, machines        │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Home setup                           │
│ Limited or specialised kit           │
└──────────────────────────────────────┘

[ Continue → ]
```

**If "Home setup" picked:** Continue routes to Screen 11b (Equipment multi-select).
**Otherwise:** Continue routes to Screen 12.

---

### Screen 11b — Home equipment (conditional, multi-select)

**Show only if** Screen 11 = "Home setup"

```
What kit do you have at home?

Pick everything you've got. We'll use what we can.

[ Dumbbells ]    [ Kettlebell ]   [ Rower ]
[ Ski erg ]      [ Sled ]         [ Sandbag ]
[ Wall ball ]    [ Pull-up bar ]  [ Bodyweight only ]

[ Continue → ]   (disabled until 1+ selected)
```

Multi-select chips. Tap toggles. Selected chips have accent border + filled accent background.

---

### Screen 12 — Solo or doubles (conditional)

**Skip if** Screen 2 included "doubles" (already routed)

```
Training solo or with a partner?

┌──────────────────────────────────────┐
│ Solo                                 │
│ Just me                              │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Doubles                              │
│ Training with a partner              │
└──────────────────────────────────────┘

[ Continue → ]
```

If "Doubles" → re-route to doubles-path (overrides any earlier path).

---

### Screen 13 — Injuries (single-select) — RUNNA INSPIRATION

The "we've got you" moment. Acknowledges injuries instead of ignoring them.

```
Any injuries we should plan around?

We'll adjust the plan to protect what needs protecting.

┌──────────────────────────────────────┐
│ No injuries, all clear               │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Lower back                           │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Knee                                 │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Shoulder                             │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Achilles or calf                     │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Other — I'll note in the app later   │
└──────────────────────────────────────┘

[ Continue → ]
```

---

### Screen 14 — Plan summary (NOT a question — review screen)

**Type:** Confirmation screen. Runna-style pre-paywall value summary.

```
[ YOUR PLAN ]

FIRST RACE PROGRAMME

12 weeks
4 sessions per week
60 min sessions
Standard commercial gym
Solo
No injuries

────────────────

Starting Tuesday 28 May 2026
Race-ready: Saturday 19 August 2026
14 weeks to your race

────────────────

[ Save my plan → ]
```

**Date logic:**
- `startDate` = next Tuesday from today
- `raceDate` = user's race date if provided, OR startDate + 84 days
- Use `date-fns` for date math

Display dynamically based on actual user answers. If user picked "5 days" + "45 min" + "Full Hyrox gym" + "Doubles" + "Knee injury", the summary reflects that.

---

### Screen 15 — Account creation (email + password)

User explicitly requested Marchon-style email + password capture. Placed before paywall.

```
Save your plan

Create an account so you can pick this up anytime.

┌──────────────────────────────────────┐
│ Email                                │
│ you@email.com                        │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Password (8+ characters)             │
│ ••••••••                             │
└──────────────────────────────────────┘

☐  Email me Vyrek updates (optional)

[ See my plan → ]

We won't spam.
Unsubscribe anytime.
```

**On submit:**

1. Validate email format
2. Validate password (8+ chars minimum)
3. Create user in Supabase Auth via `supabase.auth.signUp({ email, password })`
4. Create customer record in `customers` table linked to auth user ID
5. Save quiz answers to `quiz_responses` table
6. Generate referral code (8 chars, alphanumeric, no look-alikes)
7. Schedule abandoned-plan email for +1 hour via Resend if no checkout completion
8. Route to Screen 16 (calculating cinematic)

**Error handling:**
- Duplicate email: "An account already exists with this email. Log in instead?" with link to /login
- Weak password: "Password must be 8+ characters"
- Network error: "Couldn't save. Try again in a moment."

**Password input:** font-size 16px (prevents iOS zoom), show/hide toggle button on right side of field.

**Top bar progress:** [13 / 13] — this is the final visible screen before the cinematic.

---

### Screen 16 — Calculating cinematic (transitional, 3.5s)

Already spec'd. Five lines:
- 0.0s: "Analysing your answers..."
- 0.7s: "Cross-referencing 47 First Race programmes..."
- 1.4s: "Matching your equipment to 12 workout templates..."
- 2.1s: "Calibrating to your race in 14 weeks..."
- 2.8s: "Your Week 1 is ready."
- 3.2s: Soft swoosh sound + dot expands
- 3.5s: Auto-route to /plan

Use user's actual data in the lines (programme name, race weeks, equipment count).

Routes to /plan.

---

## Common path lengths

- **First Race, no race date, gym-standard, solo, no injuries:** 12 screens (skips 5, 11b, 12)
- **Go-faster, race booked, full Hyrox gym, doubles, knee injury:** 14 screens (skips 11b)
- **First Race, race booked, home setup with 5 kit items, solo, no injuries:** 14 screens (includes 11b)

**Estimated completion time:** 2-3 minutes (matches Marchon — neither too short to feel cheap nor too long to lose people).

---

## UX rules — apply consistently

### Top bar (every screen, 56px height, safe-area-inset-top)

- **Left:** ← back arrow (48x48px tap target) — goes to previous screen
- **Centre:** progress bar (2px slim, fills accent over 320ms ease-out as user advances) + "[X / 13]" counter mono
- **Right:** ✕ close icon (48x48px tap target) — routes to / with confirm modal: "Leave quiz? Your progress is saved."

### Bottom bar (every screen, 80px height, safe-area-inset-bottom, sticky)

- **Continue button:** 56px tall, accent background, full-width minus 24px side padding
- Disabled state: opacity 0.4, no haptic on tap, doesn't advance
- Enabled state: full opacity, medium haptic on tap, advances

### Page transitions

- View Transitions API
- Forward: slide left 24px + fade out / slide in from right + fade in
- Back: slide right 24px + fade out / slide in from left + fade in
- Duration: 320ms, ease-out

### Haptics

- Tap option card: light
- Tap Continue button: medium
- Reach plan summary (Screen 14): success pattern
- Submit account (Screen 15): success pattern
- Try to Continue with no selection: warning pattern + shake the disabled button

### Auto-save state

- After every Continue tap, save full state to localStorage as `vyrek:quiz:v3:state`
- Resume banner on home page: "You're on question 7 of 13. Resume your quiz →"
- Resume jumps directly to the saved screen, no re-asking

### URL pre-fill

- `/quiz?intent=first-hyrox` — pre-selects Screen 2 option, doesn't skip the screen (user still confirms)
- `/quiz?intent=go-faster` — same pattern
- `/quiz?intent=doubles` — same pattern

### Validation

- Continue button disabled until requirements met
- Subtle inline hint below options if user taps disabled Continue: "Pick one to continue" (300ms fade in, fades out on next interaction)
- No alerts, no error pages

---

## Smart routing logic (`lib/quiz-flow.ts`)

```typescript
type QuizAnswers = {
  intent: ('first-hyrox' | 'go-faster' | 'doubles' | 'getting-into' | 'building')[];
  experience: 'never' | 'signed-up' | 'raced-few' | 'raced-many';
  bestTime?: 'under-75' | '75-90' | '90-105' | 'over-105' | 'unknown';
  raceDate?: Date;
  activity: 'athletic' | 'regular' | 'occasional' | 'returning' | 'beginner';
  days: 3 | 4 | 5 | 6;
  sessionLength: '30' | '45' | '60' | '90';
  location: 'gym-full' | 'gym-standard' | 'home';
  equipment?: string[];
  partner: 'solo' | 'doubles';
  injuries: 'none' | 'lower-back' | 'knee' | 'shoulder' | 'achilles-calf' | 'other';
};

type Programme = 'first-race' | 'sub-90' | 'doubles' | 'pro';

export function determineProgramme(answers: QuizAnswers): Programme {
  // Doubles always wins if explicitly chosen
  if (answers.intent.includes('doubles') || answers.partner === 'doubles') {
    return 'doubles';
  }

  // First Race for explicit beginners
  if (
    answers.intent.includes('first-hyrox') ||
    answers.intent.includes('getting-into') ||
    answers.experience === 'never' ||
    answers.experience === 'signed-up'
  ) {
    return 'first-race';
  }

  // Pro for sub-75 finishers
  if (
    answers.intent.includes('go-faster') &&
    answers.bestTime === 'under-75'
  ) {
    return 'pro';
  }

  // Sub-90 for everyone else trying to go faster
  if (answers.intent.includes('go-faster')) {
    return 'sub-90';
  }

  // Conservative fallback
  return 'first-race';
}

export function determineStartDate(today: Date = new Date()): Date {
  const daysUntilTuesday = (2 - today.getDay() + 7) % 7 || 7;
  const tuesday = new Date(today);
  tuesday.setDate(today.getDate() + daysUntilTuesday);
  tuesday.setHours(0, 0, 0, 0);
  return tuesday;
}

export function determineRaceDate(
  startDate: Date,
  userRaceDate?: Date,
  weeks = 12
): Date {
  if (userRaceDate) return userRaceDate;
  const raceDate = new Date(startDate);
  raceDate.setDate(startDate.getDate() + weeks * 7);
  return raceDate;
}

export function calculateWeeksUntilRace(raceDate: Date, today: Date = new Date()): number {
  const ms = raceDate.getTime() - today.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24 * 7)));
}
```

---

## PostHog tracking events

Fire these events on every screen transition. This powers the drop-off analysis.

```typescript
// On every screen mount
posthog.capture('quiz_screen_viewed', {
  screen_id: 'primary_intent',
  screen_number: 2,
  total_screens: 13,
  programme_path: state.path,
  user_uuid: state.uuid,
  is_resumed: state.resumed,
  timestamp: Date.now(),
});

// On Continue tap (answer captured)
posthog.capture('quiz_screen_answered', {
  screen_id: 'primary_intent',
  screen_number: 2,
  answer: state.answers.intent, // array for multi-select
  time_on_screen_ms: Date.now() - screenMountTime,
  total_screens: 13,
  user_uuid: state.uuid,
});

// On back navigation
posthog.capture('quiz_screen_back', {
  screen_id: 'primary_intent',
  screen_number: 2,
  user_uuid: state.uuid,
});

// On abandonment (tab closed, navigated away, X clicked)
// Fire via beforeunload + visibilitychange listeners
posthog.capture('quiz_abandoned', {
  screen_id: 'race_date',
  screen_number: 6,
  total_screens: 13,
  time_on_screen_ms: 18000,
  user_uuid: state.uuid,
  abandonment_method: 'tab_closed' | 'navigated_away' | 'x_clicked',
});

// On full completion (account created at screen 15)
posthog.capture('quiz_completed', {
  programme: 'first-race',
  total_time_ms: 142000,
  screens_seen: 13,
  user_uuid: state.uuid,
  has_race_date: true,
  has_injury: false,
});

// On account creation success
posthog.capture('account_created', {
  user_uuid: state.uuid,
  email_marketing_opt_in: true,
  programme: 'first-race',
});
```

These give you a funnel visualisation in PostHog showing exactly which screen each user drops off at.

---

## File structure

Build into `components/quiz-v3/` (new directory — keeps V2 around as fallback until V3 is verified live):

```
components/quiz-v3/
├── quiz-shell.tsx              # Top bar + progress + bottom bar + transitions
├── screens/
│   ├── welcome-carousel.tsx    # Screen 1
│   ├── primary-intent.tsx      # Screen 2 (multi-select 1-2)
│   ├── reassurance-1.tsx       # Screen 3 (padding)
│   ├── experience.tsx          # Screen 4
│   ├── best-time.tsx           # Screen 5 (conditional)
│   ├── race-date.tsx           # Screen 6
│   ├── reassurance-2.tsx       # Screen 7 (padding)
│   ├── activity-baseline.tsx   # Screen 8
│   ├── frequency.tsx           # Screen 9
│   ├── session-length.tsx      # Screen 10
│   ├── location.tsx            # Screen 11
│   ├── equipment.tsx           # Screen 11b (conditional)
│   ├── partner.tsx             # Screen 12 (conditional)
│   ├── injuries.tsx            # Screen 13
│   ├── plan-summary.tsx        # Screen 14
│   ├── account-creation.tsx    # Screen 15
│   └── calculating.tsx         # Screen 16
├── components/
│   ├── option-card.tsx         # Single-select option card
│   ├── multi-select-chip.tsx   # Multi-select chip
│   ├── carousel-slide.tsx      # Carousel slide
│   ├── interstitial.tsx        # Padding screen wrapper
│   ├── progress-bar.tsx        # Top progress
│   ├── continue-button.tsx     # Bottom CTA
│   └── close-confirm.tsx       # X icon with confirm modal
└── hooks/
    ├── use-quiz-state-v3.ts    # State + localStorage persistence
    ├── use-screen-timer.ts     # Time on screen for analytics
    └── use-abandonment.ts      # beforeunload + visibilitychange handlers

lib/
└── quiz-flow.ts                # Routing logic + date helpers (replaces v2)

app/quiz/
└── page.tsx                    # Routes to QuizShell with V3 screens
```

---

## Account creation — Supabase Auth setup

This is new vs V2. Need to add Supabase Auth integration.

### Supabase setup (you the user need to do these in Supabase dashboard)

1. Go to Authentication → Providers
2. Enable Email provider
3. Disable "Confirm email" for now (Phase 1 — we'll add email verification in Phase 2)
4. Email templates: leave defaults for now

### Code setup (Claude Code does these)

1. Install `@supabase/ssr` if not already: `pnpm add @supabase/ssr`
2. Add server client wrapper if not exists: `lib/supabase/server.ts`
3. Add browser client wrapper if not exists: `lib/supabase/browser.ts`
4. Update `customers` table schema if needed — add `auth_user_id uuid references auth.users(id)` column

### Account creation flow in Screen 15

```typescript
async function createAccount(email: string, password: string, marketingOptIn: boolean) {
  const supabase = createBrowserClient();

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    if (authError.message.includes('already')) {
      return { error: 'EMAIL_EXISTS', redirectTo: '/login' };
    }
    return { error: 'AUTH_ERROR', message: authError.message };
  }

  // 2. POST to /api/account/create — server creates customer record
  const res = await fetch('/api/account/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      authUserId: authData.user!.id,
      email,
      marketingOptIn,
      quizState: getQuizState(),
    }),
  });

  if (!res.ok) {
    return { error: 'SAVE_ERROR' };
  }

  return { success: true, customerId: (await res.json()).customerId };
}
```

### New API route — `/api/account/create`

```typescript
// app/api/account/create/route.ts
import { supabaseAdmin } from '@/lib/supabase/admin';
import { determineProgramme, determineStartDate, determineRaceDate } from '@/lib/quiz-flow';
import { generateReferralCode } from '@/lib/referral';
import { scheduleAbandonedPlanEmail } from '@/lib/email/abandoned-plan';

export async function POST(req: Request) {
  const { authUserId, email, marketingOptIn, quizState } = await req.json();

  // Validate
  if (!authUserId || !email || !quizState) {
    return Response.json({ error: 'MISSING_FIELDS' }, { status: 400 });
  }

  const programme = determineProgramme(quizState.answers);
  const startDate = determineStartDate();
  const raceDate = determineRaceDate(startDate, quizState.answers.raceDate);
  const referralCode = generateReferralCode();

  // Create customer
  const { data: customer, error: customerError } = await supabaseAdmin()
    .from('customers')
    .insert({
      auth_user_id: authUserId,
      email,
      referral_code: referralCode,
      marketing_opt_in: marketingOptIn,
    })
    .select()
    .single();

  if (customerError) {
    return Response.json({ error: 'CUSTOMER_CREATE_FAILED', detail: customerError.message }, { status: 500 });
  }

  // Save quiz response
  await supabaseAdmin()
    .from('quiz_responses')
    .insert({
      customer_id: customer.id,
      email,
      answers: quizState.answers,
      program: programme,
      path: programme,
    });

  // Schedule abandoned-plan email for +1hr
  await scheduleAbandonedPlanEmail({
    customerId: customer.id,
    email,
    programme,
    scheduledFor: new Date(Date.now() + 60 * 60 * 1000),
  });

  return Response.json({
    ok: true,
    customerId: customer.id,
    programme,
    startDate: startDate.toISOString(),
    raceDate: raceDate.toISOString(),
    referralCode,
  });
}
```

---

## Migration from V2

1. Build V3 in parallel — don't delete V2
2. Keep V2 reachable at `/quiz/v2` (rename current route, hidden)
3. Make V3 the new `/quiz` route
4. Once V3 is verified live and converting, delete V2 in a follow-up cleanup

This protects against rollback need.

---

## Execution rules

1. **Build the full 14-screen flow before deploying.** This is a coherent rewrite, not a piecemeal build. Smaller deploys risk inconsistent UX between deployed and undeployed screens.

2. **Trainer's Notebook voice everywhere.** Direct, lowercase nav, no exclamation marks. Match existing copy patterns.

3. **Mobile-first.** Every screen designed at 390px first. Test at 375 / 390 / 414.

4. **Lighthouse must not regress.** Quiz pages must hit 95+ mobile Performance.

5. **All PostHog events fire.** Drop-off tracking is non-negotiable — we need this data immediately.

6. **Real images from /media/images/** — no placeholders.

7. **Test end-to-end before reporting done.** Walk through the full happy path (first-race) and the longest path (doubles + home equipment + injury). Verify account creation persists, customer + quiz_responses + abandoned_plans rows created.

8. **Deploy to vyrek.vercel.app via `vercel --yes --prod` when complete.**

---

## Reporting requirements when done

Tell me:
- Screens-in-most-common-path number
- Estimated completion time (test in Chrome DevTools mobile mode)
- Lighthouse scores per screen (sample: welcome, primary-intent, interstitial-1, plan-summary, account-creation)
- Confirmation of PostHog events firing (sample: copy 3-4 event payloads)
- End-to-end test result: customer created + quiz saved + abandoned plan scheduled
- Outstanding for me to do: PostHog dashboard setup, Supabase email confirmation toggle, anything else

Start now.
