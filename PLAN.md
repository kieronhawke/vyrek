# BUILD PLAN

Phase order is taken verbatim from `spec/09 §17` and is **not** reordered. Phase 0 below is
not a new phase — it is the design-token and tooling scaffold your brief requires before
Phase A, plus the prerequisites that block Phase A.

Definition of done for every phase is `spec/16 §12`, in full, with no items waived.

---

## PHASE 0 — SCAFFOLD (before Phase A)

Not in `spec/09 §17`; required by instruction D and by the pack's own dependencies.

**Design tokens first, because everything is built on top of them** (`spec/14`):

- Colour tokens exactly as `spec/14 §2` — all 15. Verified against the repo's existing
  tokens, which already match `--bg #0A0A0A` and `--accent #A3E635`.
- Type scale as `spec/14 §3` — the nine steps from `--text-2xs` 11px to `--metric-lg` 72px.
  Archivo self-hosted and subset; Geist Mono already present.
- **The rule that every number renders in Geist Mono with `tabular-nums`** — enforced by a
  `<Num>` primitive, so it cannot be forgotten in a table cell.
- 8px spacing grid. Zero radius on tables and inputs, 6px on cards and buttons.
- Motion tokens: the four durations and the single easing curve.
- **The split bar component** (`spec/14 §4`) — the signature element. Track, fill, target
  marker, mono value above. Colour rules for ahead / close / past. Animates once on mount.
- Scoped to `/admin`, `/coach` and the client app only, so the marketing site is untouched.

**Tooling:**
- Vitest, zod, Lighthouse CI
- The zero-horizontal-scroll gate and the six-device matrix from `spec/16 §3`, wired before
  the first screen exists rather than after
- `.env.example` committed with every key from `spec/18 §2`

**Prerequisites that block Phase A** (STACK §4): Supabase unpaused, `DATABASE_URL`,
`ENCRYPTION_KEY`, `AUTH_SECRET`, PostHog EU host confirmed.

**Done when:** a page rendering nothing but a split bar and a numeric table passes the device
matrix, the scroll gate, axe, and the visual-regression baseline.

---

## PHASE A — FOUNDATION

> Auth and roles · client and lead data model · audit log · admin shell with both modes ·
> settings hub

- Schema from `spec/15`: identity, leads, client profile, commercials, notes, audit. Plain
  `.sql` migrations. **Every index in `spec/15` created with its table, not later.**
- `audit_log` as append-only, enforced by a **database trigger that rejects UPDATE and
  DELETE** — `spec/16 §7` tests this at the database level, so it cannot be application-only.
- `data_access_log` and health-field encryption wired at the schema level now
  (`HARD-RULES §8`), because retrofitting Article 9 handling is exactly what `spec/09 §14`
  warns against.
- Roles: owner, coach, staff, readonly. 2FA mandatory for owner and staff, optional for coach.
- **Two genuinely separate shells**, not one with a toggle (`spec/09 §0`):
  - `/admin` — 216px sidebar, 48px top bar, 1440px content max, desktop-first
  - `/coach` — bottom tab bar, 64px + safe area, mobile-first, five tabs
- **Command palette (⌘K) ships in this phase**, per `spec/14 §5` and your brief. Jump to any
  client, lead or page; run any action.
- Settings hub shell.
- Seed fixtures from `spec/16 §11` — including the three-race conflict client and the
  day-7 dunning client, so later phases have something real to test against.

**Risks:** blocked entirely until Supabase is unpaused. The brand question (QUESTIONS §4)
surfaces here as the top-bar wordmark — using Suth Performance, in one constant.

---

## PHASE B — CLIENTS & LEADS

> Lead intake and pipeline · lead SMS automation · client CRUD · notes · engagement flags ·
> Coach Mode Today view

- Lead intake from the quiz, contact form and applications, with source, campaign, referrer
  and landing page captured. Duplicate detection on email and phone **before** insert.
- Pipeline `New → Contacted → Qualified → Trial → Client` / `Lost`, kanban and table.
- Lead acknowledgement SMS within 60 seconds (`spec/09 §2`) — needs Twilio, hence the
  two-week sender-ID warning in STACK §4.
- Client CRUD, threaded pinnable notes, the full profile from `spec/09 §3`.
- Engagement flags, computed, surfaced **in plain English** (`spec/14 §9`): "Sarah hasn't
  opened her plan in 8 days", never `plan_unopened_7d`.
