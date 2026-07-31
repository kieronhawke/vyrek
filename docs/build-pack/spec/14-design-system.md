# DESIGN SYSTEM — ADMIN & CLIENT

The brief pins the palette. Everything else is a deliberate choice, made for this product.

---

## 1. THE THESIS

**This is a timing system, not a CRM.**

Everything in Hyrox is measured. Splits to the second. Station times. Weights in kilos.
Percentile against the field. The ROXZONE clock running while you transition. The vernacular
of the sport is *measurement against a target*.

So the admin should not look like Salesforce with a dark theme. It should look like the back
end of a race timing system — dense, precise, numeric, fast. Every number aligned. Every
value shown against the thing it's measured against.

That thesis drives the typography, the signature element, and the density.

---

## 2. COLOUR — LOCKED, DO NOT REINTERPRET

Already tokenised in the codebase. Use the tokens, never raw hex.

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0A0A0A` | Base background |
| `--surface` | `#141414` | Cards, panels |
| `--surface-raised` | `#1C1C1C` | Modals, popovers, active rows |
| `--border` | `#262626` | Hairlines, dividers |
| `--border-strong` | `#383838` | Input borders, focus rings |
| `--accent` | `#A3E635` | Chartreuse. Primary action, active state, positive delta |
| `--accent-hover` | `#84CC16` | |
| `--accent-glow` | `#BEF264` | Focus glow, emphasis |
| `--accent-faint` | `#1A3D08` | Accent-tinted backgrounds |
| `--text` | `#FAFAFA` | Primary |
| `--text-muted` | `#A3A3A3` | Secondary, labels |
| `--text-faint` | `#6B6B6B` | Tertiary, disabled |
| `--warn` | `#FBBF24` | Due soon, attention |
| `--danger` | `#F87171` | Overdue, failed, destructive |
| `--info` | `#60A5FA` | Neutral information |

**Accent discipline:** chartreuse is loud. Use it for *one* thing per view — the primary
action or the active state. A panel with six chartreuse elements has no primary action.
Positive deltas may use it; everything else is greyscale.

**Never** use accent as a large background fill. It's a 555nm wavelength — at scale it's
genuinely uncomfortable to look at.

---

## 3. TYPOGRAPHY

Two families, three roles. Chosen for the subject, not for neutrality.

| Role | Face | Why |
|---|---|---|
| **Display / UI** | **Archivo** | Grotesque with a genuine condensed cut. Reads as sports timing signage without pastiche. Excellent at both 11px table labels and 48px metrics. |
| **Numerics** | **Geist Mono** | **All numbers, everywhere.** Tabular figures, so times, weights, money and percentages align in columns without manual tracking. This is the single most functional decision in the system. |
| **Client long-form** | **Archivo** (regular widths) | Ben's notes, plan descriptions. Warmer weights, wider tracking. |

Both free, both self-hostable, both variable fonts — subset and self-host, no Google Fonts
network request.

### The rule that matters
**Every number renders in Geist Mono with `font-variant-numeric: tabular-nums`.** Race times,
splits, weights, prices, dates, percentages, counts. No exceptions. This is what makes a
dense table readable and it's what makes the whole thing feel like an instrument.

### Scale

```
--text-2xs: 11px / 1.3   Archivo 600, +0.06em, uppercase — table headers, eyebrows
--text-xs:  12px / 1.4   labels, meta
--text-sm:  13px / 1.5   table body, dense UI  ← admin default
--text-base:15px / 1.6   client app default
--text-lg:  18px / 1.5   card titles
--text-xl:  24px / 1.3   section headings
--text-2xl: 32px / 1.2   page titles
--metric:   48px / 1.0   Geist Mono, dashboard figures
--metric-lg:72px / 1.0   Geist Mono, the one hero number per view
```

Admin body is **13px**, not 16px. It's a control panel — density is the point. Client app is
15px because it's read one-handed in a gym.

---

## 4. THE SIGNATURE ELEMENT — THE SPLIT BAR

One visual device, used consistently across the entire product. Borrowed directly from race
split displays.

A horizontal track with a filled portion, a target marker, and the value in mono above it.

```
PROGRAMMED UNTIL                         12 DAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┃━━━━━━━━━
                                    ▲ renewal
```

Used for — and *only* for — things measured against a target:

- Programming horizon remaining vs billing date
- Payment collected vs due
- Plan sessions completed vs planned
- Station benchmark vs field percentile
- Predicted finish vs target time
- Race countdown vs plan length
- MRR vs target

**Why this and not charts everywhere:** it encodes something true — this business is entirely
about progress toward a target — and using one device consistently means people learn to read
it once. Fifteen different chart types means learning fifteen things.

Colour rules: fill is `--text-muted` by default, `--accent` when ahead of target, `--warn`
when close, `--danger` when past. The target marker is always a 1px `--text` line.

**Spend the boldness here and keep everything else quiet.** No gradients, no glassmorphism,
no glow effects, no decorative illustration. The split bar is the memorable thing.

---

## 5. LAYOUT — DESKTOP ADMIN

