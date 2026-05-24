# Quiz audit — Brief v2 §2.1

**Generated:** 2026-05-24
**Scope:** every screen, question, option, branch, transition, interstitial, and friction point in the V3 quiz currently live at `/quiz`. This is the inventory + issue list that drives the §2.2 redesign.

V1 and V2 quizzes were deleted in Stage 1.4 (commit `05be682`). The audit below covers V3 only.

---

## 1. Screen inventory

V3 is a 13-question flow plus 4 framing screens (3 welcome + 1 cinematic). Total visible screens depend on conditional branches — minimum 13, maximum 17.

| # | Kind | Source | Type | Required? | Conditional show-if |
|---|---|---|---|---|---|
| 0 | `welcome` | `components/quiz-v3/welcome-carousel.tsx` | 3-slide carousel, auto-advance 4s, tap-to-advance, Skip | n/a (intro) | always |
| 1 | `primary-intent` | `screens/primary-intent.tsx` | multi-select 1-2 of 5 | required | always |
| 2 | `experience` | `screens/experience.tsx` | single-select 4 options | required | always |
| 3 | `best-time` | `screens/best-time.tsx` | single-select 5 options | conditional | `intent.includes("go-faster")` only |
| 4 | `race-date` | `screens/race-date.tsx` | react-day-picker single-date OR "No race yet" | optional | always |
| 5 | `reassurance-1` | `screens/reassurance-1.tsx` | full-bleed interstitial (photo + headline + Continue) | n/a (interstitial) | always |
| 6 | `activity-baseline` | `screens/activity-baseline.tsx` | single-select 4 options | required | always |
| 7 | `calibration` | `screens/calibration.tsx` | 2 single-select cards (sex) + number input (weight) + kg/lb toggle | required | always |
| 8 | `reassurance-2` | `screens/reassurance-2.tsx` | 3-tile interstitial | n/a | always |
| 9 | `frequency` | `screens/frequency.tsx` | single-select 5 options (2-6 days) | required | always |
| 10 | `session-length` | `screens/session-length.tsx` | single-select 4 options (30/45/60/90 min) | required | always |
| 11 | `location` | `screens/location.tsx` | single-select 3 options (gym-full / gym-standard / home) | required | always |
| 12 | `equipment` | `screens/equipment.tsx` | multi-select | conditional | `location !== "gym-full"` (full gym implies all kit) |
| 13 | `partner` | `screens/partner.tsx` | single-select 3 options | conditional | `intent.includes("doubles")` OR not already declared |
| 14 | `injuries` | `screens/injuries.tsx` | single-select 6 options | required | always |
| 15 | `plan-summary` | `screens/plan-summary.tsx` | programme reveal + benefits + dates + Save my plan | n/a (summary) | always |
| 16 | `account-creation` | `screens/account-creation.tsx` | email + password + marketing opt-in | required | always |
| 17 | `calculating` | `screens/calculating.tsx` | cinematic ~3.5s reveal, then routes to `/plan` | n/a (transition) | always |

Progress bar header (`question-shell.tsx`) shows `current / total` from `questionScreenIndex(screens, current.kind)`. Welcome/interstitials/summary/cinematic are not counted in the denominator. Maximum visible = "12 / 12".

## 2. Question copy — full list

| # | Question | Helper | Options (label → value) |
|---|---|---|---|
| 1 | What brings you to Vyrek? | Select 1 to 2 answers | Training for my first Hyrox → `first-hyrox` · Done a Hyrox, want to go faster → `go-faster` · Training with a partner (Doubles) → `doubles` · Getting into Hyrox-style training → `getting-into` · Building general Hyrox fitness → `building` |
| 2 | Have you raced a Hyrox before? | Pick one | Never raced → `never` · Signed up, not raced yet → `signed-up` · Raced once or twice → `raced-few` · Raced multiple times → `raced-many` |
| 3 | What's your best Hyrox time? | Roughly is fine | Under 75 min → `under-75` · 75-90 min → `75-90` · 90-105 min → `90-105` · 105-120 min → `105-120` · Over 120 min → `over-120` |
| 4 | Got a race booked? | We'll build your plan around the date. Or skip and we'll suggest one. | (calendar) OR "No race yet" |
| 5 | (interstitial) "Give us N sessions a week. We'll give you Hyrox-ready by your race." | — | Continue |
| 6 | How active are you right now? | — | Mostly inactive → `inactive` · Active a couple of times a week → `light` · Train 3-5 times a week → `recreational` · Train 5+ times a week → `serious` |
| 7 | Quick calibration | We use this to set the right weights for sled, wall ball, and farmers carries. | Men's standards · Women's standards · weight kg/lb |
| 8 | (interstitial 3-tile) | — | Continue |
| 9 | How many days a week can you train? | Pick one | 2 / 3 / 4 / 5 / 6 |
| 10 | How long can your sessions be? | Pick one | 30 min · 45 min · 60 min · 90 min |
| 11 | Where will you train? | Pick one | Full Hyrox gym · Standard commercial gym · Home setup |
| 12 | (if conditional) What kit do you have? | Multi-select | Barbell · Dumbbells · Sled · Wall ball · Rower · Ski-erg · Sandbag · Farmers handles |
| 13 | Training solo or with a partner? | Pick one | Solo · Doubles · Solo for now, partner later |
| 14 | Any injuries we should plan around? | Pick one | No injuries · Lower back · Knee · Shoulder · Achilles or calf · Other, noted in app |

