# STACK

Confirmed against `spec/09 §16` and `spec/18 §1`. Every deviation is listed with a
justification, and nothing is deviated from for convenience.

---

## 1. WHAT IS ALREADY HERE

This is not a greenfield repo (QUESTIONS §5). Verified from `package.json`:

| Concern | Installed | Pack asks for | Verdict |
|---|---|---|---|
| Framework | Next.js 16.2.6, React 19.2.4, Turbopack | (implied) | ✅ |
| Hosting | Vercel | Vercel | ✅ |
| Database | Supabase Postgres | Postgres — Neon or Supabase | ✅ |
| Payments | `stripe` 22.1.1, `@stripe/stripe-js` 9.6.0 | Stripe | ✅ |
| Email | `resend` 6.12.3, `@react-email/components` | Resend or Postmark | ✅ |
| Analytics | `posthog-js` 1.374.3 | PostHog (EU) | ⚠️ check region |
| Cache / rate limit | Upstash Redis + Ratelimit | Upstash | ✅ |
| CMS | Sanity | Sanity stays | ✅ |
| Errors | `@sentry/nextjs` | Sentry | ✅ |
| E2E | Playwright 1.60 + `@axe-core/playwright` | Playwright, axe-core | ✅ |
| Styling | Tailwind 4 | (design tokens) | ✅ |

**Nine of the eleven services in `spec/18 §1` are already wired.** That is the single
strongest argument for building into this repo rather than starting a new one.

---

## 2. WHAT IS MISSING AND MUST BE ADDED

| Package | For | Phase needed |
|---|---|---|
| `vitest` | `spec/16 §6` mandates Vitest, 80% on business logic. Nothing is installed. | A |
| `zod` | Runtime validation on every webhook and form boundary | A |
| `twilio` | SMS, inbound STOP webhook | B |
| `@react-pdf/renderer` | Branded plan PDF, `spec/09 §4` | D |
| `inngest` | Durable scheduled jobs for the automation engine | E |
| `@vercel/blob` | PDFs, form-review video, assets | D |
| `@anthropic-ai/sdk` | "Ask SUV" assistant, server-side only | (client app) |
| `googleapis` | Google Calendar two-way sync | F |
| `exceljs` | `.xlsx` plan export | D |
| `ics` | Calendar export | D |

Installed per phase, not all up front, so the dependency tree stays legible and the bundle
budgets in `spec/16 §4` stay measurable.

---

## 3. DEVIATIONS FROM THE PACK

### 3.1 Auth — keeping Supabase Auth, not Clerk or Auth.js
**Pack:** `spec/09 §16` recommends Clerk or Auth.js.
**Deviating.** The repo already runs Supabase Auth with an email-allowlist admin gate
(`lib/admin/auth.ts`), live customer accounts, and Supabase is also the database. Adding
Clerk means two identity systems, a migration of live accounts, and a second bill.

Supabase Auth covers everything `spec/09 §13` requires: roles (via a claim), session
management with force-logout, password policy and reset, and MFA for TOTP.

**Cost of the deviation:** Supabase's MFA is less turnkey than Clerk's. `spec/09 §13` needs
2FA mandatory for Owner and Staff, optional for Coach — that is enforcement logic I write
rather than a config toggle. Acceptable.

**Caveat:** the Supabase project is currently **paused**, which blocks anything touching
auth or the database. Flagged in PLAN.md as the Phase A prerequisite.

### 3.2 Jobs — Inngest over Trigger.dev
**Pack:** either. Choosing **Inngest**: better Vercel integration, step functions map cleanly
onto the `TRIGGER → CONDITIONS → ACTIONS → COOLDOWN` shape in `spec/09 §15`, and its
replay/cancel model is what the dry-run and kill-switch requirements need.

### 3.3 PDF — React-PDF over Puppeteer
**Pack:** either. Choosing **React-PDF**: no headless Chrome in a serverless function, and it
comfortably meets the "< 3s for a 12-week plan" budget in `spec/16 §4`. Puppeteer would give
pixel-identical output to the web view but costs cold-start time and memory.

### 3.4 Typography — a real conflict
**Pack:** `spec/14 §3` specifies **Archivo** for display/UI and **Geist Mono** for all numerics.
**Repo currently loads:** Inter, Oswald and Geist Mono.

Geist Mono already matches. Archivo does not — the site uses Oswald for display and Inter for
UI. `spec/14` says "follow it exactly, no reinterpretation", and your prompt repeats that.

