# PROGRESS

Appended per phase. Newest last.

---

## PHASE 0 — SCAFFOLD ✅ 31 July 2026

Design tokens, the signature component, and the quality gates. Everything in
the later phases is built on top of these.

### Shipped

| What | Where |
|---|---|
| The full spec/14 §2 palette, all 15 tokens | `app/control-tokens.css` |
| Type scale, 9 steps, 11px → 72px | same |
| 8px spacing grid, radius rules, layout constants, motion tokens | same |
| Archivo, self-hosted and subset, no Google Fonts request | `app/control-preview/layout.tsx` |
| `<Num>` — the mechanism that keeps "every number in Geist Mono" true | `components/control/num.tsx` |
| **The split bar** — the signature element | `components/control/split-bar.tsx` |
| Split bar arithmetic, separated so it is testable without rendering | `lib/control/split-bar.ts` |
| Phase 0 proof surface, kept as the reference for later phases | `app/control-preview/page.tsx` |
| Vitest, configured to exclude the Playwright specs | `vitest.config.ts` |
| **The six-device matrix from spec/16 §3** | `playwright.config.ts` |
| The quality gates, wired before the first real screen | `tests/visual/control-gates.spec.ts` |

### Tested

- **18 unit tests** on the split bar: geometry, both directions, every state
  boundary, custom thresholds, and degenerate input (zero target, NaN,
  Infinity, negative max). All green.
- **31 Playwright assertions across all six devices** — iPhone SE, 15 Pro,
  15 Pro Max, Pixel 8, iPad Mini, Galaxy Fold. All green.
- Gates now running on every surface added to `SURFACES`:
  zero horizontal scroll · 44×44 touch targets · no text below 12px ·
  zero axe violations at WCAG AA · every `.num` actually rendering in the
  mono face with tabular figures · visual regression at 0.1%.
- Typecheck and lint clean.

### Three defects found and fixed

1. **`--text-faint` fails WCAG AA.** `#6B6B6B` on `#0A0A0A` is **3.67:1**;
   AA needs 4.5:1 at eyebrow size. spec/14 §2 locks the hex, spec/14 §10
   demands AA and spec/16 §5 demands zero violations — the three cannot all
   hold. Resolved by **role, not by hex**: eyebrows use `--text-muted`
   (~7.9:1), and `--text-faint` is reserved for disabled controls, which
   WCAG 1.4.3 exempts. The locked palette is unchanged. Recorded in
   QUESTIONS.md.
2. **The scrollable table region was keyboard-unreachable.** A real barrier,
   not a technicality: on a narrow screen that scroll is the only way to
   reach the right-hand columns. Now focusable and labelled.
3. **The split bar's target label clipped at the right edge**, and an
   overflowing label would have tripped the zero-scroll gate. Reserve widened.

Also corrected during the phase: the split bar read a ref during render and
duplicated reduced-motion handling in JS. Reduced motion now lives only in
CSS, where `control-tokens.css` already collapses every transition.

### Deliberate divergence

The spec palette is scoped to `[data-surface="control"]` rather than
replacing the marketing site's `--suth-*` tokens. spec/14 §2 says the palette
is "already tokenised in the codebase", but **7 of the 15 values differ**.
Retokenising the live site would restyle 58 blog posts and 130 location pages
and collide with another terminal working in those files. Reasoning is in the
file header and in QUESTIONS.md.

### Outstanding

- **Phase A is blocked**: Supabase is paused. Nothing touching the schema,
  auth or the audit trigger can start until it is unpaused, plus
  `DATABASE_URL`, `ENCRYPTION_KEY` and `AUTH_SECRET`.
- Lighthouse CI is configured in STACK.md but not yet wired into a workflow;
  it lands with the first real screen in Phase A, where there is something
  meaningful to measure.
- The brand question in QUESTIONS.md §4 is unanswered. The proof surface
  carries no wordmark yet, so nothing is blocked by it today, but the Phase A
  top bar needs it.

---

## PHASE A (part 1) — COACH MODE SHELL + COMMAND PALETTE ✅ 31 July 2026

Phase A proper is blocked on Supabase. These are the parts of it that need no
database: the two-mode shell (Coach half), the command palette, and the seed
fixtures every later phase will test against.

### Shipped

| What | Where |
|---|---|
| Seed fixtures, incl. the cases spec/16 §11 names | `lib/control/fixtures.ts` |
| Coach Mode layout — 56px header, fixed 64px tab bar + safe area | `app/coach/layout.tsx` |
| **Today** — three counts, then one list, sorted by who needs Ben first | `app/coach/page.tsx` |
| Clients, Plans, Messages, Diary — honest phase-labelled empty states | `app/coach/*/page.tsx` |
| Bottom tab bar, five tabs, never a hamburger | `components/control/coach-tabs.tsx` |
| **Command palette (⌘K)** — clients, leads, pages, actions | `components/control/command-palette.tsx` |