- **Coach Mode Today** — the three columns Ben asked for by name (`spec/10 §5`):
  client, `programmed_until`, paid. Plus next race. Three counts above it. **No financial
  metric ever appears in Coach Mode.**
- Call Prep Sheet generated from every completed quiz (`spec/12 §4`).

**Depends on:** A. **Feeds:** everything.

---

## PHASE C — MONEY

> Stripe integration · subscription lifecycle · payment links · dunning ladder · finance
> dashboard · receivables and chase log

- Stripe Billing. **Never store card details.** Customer portal link for card updates so the
  admin never sees a card.
- Two collection modes: automatic subscription, and manual payment link sent by SMS and email
  in one click (`spec/09 §5`).
- **Mark as Paid** for cash and bank transfer (`spec/10 §6`, confirmed for V1): amount, date,
  method, reference, note. Flagged `offline` in Finance, fully audit-logged. Reconciliation
  shows online and offline side by side.
- **The dunning ladder as an explicit state machine**, unit-tested on every transition
  (`spec/16 §6`). Escalates to a human at day 10, suggests **pause** at day 14.
  **Never auto-cancels** (`HARD-RULES §6`).
- Webhook idempotency: the same Stripe event three times produces one state change.
- Finance dashboard, receivables, chase log, forecast, CSV exports.
- Immutable financial audit trail: actor, timestamp, before, after, reason, IP.

**Blocked on:** pricing confirmation and the five Stripe price IDs (QUESTIONS §8).
Buildable against test-mode prices in the meantime.

---

## PHASE D — COACHING TOOLS

> Plan builder · templates · versioning · branded PDF · delivery and tracking ·
> system-drafted plans

The phase that decides whether Ben uses the tool at all. Targets from `spec/11 §2`:
**repeat block under 3 minutes, new block under 10.**

- **Never start from blank.** Default action is "Build next block", opening the previous block
  with progression applied. Blank-canvas building exists but is buried.
- Ben's block library — every block saveable and named, so it becomes his own system.
- Bulk edit: add 10% to all runs, move sled work to Tuesday, convert to 4 days, shift a week.
- Clone from another client with names and personal notes stripped.
- **The Coach's Note**: mandatory, human-typed, ~30 word minimum, **blocks send when empty**.
  **No AI-assist, no template picker, no generate button** (`HARD-RULES §3`). Dictation is
  offered — transcribe only, no cleanup, no rewriting.
- **Race conflict resolver** (`spec/10 §2`): detects overlapping tapers, recovery-window
  violations and impossible peaks, then presents **options with trade-offs, never an answer**.
  Ben picks; the tool drafts him a message explaining the choice, which he edits.
- Version history with diff view, any version restorable.
- Four output formats from one plan object: interactive (default), `.xlsx`, branded PDF, `.ics`.
- Delivery tracking: **first open → SMS to Ben once**; **not opened after 48h → SMS to Ben**.
  Every subsequent open is dashboard-only (`spec/11 §3`). The silence is the loud signal.

**Test this phase with Ben, on his phone, without helping him** (`spec/09 §17`).

---

## PHASE E — COMMUNICATIONS

> Unified inbox · template library · one-off and bulk sending · STOP handling · consent
> management · automation engine

- Unified SMS + email inbox, threaded per client. Ben never needs to know the channel.
- Template library, editable without a deploy. **`classification` is NOT NULL** —
  transactional or marketing, enforced at the database level (`HARD-RULES §11`).
- **STOP handling immediate and automatic.** After opt-out, marketing is blocked and
  transactional continues.
- Quiet hours 21:00–08:00 recipient-local — **queue, never drop**.
- **Global cap: 3 automated messages per client per day**, across all rules and channels.
- Automation engine: one rules engine, every rule visible, editable and pausable.
  **Global kill switch. Dry-run mode** showing exactly who would receive what.
- The launch rule set from `spec/09 §15` plus the `programmed_until` and
  `awaiting_race_debrief` triggers from `spec/10 §4`.

**Reuses:** the 33 branded email templates and 15 SMS messages already built in this repo,
migrated into the editable template library rather than rewritten.

---

## PHASE F — DIARY

> Google Calendar two-way sync · booking links · reminders · session notes

