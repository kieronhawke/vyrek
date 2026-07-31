# CLIENT ACCOUNT & PLAN DELIVERY

**Slots into the handover pack as:** `11-client-account.md`
**Amends:** doc 09 §4, doc 10 §3
**Prepared:** 30 July 2026

---

## 1. ACCOUNT ARCHITECTURE

One account per person. Entitlements determine what they see.

```
Account {
  entitlements: {
    hub_subscription:   active | trialing | past_due | cancelled
    private_coaching:   active | paused | none
  }
  coach_id:  fk        // set only for private clients
}
```

| Tier | Hub access | Personal plan from Ben | Direct messaging | Diary booking |
|---|---|---|---|---|
| Hub subscriber | ✅ | ❌ — generated plans | ❌ | ❌ |
| **Private client** | ✅ **included** | ✅ | ✅ | ✅ |

Private coaching includes Hub access. Never bill twice — flag to confirm in §10, but build
it as included.

The UI difference should be immediate and obvious. A private client's home screen leads with
**Ben** — his photo, his latest note, a message button. A Hub subscriber's leads with their
plan and the leaderboard. Same codebase, genuinely different first impression, because the
private client is paying for access to a person and the product should feel like it.

---

## 2. PLAN CREATION — THE SPEED PROBLEM

You've raised this twice, so it's the priority. If building a block takes Ben 40 minutes he
will resent the tool and drift back to Excel.

### Target: a repeat block in under 3 minutes, a new block in under 10.

### Never start from blank

The default action on a client is **"Build next block"**, which opens their *previous block*
pre-loaded with progression applied. Ben adjusts and sends. Blank-canvas plan building exists
but is buried — it's the exception, not the default.

### The speed features, in order of value

**1. Repeat with progression — one tap.**
Loads last block, applies a progression rule (volume +5%, intensity step, or Ben's own saved
rule), flags anything that now collides with a race.

**2. Ben's block library.**
Every block he builds can be saved with a name — "8wk Hyrox base", "race week taper",
"deload", "strength maintenance during run block". Over three months this becomes his own
system, in his own language, and plan-building becomes assembly rather than authorship.

**3. Bulk edit.**
Natural-language-ish operations on a whole block: *add 10% to all runs · move all sled work
to Tuesday · remove Thursday · convert to 4 days · shift everything back a week.* This is
where Excel currently wins and where most coaching platforms lose.

**4. Clone from a similar client.**
"Build from: Sarah M's current block" — with names and personal notes stripped automatically.

**5. Voice input for the Coach's Note.**

This is the important one. The Coach's Note must be human-written (doc 10 §1), and typing
30+ words on a phone is exactly the friction that will make Ben skip it.

**Dictation solves both problems at once.** He taps the mic, talks for 20 seconds, and gets
his actual voice — his phrasing, his rhythm, his abbreviations — transcribed. Dictated speech
reads *more* human than typed text, not less. Fast and authentic in the same action.

Transcribe only. No cleanup, no rewriting, no "improve this" button. Light punctuation
insertion is fine; changing his words is not.

**6. Mobile-capable building.**
He's in gyms, not at a desk. Full plan-building on mobile: repeat-with-progression, bulk
edit, dictate note, send. Complex from-scratch authoring can be desktop-only.

**7. The conflict resolver runs automatically** (doc 10 §2) and warns before send rather than
requiring Ben to remember to check.

---

## 3. PLAN DELIVERY & LINK TRACKING

### What you asked for, and the volume problem

You want a text to Ben every time the client clicks the link. The signal is right; the
frequency will break it.

A keen client opens their plan 6–8 times in the first two days. At 20 private clients that's
100+ texts a week, Ben mutes the number, and the feature is dead — along with the payment
alerts sharing that channel.

### The version that survives contact with 20 clients

| Event | Channel | Why |
|---|---|---|
| **First open** | 📱 **SMS to Ben** | The satisfying one — confirms it landed. Once per plan. |
| **Not opened after 48h** | 📱 **SMS to Ben** | The actionable one. This is the signal that needs a human. |
| Opened 5+ times in 24h | In-app prompt | "Priya's been through her plan four times — good moment to check in." |
| Every subsequent open | Dashboard only | Visible as engagement data, no interruption |
| Weekly | One digest | Who's engaged, who's gone quiet |

**The inverse signal is the valuable one.** Ben doesn't need to know they opened it — he needs
to know they *didn't*. Build both; make the silence louder than the activity.

All of it configurable per-event in Settings. If he wants every-open texts for his first three
clients, let him switch it on — the setting exists, the default is sensible.

### Engagement telemetry per plan
First opened · total opens · time spent per session view · sessions ticked off · sessions
skipped · comments left · formats downloaded · last activity. Feeds the engagement flags in
doc 09 §3 and gives Ben the specifics he needs for personal messages.

---

## 4. THE CLIENT PORTAL — SCREEN BY SCREEN

Five bottom-nav tabs on mobile. Thumb-reachable, no hamburger menu.