Today is built to spec/10 §5: `programmed_until`, whether they have paid, and
the next race. **No financial metric appears anywhere in Coach Mode**, per
spec/09 §0. Flags read as sentences — "Hasn't opened her plan in 8 days" —
never as enum names.

Pending palette actions render disabled with the phase that owns them rather
than being hidden, so nothing silently does nothing when clicked.

### Tested

- **28 unit tests** on the split bar (up from 18).
- **186 Playwright assertions** — six surfaces × six devices, all green.
- Typecheck and lint clean.

### Three defects found and fixed

1. **The split bar signalled backwards for runway.** A client with 2 days of
   programming left painted the same danger red as one who had already run
   out, and 26 days against a 28-day billing date painted amber while 2 days
   against a 9-day date painted calm. The ratio-based "close" is meaningless
   for runway: urgency is an absolute number of days. Added
   `criticalAtOrBelow` and `warnAtOrBelow`, with 10 regression tests.
2. **Tab labels were 11px**, tripping the below-12px gate. This exposed a
   contradiction I had not spotted: `spec/14 §3` sets 11px for eyebrows,
   `spec/16 §3` gates text below 12px. The gate exempts `.eyebrow` only, and
   the conflict is now recorded as QUESTIONS §41.
3. **The visual baseline was misleading.** A `fullPage` capture renders a
   fixed bottom tab bar partway down the image. App-like screens now capture
   the viewport; only the design-system reference stays fullPage.

Also corrected: the command palette reset state inside an effect, costing a
second render pass on every open — the wrong place to spend frames against
spec/16 §4's 100ms budget.

### Outstanding

- **Operator Mode (`/admin`) not started.** The existing `/admin` has live
  pages behind Supabase auth; migrating it needs the database up, so it waits
  rather than being half-moved.
- Phase A's real content — schema, audit trigger, auth, roles — still blocked.
- Palette actions are inert by design until Phases C–E.

---

## PHASE A/C/D — SCHEMA + THE BUSINESS LOGIC ✅ 31 July 2026

Supabase is still paused, so this is the work that genuinely does not need a
live database: the schema itself, and the pure logic `spec/16 §6` names as
requiring exhaustive unit tests. All of it is the hard part of Phases A, C
and D, and none of it was blocked.

### Shipped

| What | Where | Phase |
|---|---|---|
| Identity, leads, client profile, commercials, notes, audit | `supabase/migrations/0100_control_centre_identity.sql` | A |
| **Append-only `audit_log`**, enforced by database triggers | same | A |
| `data_access_log` and encrypted health columns | same | A |
| Every index `spec/15` says not to skip | same | A |
| **The dunning ladder** as a pure state machine | `lib/control/dunning.ts` | C |
| **The uniqueness validator**, with no bypass | `lib/control/uniqueness.ts` | pre-SEO |

The migration is authored but **not yet applied** — it cannot be until the
project is unpaused. It is written so it can be reviewed and run as-is.

`audit_log` rejects UPDATE and DELETE with a database trigger rather than in
application code, because `spec/16 §7` tests it at the database level and an
application-only rule is one service-role query away from being untrue.

Health fields are stored as `bytea` ciphertext. The application encrypts
before insert and writes to `data_access_log` on every read, per Article 9.

### Tested — 112 unit tests, 98.88% statements, 100% functions and lines

Against `spec/16 §6`'s 80% floor on business logic.

- **Dunning, 21 tests.** Every rung, every boundary as inclusive, idempotent
  re-runs after a crash, paid and paused stopping conditions, and the human
  handover staying true once reached. Plus an explicit sweep asserting
  `shouldCancel` is false at every day in every state, and that no template
  in the ladder so much as mentions cancelling — HARD-RULES §6.
- **Uniqueness, 24 tests.** Every threshold boundary: exactly at the minimum,
  one below, a high score blocked for a missing mandatory category, and each
  field's own rule (3 resolved stations, 2 named routes, a race needing both
  distance and travel time). Includes a test that `validateUniqueness` takes
  exactly one argument, so there is nowhere to pass a bypass.
- **The sift, 17 tests.** Explicit choices beating the score in both
  directions, the tie-break at exactly zero going to the club rather than
  Ben's diary, and reasons never citing a signal that disagrees with the
  verdict.
- **Lead brief, 18 tests**, including that it always emits a goal the
  consultation endpoint accepts, and stays inside the 2000-character cap when
  every field is populated.
- **Fixtures, 15 tests** on the ordering and counts behind Ben's Today screen.

### Corrected

One test assertion of mine was wrong rather than the code: I expected an
empty quiz to produce the generic fallback line, but the "keeping things
open" signal fires and produces a better, specific one. Fixed the test and
added a case for the genuine fallback.

### Outstanding

- Migration **not applied**. Needs the project unpaused.
- Still to build in this vein, all unblocked: the race conflict resolver
  (Phase D), progression rules, percentile and predicted finish, automation
  rule evaluation with cooldowns and the global cap, proration, and timezone
  handling across DST.
- Operator Mode `/admin` still waiting on auth.

---

