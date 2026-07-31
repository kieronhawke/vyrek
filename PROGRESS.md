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

