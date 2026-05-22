# Vyrek — Quiz V3 ADDENDUM (3 updates to add to the main V3 brief)

**Paste this into Claude Code Terminal AFTER pasting the main V3 brief. This adds 3 small updates.**

You've now got 15 screens total instead of 14. The flow becomes:

1. Welcome carousel
2. Primary intent (multi-select)
3. Reassurance interstitial #1
4. Experience
5. Best time (conditional)
6. Race date
7. Reassurance interstitial #2
8. Activity baseline
**8b. Calibration (NEW)**
9. Frequency
10. Session length
11. Location
11b. Equipment (conditional)
12. Partner (UPDATED — adds 3rd option)
13. Injuries
14. Plan summary (UPDATED — animated reveal)
15. Account creation

---

## UPDATE 1 — New Screen 8b: Calibration

Insert between Screen 8 (Activity baseline) and Screen 9 (Frequency).

### Screen layout

```
Quick calibration

We use this to set the right weights for sled,
wall ball, and farmers carries.

Hyrox standards:
┌──────────────────────────────┐
│ Men's standards              │
│ Sled 152kg · Wall ball 9kg   │
└──────────────────────────────┘
┌──────────────────────────────┐
│ Women's standards            │
│ Sled 102kg · Wall ball 6kg   │
└──────────────────────────────┘

────────────────

Your body weight (for sled load calculations):

[ 75 ]    [ kg ▼ ]
                 │
                 ├── kg (default)
                 └── lb

[ Continue → ]
```

### Specs

**Sex/standards selector:**
- Single-select, two options
- Tap = selected state (accent border, accent dot top-right)
- Copy explicitly references the Hyrox race standards (the weights). This frames it as a calibration question, not a demographic question.

**Weight input:**
- Number input, type="number", inputMode="decimal"
- Font-size 16px to prevent iOS zoom
- Validation: 30-200 (kg) or 65-440 (lb) — anything outside is clearly wrong
- Default value: 75 (kg) — feels like a reasonable starting point

**Unit toggle:**
- Dropdown or pill toggle on the right of the input
- Default to `kg` (UK locale)
- Stores both raw value and unit in state
- Conversion: weight_kg = unit === 'kg' ? value : value / 2.20462

**Continue button:**
- Disabled until: sex selected AND weight entered (numeric, in valid range)
- Enabled: accent background, medium haptic on tap

### State shape

Add to `QuizAnswers` in `lib/quiz-flow.ts`:

```typescript
type QuizAnswers = {
  // ... existing fields ...
  sex: 'men' | 'women';
  weight: number;          // always stored in kg internally
  weightUnit: 'kg' | 'lb'; // user's preference, applied to display
};
```

### Plan generator impact

When generating Week 1 workouts, use the calibration data:

```typescript
// In lib/plan-generator.ts

function getStationLoad(stationType: string, answers: QuizAnswers): { weight: number, unit: string } {
  const isMens = answers.sex === 'men';
  const bodyWeight = answers.weight; // kg

  switch (stationType) {
    case 'sled-push':
      // Hyrox: 152kg M / 102kg W. Training load = race weight × % based on experience.
      return {
        weight: isMens ? 152 : 102,
        unit: 'kg',
      };
    case 'wall-ball':
      return {
        weight: isMens ? 9 : 6,
        unit: 'kg',
      };
    case 'farmers-carry':
      return {
        weight: isMens ? 24 : 16,
        unit: 'kg',
      };
    case 'sandbag-lunge':
      // % of body weight for safety
      return {
        weight: Math.round(bodyWeight * (isMens ? 0.3 : 0.25)),
        unit: 'kg',
      };
    // ... etc
  }
}
```

### Display unit conversion

When showing weights in workout cards, convert to user's preferred unit:

```typescript
function displayWeight(weightKg: number, unit: 'kg' | 'lb'): string {
  if (unit === 'lb') {
    const lb = Math.round(weightKg * 2.20462);
    return `${lb} lb`;
  }
  return `${weightKg} kg`;
}
```