- Two-way sync; Ben's personal calendar is the source of truth for availability.
- Timezone-aware, DST-correct — unit-tested across boundaries (`spec/16 §6`).
- Booking links with availability windows and buffers; client self-reschedule.
- Reminders 24h and 1h. No-show tracking. Post-session notes write to the client record.
- Intelligence: clients unseen 30+ days, race inside 14 days with no session booked, sessions
  booked into travel or race blocks.

**Blocked on:** QUESTIONS §14 — if Ben uses Apple Calendar the integration changes route.

---

## PHASE G — VISIBILITY

> Activity feed · session detail · visitor profiles · reports · suspicious activity ·
> SEO module

- Live activity feed, session detail with time-on-page and referrer, stitched visitor profiles.
- IP retention: 30 days full, then truncate the final octet — automated, tested.
- Suspicious activity detection and the security queue.
- SEO module: import all 425 keyword rows, keyword→page mapping, cannibalisation warnings,
  rank history, Search Console, content pipeline board, **buyer-type filter on by default**.
- **Uniqueness validator dashboard** — which pages are blocked and which fields are missing.

**Note:** the validator itself is built earlier, in Phase 0/A, because
`rules/uniqueness-validator.md` says "build this before the location template" and it is a
build-pipeline gate, not a runtime check. Phase G adds its dashboard.

**Carries the risk in QUESTIONS §1** — may need rework against the Green Buggy implementation.

---

## PHASE H — POLISH

> Marketing assets · Coach Mode refinement with Ben watching · mobile optimisation ·
> onboarding walkthrough

- Marketing asset library with usage rights recorded and AI-generated assets excluded.
- **Second session with Ben on his phone.** Whatever he hesitates on gets redesigned.
- Full device-matrix sweep, performance budget sweep, visual-regression baseline refresh.

---

## THE CLIENT ACCOUNT

`spec/11` is a large body of work that `spec/09 §17` does not place in the A–H sequence. It
depends on Phase D (plans must exist before a client can open one).

**Sequencing it after H rather than inventing a phase letter**, so the pack's order is not
reordered:

- **P0 within it: workout logging, offline-first** (`HARD-RULES §2`). Local-first writes,
  durable queue, idempotent sync via `client_generated_id`, screen wake lock. The offline
  test in `spec/16 §2` runs on every commit from the moment the first line exists.
- Five bottom tabs: Home, Plan, Train, Progress, Account.
- The workout player: one exercise at a time, big steppers, last session's numbers as the
  default, rest timer that works with the screen locked.
- Watch sync — Apple first (QUESTIONS §22).
- Two-way session comments.
- Contextual guidance cards (`spec/17`) — a curated library, never generated.
- "Ask SUV" assistant, read-only on plans, with the full adversarial suite from `spec/16 §8`
  passing before it is exposed to anyone.

> If you would rather the client account came earlier — before Phase G, say — tell me and I
> will move it. I have not reordered A–H, but this block sits outside that sequence and its
> position is a judgement I would rather you made.

---

## DEPENDENCY MAP

```
Phase 0  tokens, split bar, test gates, .env.example
   │     (blocked: Supabase unpaused)
   ▼
Phase A  schema · audit trigger · auth · both shells · ⌘K · seeds
   │
   ├──────────────┬──────────────┐
   ▼              ▼              ▼
Phase B        Phase C        Phase G (SEO half)
leads          money          keyword import
clients        stripe         validator dashboard
Today view     dunning
   │              │
   ▼              │
Phase D ◄─────────┘
plans · coach's note · conflict resolver · PDF
   │
   ▼
Phase E  inbox · templates · automation engine
   │
   ▼
Phase F  diary          (blocked: Google vs Apple)
   │
   ▼
Phase G  activity       (risk: Green Buggy reference)
   │
   ▼
Phase H  polish · Ben on his phone
   │
   ▼
Client account  (P0: offline logging)
```

---

## HOW EACH PHASE ENDS

Per your build loop, every phase closes with all of:

1. Full test suite green (`spec/16`)
2. Every item in `spec/16 §12` verified, none waived
3. Every new screen screenshotted and checked against `spec/14`
4. Six-device matrix, zero horizontal scroll, zero axe violations, within budget
5. Offline test passing
6. Committed with a clear message
7. `PROGRESS.md` appended: shipped, tested, outstanding

Then straight into the next phase without waiting.