**Following the pack for the admin and client app**: adding Archivo, self-hosted and subset,
no Google Fonts request. **Not touching the marketing site's fonts** — that would restyle 58
blog posts and 130 geo pages, which is outside this brief and would collide with another
terminal working in those files.

Consequence: two type systems in one repo, scoped by route. Recorded deliberately rather than
discovered later.

### 3.5 ORM — raw SQL with a typed client, no ORM
**Pack:** silent on this. Choosing **no ORM**. `spec/15` is written as SQL DDL, the audit log
needs a database trigger that rejects UPDATE and DELETE, and the indexes are specified
explicitly. Drizzle or Prisma would add a translation layer over a schema that is already
precisely specified. Migrations as plain `.sql` files, checked in.

### 3.6 PostHog region
`spec/18 §1` requires **EU cloud** for GDPR data residency. The repo has `posthog-js` but I
have not confirmed the host. **Action in Phase A:** verify `NEXT_PUBLIC_POSTHOG_HOST` points
at `eu.i.posthog.com`, and if not, flag before any session recording is enabled.

### 3.7 Sending domain
`HARD-RULES §10` and `spec/18 §1` say `mail.suvathletic.com`. The brand question in
QUESTIONS §4 makes that address unusable as written. The *rule* — transactional email off the
root domain, with its own SPF/DKIM, and never a `noreply@` — is what I will implement. The
subdomain is `mail.<confirmed-domain>`, pending your answer.

---

## 4. ENVIRONMENT VARIABLES

`.env.example` is committed with every key from `spec/18 §2` present and blank.

### Needed from you now — Phase A cannot complete without these

| Variable | Why now |
|---|---|
| **Supabase project unpaused** | Everything. Auth, schema, every table in `spec/15`. |
| `DATABASE_URL` | Migrations, the audit trigger, the seed fixtures |
| `ENCRYPTION_KEY` | Health-field encryption at rest is designed in from the start (`HARD-RULES §8`), not retrofitted. Generate with `openssl rand -base64 32`. |
| `AUTH_SECRET` | Session signing |
| `NEXT_PUBLIC_APP_URL` | Absolute URLs in email and OAuth callbacks |
| `NEXT_PUBLIC_POSTHOG_HOST` | Confirm EU residency before analytics fires |

### Needed by Phase B (leads and SMS)
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`,
`TWILIO_WEBHOOK_SECRET`

⚠️ **Start the UK alphanumeric sender ID registration now.** `spec/18 §1` warns of a
**two-week lead time**, and Phase B's first automation is the lead acknowledgement SMS.

### Needed by Phase C (money)
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and the
five price IDs. The price IDs cannot be created until pricing is confirmed (QUESTIONS §8).

### Needed by Phase D (plans)
`BLOB_READ_WRITE_TOKEN`

### Needed by Phase E (automation)
`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `CRON_SECRET`

### Needed by Phase F (diary)
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` — and Ben authorising the
OAuth consent screen once.

### Needed for the client-app assistant (after H)
`ANTHROPIC_API_KEY` — server-side only, never `NEXT_PUBLIC_`.

### Already set in this repo
`RESEND_API_KEY`, `SENTRY_DSN`, Upstash, Sanity, Supabase public keys.

---

## 5. TESTING STACK

Per `spec/16`, which is the definition of done.

| Layer | Tool | Gate |
|---|---|---|
| Unit / integration | **Vitest** | 80% on business logic, no UI target |
| E2E + device matrix | **Playwright** | Six devices, every PR |
| Offline | **Playwright + network interception** | `spec/16 §2` — must pass every commit |
| Accessibility | **`@axe-core/playwright`** | Zero AA violations |
| Performance | **Lighthouse CI** | Budgets in `spec/16 §4`, build fails if exceeded |
| Visual regression | **Playwright screenshots** | 0.1% threshold, baselines never auto-accepted |

Lighthouse CI is the only one not yet present. Added in Phase A so budgets are enforced from
the first screen rather than discovered at the end.

**Note on the runner:** this repo's Playwright config and `npm run dev` both default to port
3000, and a second terminal is currently working in this repo. Two dev servers fight over the
port and the loser dies mid-run, which looks exactly like mass test failure. All test runs
use a dedicated port:

```
npx next dev -p 3100
PLAYWRIGHT_NO_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test
```

---

## 6. WHAT I AM NOT CHANGING

- The marketing site's fonts, colours or layout
- Sanity, and the existing blog and geo-page pipeline
- `/admin/partners` and `/admin/payouts` — outside the pack's 13 modules
- Anything in `content/`, `lib/locations/` or `components/landing/` — another terminal is
  working there