### PostHog event

```typescript
posthog.capture('quiz_screen_answered', {
  screen_id: 'calibration',
  screen_number: 8.5,
  answer: { sex: 'men', weight: 75, weightUnit: 'kg' },
  // ... standard fields
});
```

---

## UPDATE 2 — Modified Screen 12: Partner

Replace the existing Screen 12 with this updated 3-option version.

### Screen layout

```
Training solo or with a partner?

┌──────────────────────────────────────┐
│ Solo                                 │
│ Just me                              │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Doubles — partner confirmed          │
│ Training together                    │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Solo for now, partner later          │
│ Switch when partner joins            │
└──────────────────────────────────────┘

[ Continue → ]
```

### Specs

- Single-select, 3 options
- Each option card has a primary line (bold) and secondary line (text-secondary)
- Selected state: accent border + accent dot
- Continue button disabled until selection made

### State + routing impact

Update `QuizAnswers` type:

```typescript
type QuizAnswers = {
  // ... existing fields ...
  partner: 'solo' | 'doubles' | 'solo-partner-later';
};
```

Update `determineProgramme` in `lib/quiz-flow.ts`:

```typescript
export function determineProgramme(answers: QuizAnswers): Programme {
  // Doubles confirmed always wins
  if (answers.intent.includes('doubles') || answers.partner === 'doubles') {
    return 'doubles';
  }

  // "Solo for now, partner later" routes to solo path (not doubles)
  // but flags the upgrade interest for future emails
  // — handled in account creation, not here

  // ... rest of routing unchanged
}
```

### Marketing flag for "solo-partner-later"

When this option is selected, set a flag on the customer record:

```typescript
// In /api/account/create
await supabaseAdmin()
  .from('customers')
  .insert({
    // ... existing fields ...
    doubles_upgrade_interest: answers.partner === 'solo-partner-later',
  });
```

Add column to `customers` table:

```sql
alter table customers
  add column doubles_upgrade_interest boolean default false;
```

This flag triggers a "Ready to switch to Doubles?" email at day 14 of trial, asking if their partner joined. Conversion + retention play.

### PostHog event

```typescript
posthog.capture('quiz_screen_answered', {
  screen_id: 'partner',
  screen_number: 12,
  answer: 'solo-partner-later', // or 'solo' or 'doubles'
  // ... standard fields
});
```

---

## UPDATE 3 — Animated Screen 14: Plan summary

Replace the existing Screen 14 layout with this animated version. Content stays the same — animation is added.

### Sequence (GSAP timeline, ~2.2s total)

```
Time:  Element fading in:
0.0s   [ YOUR PLAN ]                   eyebrow, mono
0.2s   FIRST RACE PROGRAMME            title, text-2xl weight 900
0.4s   12 weeks                        first stat line
0.6s   4 sessions per week
0.8s   60 min sessions
1.0s   Standard commercial gym
1.2s   Solo
1.4s   No injuries
1.6s   ────────────────                divider
1.8s   Starting Tuesday 28 May 2026    start date
2.0s   Race-ready: Saturday 19 Aug 2026  + "14 weeks to your race"
2.2s   [ Save my plan → ]              CTA with subtle pulse
```

### Implementation