## PHASE D — THE RACE CONFLICT RESOLVER ✅ 31 July 2026

`spec/10 §2` calls this the standout feature. It is the periodisation
conflict resolution Ben currently does by hand in Excel — "the highest-value
thing in Ben's head and the hardest thing to hire for".

### Shipped

| What | Where |
|---|---|
| The resolver — conflicts, options, trade-offs | `lib/control/race-conflicts.ts` |
| The three-race client `spec/16 §11` names | `lib/control/fixtures.ts` |
| Coach Mode Plans, showing it live | `app/coach/plans/page.tsx` |

Six conflict types: a race inside another's recovery window, overlapping
tapers, multiple A races, **discipline degradation**, insufficient build
runway, and travel before a race.

The discipline check is the one that earns the feature. On Ben's own example
it produces: *"Ultra marathon then Hyrox Pro Doubles, 21 days apart. A
high-volume endurance block degrades the strength and anaerobic power a Hyrox
result depends on."* No calendar check finds that — the races are three weeks
apart and look fine.

**It never returns an answer.** One option per race treated as the A race,
plus the honest split, each naming what it costs. `spec/10 §1`: the system
builds the skeleton, Ben supplies the judgement, and naming the sacrifice is
the strongest human signal there is. A test asserts the returned shape
contains no "recommended", "chosen" or "best" anywhere.

Blocking conflicts require acknowledgement before send rather than hard-
blocking. A tool that refuses to let an expert override it is a tool an
expert stops using; the requirement is that he cannot send *without seeing
it*.

### Tested — 136 unit tests, 99.16% statements, 100% functions and lines

- **24 resolver tests**, opening with Ben's exact ultra → GNR → Hyrox
  scenario and asserting each conflict it should surface.
- Boundary cases: the exact recovery day counts as clear of it; well-spaced
  races produce no options at all.
- Order-independence and non-mutation of the input.
- The candour test: the split option must still describe itself as usually
  the worst choice, because an optimistic framing here is exactly the
  frictionless accommodation `spec/10 §1` warns against.

### Outstanding

- Choosing an option and drafting the client message lands with the plan
  builder in Phase D proper.
- Still unblocked and next: progression rules, percentile and predicted
  finish, automation rule evaluation with cooldowns and the global cap,
  proration, DST handling.

---

## CLIENT ACCOUNT — OFFLINE WORKOUT LOGGING ✅ 31 July 2026

`HARD-RULES §2` had nothing implemented behind it, and the offline test
`spec/16 §2` calls "the most important in the suite" had nothing to test.
It does now.

### Shipped

| What | Where |
|---|---|
| Queue logic — ordering, backoff, dedupe, reconciliation | `lib/client-app/workout-queue.ts` |
| Durable local store, IndexedDB with a localStorage mirror | `lib/client-app/local-store.ts` |
| **The workout player** | `components/client-app/workout-player.tsx` |
| Idempotent sync endpoint | `app/api/client/workout-sets/route.ts` |
| **Service worker, scoped to `/train`** | `public/train-sw.js` |
| Client app tab bar | `components/client-app/tabs.tsx` |
| **The offline test, all three scenarios** | `tests/visual/offline-workout.spec.ts` |

The player is local-first: a tap writes to the queue and to IndexedDB before
anything touches the network, and the UI never awaits a request. Steppers
rather than inputs so there is no keyboard mid-set, last session's numbers as
the default, screen wake lock, haptics, and a sync indicator that says plainly
whether work is saved.

### Tested — 161 unit tests, 189 Playwright assertions

- **25 queue tests**, including the spec's twelve-sets-across-four-exercises
  case and a flapping simulation, asserting no loss and no duplicates.
- **The offline contract, all three scenarios passing**: twelve sets logged
  offline surviving a force-close and reopen still offline, then syncing
  exactly once; network flapping mid-session; and a failing server never
  losing sets or blocking the UI.

### Three things the test caught that I would not have

1. **No service worker meant offline reopen was impossible.** The queue
   survived in IndexedDB, but the navigation itself needed the network, so
   the data was unreachable behind a browser error page. `spec/11 §9`
   requires the shell cached; the test is what surfaced it. The worker is
   scoped to `/train` only — a stale cached shell on the SEO-critical
   marketing site would be a far worse problem than the one it solves.
2. **`storageState` does not reproduce a force-close.** Service workers,
   cache and IndexedDB are profile-scoped, so the test now uses a persistent
   context — which is also much closer to force-quitting an app on a phone.
3. **Service workers cannot be tested against `next dev`.** Dev chunks are
   not stably cached, so React never hydrated offline. The suite now runs
   against a production build, which is the honest environment anyway.

### Outstanding

- **The endpoint validates and acknowledges but does not yet persist.**
  Supabase is paused. That is safe for the device — its queue only clears on
  an acknowledgement it then reconciles — but sets are not durable
  server-side yet. Wiring the insert is a Phase A task; the contract will not
  change.
- Home, Plan, Progress and Account tabs are not built.
- Watch sync, session comments, the assistant and guidance cards not started.