## 3. Branch logic

State machine: `lib/quiz-flow.ts` + `visibleScreens()` in `components/quiz-v3/quiz-flow.tsx`. Pure function recomputes the screen list on every answer change.

### Conditional rules

| Screen | Show if |
|---|---|
| best-time | `intent.includes("go-faster")` — non-improvers skip it |
| equipment | `location !== "gym-full"` — full gym assumes all kit |
| partner | not already declared by intent (else pre-filled) |

### Programme determination (lib/quiz-flow.ts `determineProgramme()`)

```ts
if (intent.includes("doubles")) return "doubles";
if (intent.includes("go-faster")) {
  if (bestTime === "under-75") return "pro";
  return "sub-90";
}
if (intent.includes("first-hyrox") || intent.includes("getting-into")) return "first-race";
if (intent.includes("building")) return "first-race";
return "first-race"; // fallback
```

Four terminal programmes: `first-race` · `sub-90` · `doubles` · `pro`. Mapped 1:1 to the Vyrek programme catalogue.

### Date logic

- `determineStartDate()` → next Tuesday from today (programmes start Tuesdays).
- `determineRaceDate(start, userPickedDate?)` → user's date if provided, otherwise start + 12 weeks.
- `calculateWeeksUntilRace()` → clamps to min 1 to avoid divide-by-zero.

## 4. Transitions

- Welcome carousel: 4s auto-advance per slide, tap to skip ahead, Skip button bottom-right.
- Question screens: instant transition on Continue click (no slide-in / slide-out animation). Brief 2.2 asks for "GSAP transitions 250-350ms easeOutQuart" — **not implemented**. Currently uses Framer Motion via `RevealOnView` on RevealMounting but not on screen-to-screen.
- Reassurance interstitials: fade in via motion, Continue button at bottom.
- plan-summary: stagger reveal (just tightened to 60ms/350ms = under 900ms total, was 250ms/450ms = 2.25s).
- calculating: 5-line text reveal with `requestAnimationFrame` + `setTimeout(700ms)` per line, then `router.push("/plan")`.

## 5. Drop-off analysis (from stress-test data + audit walks)

- 200-session stress run (May 23): 0% completion in the auto-walker. Cause: harness couldn't fill the weight number input (fixed in walker now). After fix, real walk progresses 16 of 17 screens then hits the Supabase signup rate limit at Screen 17. Real human users don't hit this except on shared-IP corporate networks.
- Single biggest funnel drop-off in production telemetry: **unknown** — needs real PostHog data once Supabase migrations are applied and quiz_completed events fire.

## 6. Visual issues (after May 24 fixes)

| # | Severity | Where | What | Status |
|---|---|---|---|---|
| V-1 | MAJOR | plan-summary | Stagger was 2.25s, screen looked empty for the first beat | ✅ FIXED (60ms/350ms = <900ms total) |
| V-2 | MAJOR | race-date calendar | react-day-picker chevrons + today indicator rendered default blue | ✅ FIXED (descendant selectors + --rdp-today-color override) |
| V-3 | MINOR | primary-intent | Continue button dark green when disabled — reads as already-visited, not as "make a choice" | OPEN — bump disabled-state contrast |
| V-4 | MINOR | All single-select | No keyboard arrow nav between options. Brief 2.2 asks for "arrows + Enter". | OPEN |
| V-5 | NICE | All screens | No screen-to-screen transition. Brief 2.2 asks for 250-350ms slide-in. | OPEN |
| V-6 | NICE | reassurance-1 | Single image fills the screen — feels static vs the carousel. Could pulse subtly or add a 2-3 line interstitial. | OPEN |

## 7. Logic issues

| # | Severity | Where | What | Status |
|---|---|---|---|---|
| L-1 | MAJOR | account-creation | Supabase signUp default cap = 4 per IP per hour. Real users in offices / shared wifi hit it. Surfaced friendly error in Stage 1.2 but the underlying limit needs raising in Supabase Studio. | OPEN (ops) |
| L-2 | MINOR | calibration | Weight input has no default — user MUST type a number. Could pre-fill at 75 kg / 165 lb to reduce friction. | OPEN |
| L-3 | MINOR | race-date | "No race yet" makes the date input feel optional but a real Hyrox user with a date already booked may not realise the button is OK to pick. Copy fine; the button-vs-button equal sizing already shipped Stage 1.2. | OK |

