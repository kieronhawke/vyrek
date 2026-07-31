# INTEGRATIONS, ENVIRONMENT & NOTIFICATIONS

**Closes a gap.** Notification rules were scattered across docs 09–13 with no single view, and
nothing listed the accounts and credentials needed to start. Both are blockers on day one.

---

## 1. ACCOUNTS TO CREATE BEFORE BUILDING

| Service | Purpose | Notes |
|---|---|---|
| **Stripe** | Subscriptions, payment links, portal, tax | UK entity. Enable Billing + Tax. |
| **Twilio** | SMS out, inbound STOP handling | UK alphanumeric sender ID needs registration — **allow 2 weeks lead time** |
| **Resend** or **Postmark** | Transactional email | Verify `mail.suvathletic.com`, not the root domain |
| **PostHog** | Analytics, session recording, funnels | **EU cloud** — data residency matters for GDPR |
| **Google Cloud** | Calendar API | OAuth consent screen; Ben authorises once |
| **Anthropic** | The in-account assistant | Server-side only |
| **Vercel** | Hosting, cron, blob storage | Already in use |
| **Upstash** | Redis — rate limits, queues | Already in use |
| **Inngest** or **Trigger.dev** | Durable scheduled jobs for the automation engine | |
| **Sentry** | Error tracking | |
| Postgres | Neon or Supabase | |

---

## 2. ENVIRONMENT VARIABLES

```bash
# Core
DATABASE_URL=
NEXT_PUBLIC_APP_URL=
AUTH_SECRET=
ENCRYPTION_KEY=                    # ⚠️ health-field encryption at rest — rotate-able

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_HUB_MONTHLY=
STRIPE_PRICE_HUB_ANNUAL=
STRIPE_PRICE_PROGRAMMING=
STRIPE_PRICE_COACHING=
STRIPE_PRICE_ELITE=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_MESSAGING_SERVICE_SID=
TWILIO_WEBHOOK_SECRET=

# Email
RESEND_API_KEY=
EMAIL_FROM_TRANSACTIONAL=          # ben@mail.suvathletic.com
EMAIL_FROM_MARKETING=

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=          # EU host

# Google Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Anthropic
ANTHROPIC_API_KEY=                 # ⚠️ server-side only, never NEXT_PUBLIC_

# Storage
BLOB_READ_WRITE_TOKEN=

# Jobs
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
CRON_SECRET=

# Ops
SENTRY_DSN=
```

Commit a `.env.example` with every key present and every value blank.

---

## 3. WEBHOOKS TO CONFIGURE

| Source | Events | Handler must be |
|---|---|---|
| Stripe | `invoice.paid` · `invoice.payment_failed` · `customer.subscription.updated` · `customer.subscription.deleted` · `payment_intent.succeeded` · `charge.refunded` | **Idempotent** — same event 3× produces one state change. Tested in spec/16 §6. |
| Twilio | inbound SMS (STOP handling), delivery status | Signature-verified |
| Resend | delivered, bounced, complained | Bounces suppress future sends |
| Google Calendar | push notifications on Ben's calendar | Renew subscription before expiry |

---

## 4. THE NOTIFICATION MATRIX

Every notification in the system, in one table. Defaults shown; **all configurable per event
per channel in Settings.**

### To Ben (Coach Mode)

| Event | SMS | Push | In-app | Default |
|---|---|---|---|---|
| New lead created | ✅ | ✅ | ✅ | On |
| Lead untouched 24h | — | ✅ | ✅ | On |
| **Plan opened first time** | ✅ | — | ✅ | On |
| **Plan NOT opened after 48h** | ✅ | ✅ | ✅ | On |
| Plan opened 5+ times in 24h | — | — | ✅ | On |
| Client comment on a session | — | ✅ | ✅ | On |
| **Payment received** | ✅ | — | ✅ | On |
| **Payment failed** | ✅ | ✅ | ✅ | On |
| Payment 10 days overdue (human decision) | ✅ | ✅ | ✅ | On |
| `programmed_until` in 3 days | — | ✅ | ✅ | On |
| `programmed_until` passed, nothing queued | ✅ | ✅ | ✅ | On |
| Client race in 14 days | — | ✅ | ✅ | On |
| Race completed — book debrief | — | ✅ | ✅ | On |
| New PB detected — congratulate? | — | ✅ | ✅ | On |
| Client quiet 10 days | — | — | ✅ | On |
| Client birthday | — | — | ✅ | Off |
| Form review uploaded (Tier 3) | ✅ | ✅ | ✅ | On |
| Assistant escalation | — | ✅ | ✅ | On |
| Appointment in 1h | ✅ | ✅ | — | On |
| Weekly digest | — | — | ✅ | On |