```
┌────────────────────────────────────────────────────────────────────┐
│  ⌘K  SUV ATHLETIC                              [alerts] [account]  │ 48px
├──────────┬─────────────────────────────────────────────────────────┤
│          │                                                          │
│ 216px    │  page title                        [primary action]      │
│ sidebar  │  ─────────────────────────────────────────────────       │
│          │                                                          │
│ Dashboard│  ┌─────────────────────────────────────────────────┐    │
│ Leads  ⁴ │  │  content                                         │    │
│ Clients  │  │                                                  │    │
│ Plans  ² │  └─────────────────────────────────────────────────┘    │
│ Payments │                                                          │
│ Finance  │                                                          │
│ Diary    │                                                          │
│ Messages │                                                          │
│ Activity │                                                          │
│ SEO      │                                                          │
│ Assets   │                                                          │
│ Settings │                                                          │
│ ──────── │                                                          │
│ Accounts │                                                          │
└──────────┴─────────────────────────────────────────────────────────┘
```

- **Fixed 216px sidebar.** Collapsible to 56px icons. Superscript count badges for anything
  needing action.
- **48px top bar.** Command palette trigger, alerts, account. Nothing else.
- **Content max-width 1440px**, centred above that. Tables go full-bleed.
- **8px spacing grid.** Every margin, padding and gap is a multiple of 8. No exceptions.
- **Zero border-radius on tables and inputs. 6px on cards and buttons.** Sharp where data
  lives, soft where actions live.

### Command palette (⌘K) — build this early
Jump to any client, lead, or page. Run any action: send payment link, mark paid, create plan,
send message. **This is how a power user actually operates a control panel**, and it's the
difference between "good admin" and "best admin." Ship it in Phase A, not as polish.

### Tables — the core component
- Sticky header, sticky first column
- Row height 40px, dense mode 32px
- **All numerics right-aligned, mono, tabular**
- Sortable every column, multi-sort with shift
- Inline edit on click for editable fields
- Row hover reveals action buttons at the right edge — no permanent action column eating space
- Bulk select with a floating action bar
- Column visibility and order persisted per user
- Virtualised beyond 100 rows
- **Every table exports to CSV.** No exceptions.

---

## 6. LAYOUT — MOBILE ADMIN & COACH MODE

Coach Mode is mobile-first. Admin must be fully usable on mobile, not merely responsive.

```
┌─────────────────────┐
│ Today          [⚙]  │  56px
├─────────────────────┤
│                     │
│  3 plans due        │
│  1 payment late     │
│  2 races < 14d      │
│                     │
│  ┌───────────────┐  │
│  │ Sarah M.      │  │
│  │ 2 days  ● Paid│  │
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │ James T.      │  │
│  │ 18 days ⚠ Late│  │
│  └───────────────┘  │
│                     │
├─────────────────────┤
│ 🏠   👥   📋   💬   │  64px + safe area
└─────────────────────┘
```

- **Bottom tab bar, 64px + safe-area inset.** Never a hamburger for primary nav.
- **Minimum 44×44px touch targets.** Enforced by lint rule if possible.
- Tables become cards below 768px. Never a horizontally-scrolling table on mobile.
- Sheets slide from the bottom, not modals from the centre
- Primary action is a fixed bottom button above the tab bar, thumb-reachable
- **Zero horizontal scroll at any breakpoint.** Automated test for this.

Breakpoints: `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`

---

## 7. LAYOUT — CLIENT APP

Five bottom tabs: Home · Plan · Train · Progress · Account.

Home leads with **today's session as a single large tappable card** — that's the client-app
signature element, the equivalent of the split bar. One primary object, unmissable, one tap
to start.

The Train tab is a focused player: no chrome, no navigation, one exercise at a time, numbers
readable at arm's length from a bench.

---

## 8. MOTION

Restrained. This is a tool people use forty times a day; animation that delights on visit one
is friction by visit ten.

```
--ease:        cubic-bezier(0.2, 0, 0, 1)
--dur-instant: 100ms   hover, focus
--dur-fast:    150ms   dropdowns, tooltips
--dur-base:    200ms   sheets, modals, tab transitions
--dur-slow:    300ms   page transitions
```

- Split bars animate their fill on mount, once, 300ms. Nowhere else.
- Optimistic UI everywhere — the interface responds before the network does
- Skeleton loaders matching final layout. Never spinners.
- `prefers-reduced-motion: reduce` disables all non-essential motion
- No parallax, no scroll-jacking, no entrance animations on scroll

---

## 9. WRITING

Words are design material. Same intentionality as spacing.

- **Name things by what people control**, never by how the system is built. "Reminders", not
  "notification webhooks". "Programme", not "plan_object".
- **Active voice, sentence case.** "Send payment link", not "Payment Link Submission".
- **An action keeps its name through the whole flow.** The button says "Send plan" → the toast
  says "Plan sent" → the log says "Plan sent".
- **Errors state what happened and how to fix it.** No apology, no vagueness. Not "Something
  went wrong" — "Payment link couldn't send: no mobile number on file. Add one →"
- **Empty states are invitations.** "No clients yet. Add your first →" not "No data available".
- **Coach Mode speaks English, not system.** "Sarah hasn't opened her plan in 8 days", never
  "engagement_flag: plan_unopened_7d".

---

## 10. QUALITY FLOOR — NON-NEGOTIABLE

- Every interactive element keyboard reachable, visible focus ring (2px `--accent-glow`)
- WCAG AA contrast minimum throughout
- Screen reader labels on every control, `aria-live` on async updates
- Text scales to 200% without layout collapse
- Full dark theme only — light mode is not in scope
- Every destructive action confirms; every reversible action offers undo via toast
- Every async action shows loading, success and error states
- Never a full page reload for in-app navigation