```typescript
// In components/quiz-v3/screens/plan-summary.tsx

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export function PlanSummaryScreen({ answers, programme, startDate, raceDate }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const lines = containerRef.current.querySelectorAll('[data-summary-line]');
    const cta = containerRef.current.querySelector('[data-summary-cta]');

    // Set initial state — all hidden
    gsap.set(lines, { opacity: 0, y: 12 });
    gsap.set(cta, { opacity: 0, y: 12, scale: 0.98 });

    // Animate in
    const tl = gsap.timeline();
    tl.to(lines, {
      opacity: 1,
      y: 0,
      duration: 0.32,
      ease: 'power2.out',
      stagger: 0.2,
    });
    tl.to(cta, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.4,
      ease: 'back.out(1.2)',
    }, '-=0.1'); // overlap slightly with last line

    // Subtle pulse on CTA after reveal
    tl.to(cta, {
      scale: 1.02,
      duration: 0.6,
      ease: 'power1.inOut',
      yoyo: true,
      repeat: 1,
    }, '+=0.3');

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div ref={containerRef} className="...">
      <div data-summary-line className="text-mono text-sm opacity-55 mb-2">
        [ YOUR PLAN ]
      </div>

      <h1 data-summary-line className="text-3xl font-black mb-8">
        {programmeDisplayName(programme)} PROGRAMME
      </h1>

      <div data-summary-line>12 weeks</div>
      <div data-summary-line>{answers.days} sessions per week</div>
      <div data-summary-line>{answers.sessionLength} min sessions</div>
      <div data-summary-line>{locationLabel(answers.location)}</div>
      <div data-summary-line>{partnerLabel(answers.partner)}</div>
      <div data-summary-line>{injuriesLabel(answers.injuries)}</div>

      <div data-summary-line className="my-6 border-t border-border-default" />

      <div data-summary-line>
        Starting {formatDate(startDate, 'EEEE d MMMM yyyy')}
      </div>
      <div data-summary-line>
        Race-ready: {formatDate(raceDate, 'EEEE d MMMM yyyy')}
        <span className="block text-text-secondary text-sm mt-1">
          {weeksUntilRace} weeks to your race
        </span>
      </div>

      <button data-summary-cta className="mt-8 ...">
        Save my plan →
      </button>
    </div>
  );
}
```

### Respect reduced motion

```typescript
const prefersReducedMotion = useReducedMotion(); // existing hook

useEffect(() => {
  if (prefersReducedMotion) {
    // Show everything immediately, no animation
    gsap.set([lines, cta], { opacity: 1, y: 0, scale: 1 });
    return;
  }

  // ... animation code above
}, [prefersReducedMotion]);
```

### Why this works for conversion

- **Proves the system worked.** Static text = "they generated this 0.1s ago." Staggered reveal = "they're showing me what was decided."
- **Increases dwell time** on the summary screen. Users read each line as it appears. Better recall = better conversion.
- **Anticipation builds for the CTA.** The button being the last thing to appear focuses attention there.
- **Premium signal.** This is the kind of detail Linear and Apple use. Doesn't cost much. Lifts perceived quality.

### PostHog event addition

Track how long users spend on the summary (correlates with conversion):

```typescript
posthog.capture('quiz_screen_viewed', {
  screen_id: 'plan_summary',
  screen_number: 14,
  // ... standard fields
  animation_completed_at: Date.now() + 2200, // approx
});

// On CTA tap
posthog.capture('quiz_summary_continued', {
  time_on_summary_ms: Date.now() - mountTime,
  // useful to know if users tap before animation completes
});
```

---

## Updated common path lengths

With these 3 additions:

| Path | Screens | Time |
|---|---|---|
| First Race, no race date, gym-standard, solo, no injuries | 13 (was 12) | ~3 min |
| Go-faster, race booked, full gym, doubles, knee injury | 15 (was 14) | ~3-4 min |
| First Race, race booked, home + 5 kit items, solo-partner-later, no injuries | 15 (was 14) | ~3-4 min |

Still well within acceptable onboarding length. Still cleaner than Runna's 30 screens.

---

## Execution

When you paste the main V3 brief into Claude Code, paste this addendum immediately after with the message:

```
That's the main V3 brief. Now apply this addendum:
[paste this file]

Three updates: new calibration screen at 8b, updated partner screen with 3rd option, animated plan summary reveal. Update the brief mentally to integrate these, then build the full 15-screen flow.
```

Claude Code should integrate these naturally into the V3 build, not as separate phases.