### To Kieron (Operator)

| Event | Email | In-app | Default |
|---|---|---|---|
| New lead | ✅ | ✅ | On |
| Subscription started | ✅ | ✅ | On |
| Subscription cancelled | ✅ | ✅ | On |
| Payment failed | ✅ | ✅ | On |
| Suspicious activity detected | ✅ | ✅ | On |
| Indexed page count dropped | ✅ | ✅ | On |
| Automation rule error | ✅ | ✅ | On |
| Weekly business digest | ✅ | — | On |

### To the client

| Event | SMS | Email | Push | Class |
|---|---|---|---|---|
| Lead acknowledgement | ✅ | — | — | Transactional |
| Welcome / onboarding | ✅ | ✅ | — | Transactional |
| **Plan ready** | ✅ | ✅ | ✅ | Transactional |
| Plan unopened 3 days | — | ✅ | ✅ | Transactional |
| Coach replied to your comment | — | — | ✅ | Transactional |
| Payment due in 3 days | — | ✅ | — | Transactional |
| Payment due today, unpaid | ✅ | ✅ | — | Transactional |
| Overdue day 3 / 7 | ✅ / — | — / ✅ | — | Transactional |
| Payment receipt | — | ✅ | — | Transactional |
| Payment failed | ✅ | ✅ | — | Transactional |
| Card expiring | — | ✅ | — | Transactional |
| Trial ending in 2 days | — | ✅ | ✅ | Transactional |
| Session reminder 24h / 1h | ✅ | — | ✅ | Transactional |
| Race week | — | ✅ | ✅ | Transactional |
| Weekly Q&A published | — | ✅ | ✅ | **Marketing** |
| New content / newsletter | — | ✅ | — | **Marketing** |
| Upgrade prompt | — | ✅ | ✅ | **Marketing** |

⚠️ **The Class column is legally load-bearing.** Marketing requires opt-in and is blocked
after opt-out; transactional continues. The `classification` field on `message_templates` is
NOT NULL for this reason (HARD-RULES §11).

---

## 5. GLOBAL GUARDRAILS

- **Max 3 automated messages per client per day**, across all channels and rules combined
- **Quiet hours 21:00–08:00** in the recipient's timezone — queue, don't drop
- Deduplicate: the same rule cannot fire twice for the same client within its cooldown
- Every automated send writes to `messages` with its `automation_rule_id`
- **Global kill switch** disables all automated sending instantly
- **Dry-run mode** shows exactly who would receive what, without sending
- SMS cost logged per message; monthly spend visible in Finance

---

## 6. COST MODEL — SO NOBODY IS SURPRISED

Rough monthly at 200 clients and 2,000 Hub subscribers:

| Service | Estimate |
|---|---|
| Twilio SMS (~8 per client per month, UK) | £70–110 |
| Resend (50k emails) | £15 |
| Stripe (1.5% + 20p, UK cards) | ~2% of revenue |
| PostHog (EU, 1M events) | £0–40 |
| Anthropic API (assistant) | £40–120 — depends heavily on usage |
| Vercel Pro | £16 |
| Postgres | £20–50 |
| **Total** | **~£180–350/mo + card fees** |

SMS is the largest variable and the easiest to overspend. Every SMS in the matrix above must
be justifiable — which is why plan-open notifications are capped at first-open rather than
every-open (spec/11 §3).