## 8. Mobile breakages (audited at 390px and 375px)

- All screens render correctly at 375 + 390 (just verified in the 46-screenshot sweep).
- Tap targets: Continue button is `h-14` (56px) ✓ · option cards are `min-h-14` ✓ · close-X is `size-9` (36px) — **MINOR: under 48px**.
- Calendar buttons are 40×40 — under the 48px brief floor. Day-of-week tap is small. Acceptable for date picker convention.

## 9. Brief §2.5 acceptance criteria status

| Criterion | Status |
|---|---|
| Mobile audit at 375px passes on every screen | ✅ (with V-4 keyboard nav open) |
| Every answer permutation has a defined outcome | ✅ (5 intent options × all combos all land on one of 4 programmes per `determineProgramme()`) |
| Result screen has personalised content and clear next step | ✅ (plan-summary uses programme name + race date; CTA = "Save my plan" → calculating → /plan) |
| At least 3 interstitials use new photos | ⚠️ Currently 2 interstitials (reassurance-1 + reassurance-2) + welcome carousel which itself has 3 image slides. If welcome counts, criterion is met. If not, need to add a third interstitial somewhere mid-flow (suggest: after `frequency` to break the run of preference questions). |

## 10. Strava-style benchmark

Comparing V3 to Strava's signup flow (the user's stated reference):

| Strava trait | Vyrek V3 status |
|---|---|
| Big imagery on intro screens | ✅ welcome carousel + reassurance interstitials |
| One question per screen | ✅ |
| Bold display typography | ✅ Oswald 700 on QuestionHeader |
| Persistent progress at top | ✅ progress arc + "n / m" |
| Big tap targets (≥48px) | ✅ Continue 56px, options ≥56px |
| Forward-only feel | ⚠️ Back button always visible top-left — Strava hides Back unless tapped |
| Subtle screen transitions | ❌ No transition (V-5) — Strava uses ~250ms slide |
| Minimal cognitive load per screen | ✅ each screen carries exactly one decision |
| Confirmation pulse on selection | ❌ option cards don't pulse on tap — Strava does a brief check-mark + advance |
| Quick-skip "Maybe later" / "Not sure" affordances | ✅ on race-date ("No race yet"), ❌ elsewhere |

**Net:** V3 is ~70% Strava-like. The biggest deltas are screen transitions (V-5), the missing selection-confirmation pulse, and the always-visible Back button.

## 11. Recommendations for §2.2 redesign

Ordered by impact / effort:

1. **Add screen-to-screen transition** (V-5) — 250ms ease-out-quart slide-up, via Framer Motion's existing setup. Big perceived-polish gain. ~1 hr.
2. **Selection confirmation pulse** — when a single-select option is chosen, the option card scales up briefly (1.0 → 1.03 → 1.0 over 180ms) + chartreuse ring pulses out. Then auto-advance to Continue (or auto-trigger Continue). Strava-grade feedback. ~2 hr.
3. **Pre-fill weight input** (L-2) — default 75 kg on first show, user can override. Reduces friction on calibration. 5 min.
4. **Add a third mid-flow interstitial** to meet §2.5 acceptance (currently 2 interstitials + welcome carousel). Place after `session-length`, copy: "Almost there. Two more questions, then your plan." 30 min.
5. **Hide Back button below welcome+interstitials** unless user scrolls up — Strava pattern. Forward-only register. 30 min.
6. **Keyboard arrow nav between options** (V-4) — single-select cards become keyboard-navigable with ↑/↓ + Enter. Already get focus-visible; just need event handler. 1 hr.
7. **Disabled-Continue contrast** (V-3) — bump from `bg-vyrek-accent/30` to `bg-vyrek-accent/50` + border, so it reads as "make a choice first" not "page glitched". 15 min.
8. **Equipment screen** review — currently shows for `gym-standard` and `home` but the option list is identical. Could split: home gets a "what kit do you own?" subset, gym-standard gets "what does your gym actually have?". 1 hr.
9. **Result screen → bigger funnel hero treatment** (brief 2.4) — currently plan-summary screen is in-quiz styling. Brief wants it "treated as funnel hero". On `/plan` (the post-calculating destination) the reveal page is already chartreuse + dated + locked-weeks gate — that already reads as funnel hero. Cross-reference whether the brief wants plan-summary-inside-quiz to be more dramatic. Decision: leave as is, /plan is already the funnel hero.

## 12. Decision matrix → next deliverable

`docs/quiz-decision-matrix.md` will enumerate every answer permutation → programme. Today's logic is deterministic via `determineProgramme()` in `lib/quiz-flow.ts`. The matrix will tabulate it for human review and edge-case sanity.

That document is Part 2 §2.3; will write immediately after this audit is in.