### 🏠 Home
- **Private clients:** Ben's photo, his latest Coach's Note, today's session, message button
- Today's session as a single tappable card — the primary action on the whole app
- Next race countdown
- This week at a glance — 7 dots, filled for done
- Current streak, framed gently *(see §8 on tone)*
- One contextual nudge maximum

### 📋 Plan
- Week view by default, day and full-block views available
- Tap a session → full detail: exercises, sets, reps, weights, RPE, Ben's session note
- Tick off sessions
- **Comment on any session — goes straight to Ben's inbox against that session**
- Ben's replies appear inline. This thread *is* the coaching relationship day to day.
- Swap-day request (asks Ben rather than silently rearranging)
- Download menu: Excel · PDF · Calendar (.ics)
- Version history — "Ben updated your plan on 12 Aug" with what changed

### 🏋️ Train
The workout player. Detailed in §6 — this is the P0 surface.

### 📊 Progress
- Station benchmarks vs their own history, per station
- **Percentile against real field data** — the Results Hub moat, only place it exists
- Predicted finish time trend across the plan
- Race history with splits
- PB log
- Compromised running pace trend
- Body metrics (optional, off by default — §8)

### 👤 Account
- Profile, photo, contact
- Subscription: tier, price, next billing date, payment method (Stripe portal link),
  pause, cancel, invoice history
- Plan preferences: default format, units, notification settings
- Health info with a visible "Ben can see this" indicator
- Consents, with granular toggles and a data export button
- Support

---

## 5. THE IN-ACCOUNT AI ASSISTANT

You want Claude in the client account. Done properly this is genuinely useful; done carelessly
it destroys the brand premise that a real elite athlete coaches you personally.

### The one rule that protects everything

> **The client must never be uncertain whether they are talking to Ben or to software.**

That means: distinct name, distinct visual identity, never Ben's photo, never his voice, never
signed off as him. It introduces itself as an assistant and says so again whenever the
conversation drifts toward coaching judgement.

Suggested framing: **"Ask SUV"** — a tool, obviously a tool, useful because it's a tool.

### In scope

| Capability | Example |
|---|---|
| **Format generation** | "Give me this as an Excel" → generates and downloads |
| **Terminology** | "What's a wall ball?" · "What does RPE 7 mean?" |
| **Explaining Ben's structure** | "Why are there two easy runs this week?" — drawing on Ben's note |
| **Logistics** | "Can I move Tuesday to Wednesday?" → explains the impact, offers to ask Ben |
| **Equipment substitution** | Within a Ben-defined substitution table only |
| **Technique pointers** | Links to the video library, doesn't improvise cues |
| **General nutrition** | Within guardrails — §8 |
| **Navigation** | "Where do I log a workout?" |

### Out of scope — hard blocks

- ❌ **Changing plan structure, volume, or progression.** Read-only on the plan.
- ❌ **Anything injury or medical.** "My knee hurts" → does not advise, does not suggest
  modifications, does not say train through it. Flags Ben immediately with a task and tells
  the client Ben will come back to them.
- ❌ **Race decisions.** "Should I still do the Great North Run?" → that's Ben's call.
- ❌ **Impersonating Ben** or generating anything presented as his opinion.
- ❌ **Nutrition for weight loss below sensible floors**, or anything resembling a restrictive
  protocol.

### Always-present escalation
Every conversation carries a visible **"Ask Ben about this"** button. Tapping it packages the
conversation context into a message in Ben's inbox. The assistant's job is to handle the
trivial and *route* the meaningful — not to absorb it.

### Implementation
- Anthropic API, server-side only, key never client-side
- System prompt includes: the client's plan, their Coach's Note, their profile, their
  equipment, the substitution table, and the hard blocks above
- Conversations logged and **visible to Ben** — he should be able to see what his clients are
  asking. That log is a product roadmap.
- Rate limited per account
- Every response footered: *"I'm the SUV Athletic assistant. For anything about your actual
  programming, Ben's the one to ask."*

---

## 6. WORKOUT LOGGING — P0, TREAT AS CRITICAL

Lost workouts are the primary driver of one-star reviews for Runna. There is no reason to
repeat that.

### Non-negotiables

**Local-first writes.** Every set logs to local storage *first*, synced after. The UI never
waits on a network request and never blocks on failure.

**Offline by default.** Gyms have terrible signal, and basements have none. The full session
must work with the network off, queueing writes and syncing when it returns. This is the
single most common practical failure in fitness apps.

**Never lose data.** Durable queue, retry with backoff, conflict resolution favouring the
client's device, and a visible sync indicator so they can trust it.

**Screen wake lock.** Hold the screen awake for the duration of an active session. A screen
dimming between sets is one of the most irritating things a training app can do, and almost
nobody handles it.

### The workout player
- One exercise at a time, large type, readable at arm's length from a bench
- Weight and rep steppers with big touch targets — no keyboards mid-set
- Last session's numbers shown as the default *("last time: 24kg × 10")*
- Rest timer with audio and haptic, **works with the screen locked**
- Haptic confirmation on set completion
- Swipe between exercises
- Notes per exercise and per session
- Pause and resume — sessions survive an app close
- Post-session: RPE, how it felt, optional note to Ben

### Watch sync
Apple Watch and Garmin. Start, log, and complete a session from the wrist. Pull HR and GPS
back into the session record. **P0 alongside logging** — not a later phase.

---

## 7. PERFORMANCE TRACKING

- Per-station benchmark history with trend
- **Percentile against real Hyrox field data**, by age group and gender — nobody else can
  offer this
- Predicted finish time recalculated as benchmarks improve, trended across the plan
- **PB auto-detection → fires the prompt to Ben** (doc 09 §3). The system spots it, Ben sends
  the message. This is the personalisation architecture working.
- Race results pulled from the Results Hub against their athlete profile
- Compromised running pace vs fresh pace — the metric that actually predicts Hyrox outcome
- Volume and consistency over time
- Exportable

---

## 8. NUTRITION — SCOPE CAREFULLY

Nutrition was previously deferred post-V1. Bringing it into the client account is reasonable,
but full food tracking is a bigger build than it looks: a comprehensive food database is a
licensing cost (Nutritionix, or Open Food Facts free but patchier), and barcode scanning plus
portion estimation is genuinely hard.

### Recommended V1 — light
- Photo food log — snap the meal, no weighing, no database
- Simple daily protein and calorie *targets* with a manual entry field
- Hydration tick
- Ben can see the log and comment on it
- Pre-race and race-day fuelling guides as content, not tracking

### V2 — full
Food database, barcode scanning, macro breakdown, recipe library, meal planning.

### Tone rules — build these in from the start

The wording here matters more than the features, and it's easy to get wrong:

- **Never** "you're over your limit" or "you've exceeded your budget". Use neutral,
  informational framing.
- No streak-breaking or guilt mechanics around food or weight. Streaks are fine for training;
  they are not fine for eating.
- Body metrics tracking is **off by default** and opt-in.
- Calorie targets have a hard floor and cannot be set to an aggressive deficit through the UI.
- No before/after photo prompts. No body-fat estimates.
- If a client's logged intake is persistently very low, that flags quietly to Ben as a
  wellbeing note — not to the client as a failure.

This isn't only an ethical point, it's a retention point. Apps that make people feel bad about
food get deleted.

---

## 9. APP-LIKE ON WEB — TECHNICAL SPEC

"Feels like an app" is a set of specific engineering decisions, not a visual style.

### PWA
- Installable, custom icon, splash screen, `display: standalone` — no browser chrome
- Service worker caching plan data, video thumbnails, and the app shell
- Full offline capability for plan viewing and workout logging
- Background sync
- Web push for notifications (iOS 16.4+ supports this from an installed PWA)

### Navigation & touch
- **Bottom tab bar on mobile.** Thumb zone. Never a hamburger menu for primary navigation.
- Minimum 44×44px touch targets
- Swipe gestures where they're natural — between exercises, between plan days
- Pull to refresh
- No horizontal scroll, ever, at any breakpoint
- Safe-area insets respected (notches, home indicators)

### Perceived performance
- **Optimistic UI everywhere.** Tapping "complete set" updates instantly; sync happens behind it.
- Skeleton loaders, never spinners
- Route prefetching on hover and on visible-in-viewport
- Images: AVIF/WebP, responsive, lazy below the fold
- Target: LCP under 2s on 4G, INP under 200ms
- Virtualised lists for long plan views

### Feel
- Haptics on meaningful actions (iOS via the Vibration API where available)
- Transitions 150–250ms, easing consistent across the app
- `prefers-reduced-motion` respected
- Dark by default, matching the brand — light mode optional
- System font stack for native-feeling text rendering
- Never a full-page reload for in-app navigation

### Accessibility
Keyboard navigable · visible focus states · AA contrast minimum (chartreuse on near-black
passes comfortably) · screen reader labels on every control · text scaling to 200% without
layout collapse.

---

## 10. OPEN QUESTIONS

1. **Is Hub access included in private coaching, or billed separately?** Built as included —
   confirm.
2. **What can the AI assistant actually change?** You said "edit a few things." My read is
   read-only on the plan, with format generation and Q&A only. Confirm, because it's the
   difference between a useful tool and a brand liability.
3. **Nutrition scope for V1** — light photo log, or full database? Affects budget and timeline
   materially.
4. **Session comments to Ben** — push notification per comment, or batched daily digest? Real
   time will get noisy at scale.
5. **Native apps** — is the PWA sufficient for launch, with native later? Recommend yes; the
   App Store presence matters more for ASO than for capability.
6. **Watch platforms** — Apple and Garmin both at launch, or Apple first?
7. **Does Ben want visibility of AI assistant conversations?** Recommend yes — it's the best
   product feedback source you'll have.
