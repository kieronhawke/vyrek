# ADMIN CONTROL CENTRE — FULL SPECIFICATION

**Slots into the handover pack as:** `09-admin-control-centre.md`
**Prepared:** 30 July 2026

---

## 0. THE DESIGN CONSTRAINT THAT DRIVES EVERYTHING

Ben is not a heavy computer user. He is the face of the brand, the coach, and the person
clients actually want to hear from — and he will abandon this tool the moment it feels like
software.

**This is not a usability nice-to-have. It is the primary architectural constraint.**

If the admin is built as one dashboard with a "simple view" toggle, Ben will not use it.
Kieron will end up doing all of Ben's admin, which defeats the point and does not scale.

### The answer: two genuinely separate interfaces on one backend

| | **Coach Mode (Ben)** | **Operator Mode (Kieron)** |
|---|---|---|
| Route | `/coach` | `/admin` |
| Primary device | **Mobile first** — he's in a gym, not at a desk | Desktop first |
| Mental model | "What needs me today?" | "What is the state of the business?" |
| Screens | 5 | 13 modules |
| Financial detail | None. Never sees Stripe internals, MRR, or churn. | Everything |
| Destructive actions | Cannot delete clients, cancel subscriptions, or issue refunds | Full control |
| Language | "Sarah hasn't opened her plan in 8 days" | "engagement_flag: plan_unopened_7d" |

**Coach Mode is five screens, nothing more:**

1. **Today** — who needs a reply, whose plan is due, who's gone quiet
2. **My Clients** — photo, name, next race, last contact, one-tap message
3. **Plans** — approve, tweak, send. Draft is pre-built by the system; Ben edits and hits send.
4. **Messages** — a single inbox. SMS and email look identical to him.
5. **Diary** — today and this week. Tap to confirm or reschedule.

Every Coach Mode action is one tap plus a confirm. No multi-step forms. No modals stacked
on modals. No jargon. Undo available on everything reversible.

**Rule for the build:** if a feature cannot be expressed as a single sentence a coach would
say out loud, it does not belong in Coach Mode.

---

## 1. MODULE MAP

| # | Module | Coach | Operator |
|---|---|---|---|
| 1 | Dashboard | ✅ Today view | ✅ Business view |
| 2 | Leads | ⚪ read-only | ✅ |
| 3 | Clients | ✅ simplified | ✅ full |
| 4 | Training Plans | ✅ core tool | ✅ |
| 5 | Payments & Subscriptions | ❌ | ✅ |
| 6 | Finance | ❌ | ✅ |
| 7 | Diary | ✅ | ✅ |
| 8 | Communications | ✅ simplified | ✅ full |
| 9 | Activity & Analytics | ❌ | ✅ |
| 10 | SEO | ❌ | ✅ |
| 11 | Marketing Assets | ✅ download only | ✅ |
| 12 | Website Settings | ⚪ limited fields | ✅ |
| 13 | Accounts & Security | ❌ | ✅ |

---

## 2. LEADS

### Intake
Every quiz completion, contact form submission, and coaching application creates a Lead
record. Source, campaign, referrer, and landing page captured automatically.

### On creation — automated, immediate

**1. SMS acknowledgement to the lead** (within 60 seconds)

> Hi [first name] — Ben here. Thanks for getting in touch with SUV Athletic. I've got your
> details and I'll come back to you personally within 24 hours. Any questions in the
> meantime, just reply to this message.
>
> Reply STOP to opt out.

Sent from Ben's name, not a brand alias. The whole positioning is personal access, and
this is the first touchpoint — it should feel like a person, immediately.

**2. Push + SMS to admin** with lead name, goal, segment, and source.

### Lead pipeline
`New → Contacted → Qualified → Trial → Client` / `Lost` (with reason)

### Automation
- Lead untouched after 24h → escalating nudge to admin
- Lead untouched after 72h → flag on dashboard as at-risk
- Quiz abandoned mid-flow (email captured, not completed) → separate nurture sequence
- Duplicate detection on email and phone before creating a record

### Views
Kanban by stage, table with filters, single lead detail with full timeline (every message,
page view, and status change in one chronological feed).

---

## 3. CLIENTS

The heart of the system.

### Client profile
- Identity: name, photos, DOB, location, timezone, contact
- **Health data:** injuries, conditions, medications, limitations *(see §14 — this is
  special category data under UK GDPR and needs handling accordingly)*
- Training: equipment access, days available, session length, gym
- Performance: PBs, race history, current benchmarks, linked Results Hub athlete ID
- Goals: target race, target time, secondary goals
- Commercial: tier, monthly rate, billing method, subscription status, lifetime value
- Engagement: last login, last workout logged, plan open rate, last contact date
- Notes: threaded, timestamped, author-attributed, pinnable

### Actions
Edit any field · adjust monthly rate (with effective date and reason) · pause · cancel ·
reactivate · change tier · assign coach · merge duplicates · archive · export (GDPR SAR) ·
delete/anonymise

### The client list
Card and table views. Filters on status, tier, segment, engagement flag, payment state,
next race. Saved segments. Bulk actions with an explicit confirm step and a dry-run preview
of who will be affected.

### Engagement flags (auto-computed, surfaced to Ben in plain English)
- Plan not opened in 7 days
- No workout logged in 10 days
- Race in under 14 days *(prompt a personal message)*
- Payment failed
- Trial ending in 2 days
- Birthday this week
- New PB posted *(prompt a congratulations)*

That last one matters. Automated *congratulation prompts* are how the friendly motto shows
up in practice — the system spots the win, Ben sends the message.

---

## 4. TRAINING PLANS

### Plan builder
- Templates by goal, level, duration, equipment
- Week/day/session structure with drag-reorder
- Exercise library linked to the video library
- Per-session and per-exercise coach notes
- Version history with diff view — every change tracked, any version restorable
- Clone from another client, clone from template

### System-drafted, coach-approved
When a plan is due, the system **pre-builds a draft** from the client's quiz data,
equipment access, and current benchmarks. Ben opens it, adjusts what he wants, and sends.

This is the single biggest lever on whether he actually uses the tool. He should be editing,
never starting from blank.

### Branded PDF generation
- Chartreuse `#A3E635` on near-black, matching the site tokens
- Cover page: client name, plan title, date range, Ben's signature block
- Weekly overview, then per-session detail
- Exercise thumbnails, QR codes linking to demo videos
- Notes rendered as pull-quotes in Ben's voice
- Footer: page numbers, plan version, generated date
- Generated server-side, cached, versioned, stored against the client record

### Delivery
Send by email with PDF attached, in-app notification, and SMS nudge that it's live.
Track opened / downloaded / viewed-in-app. Unopened after 3 days → nudge.

---

## 5. PAYMENTS & SUBSCRIPTIONS

### Use Stripe. Do not rebuild billing.

Stripe Billing handles subscriptions, proration, retries, dunning, tax, and the customer
portal. Recreating any of that is wasted work and increases PCI exposure.

**Never store card details.** Card data never touches our servers or database.

### Two collection modes per client

**Automatic** — Stripe Subscription, card on file, collected monthly on the anniversary date.

**Manual** — client pays on an invoice. Admin clicks **Send Payment Link** and a Stripe
Payment Link goes out by SMS and email. One click, no configuration.

### Subscription actions
Start · pause (with resume date) · cancel (immediate or end-of-period) · change rate ·
change tier · apply discount or coupon · issue refund (partial or full) · extend trial ·
retry failed payment · update card (sends a secure Stripe portal link — admin never sees
the card)

### The dunning ladder

Escalating, but friendly throughout. Ben's brand is warmth; the payment chasing has to
sound like him, not like a debt collector.

| When | Channel | Tone |
|---|---|---|
| 3 days before due | Email | Heads-up, no action needed |
| Due date, unpaid | SMS + email | Light, assumes it's an oversight |
| Day 3 overdue | SMS | Friendly nudge, payment link |
| Day 7 overdue | Email from Ben | Personal, offers to talk if money is tight |
| Day 10 overdue | Admin alert | Human decision required — no automated message |
| Day 14 overdue | Admin action | Suggest pause, not cancel |

**Hard rule: never auto-cancel a client for non-payment.** After day 10 it becomes a human
conversation. Someone who's struggling financially and gets treated well comes back;
someone who gets auto-cancelled never does.

Copy for every one of these lives in the template library and is editable without a deploy.

### Payment views
All payments · overdue · failed · upcoming · refunded. Per-client payment history.
Reconciliation view against Stripe. Every state change written to the audit log.

---

## 6. FINANCE

### Live metrics
MRR · ARR · active subscriptions · new vs churned this month · churn rate · ARPU · LTV ·
trial conversion rate · outstanding receivables · overdue total · failed payment value ·
refunds issued · revenue by tier · revenue by country

### Views
- **Revenue** — monthly chart, cohort retention, tier breakdown
- **Receivables** — who owes what, how overdue, what chasing has happened, what's next
- **Chase log** — every reminder sent, every response, current escalation state per client
- **Forecast** — projected MRR from known subscriptions and renewal dates
- **Exports** — CSV for the accountant, monthly close pack, VAT-ready output

### Audit trail
**Every financial action is immutable and logged:** actor, timestamp, before value, after
value, reason, IP address. Rate changes, refunds, cancellations, discounts — all of it.
Append-only table, never updated or deleted.

This is both an internal control and a GDPR accountability asset.

---

## 7. DIARY

### Two-way Google Calendar sync with Ben's personal calendar

Ben should never have to check two calendars. His existing calendar is the source of truth
for his availability; the admin diary layers business events on top.

- Two-way sync via Google Calendar API
- Busy blocks from his personal calendar respected automatically — no double-booking
- Business events written back to his calendar with SUV Athletic prefixes
- Timezone-aware for international clients

### Event types
1:1 coaching session · consultation call · plan review · check-in call · race day ·
Ben's own training · personal/blocked

### Features
- Day, week, month views. Mobile view defaults to day.
- Client booking links with configurable availability windows and buffers
- Automatic reminders: 24h and 1h before, SMS and email
- Rescheduling flow that doesn't require admin involvement
- No-show tracking
- Recurring sessions
- Post-session notes that write straight to the client record

### Intelligence
- Surfaces clients not seen in 30+ days and suggests a check-in slot
- Flags a client with a race inside 14 days and no session booked
- Warns when a session is booked into a travel or race block

---

## 8. COMMUNICATIONS

### Unified inbox
SMS and email in one threaded view per client. Ben should not have to know or care which
channel a message arrived on.

### Sending
- One-off SMS to an individual
- One-off email to an individual
- Templated send with merge fields
- Bulk send to a saved segment — **with a mandatory preview and recipient-count confirm**
- Scheduled send

### Template library
Fully editable in the admin, no deploy required. Categorised:

**Leads** — acknowledgement, follow-up, qualification, application received
**Onboarding** — welcome, plan delivery, first-week check-in, app setup
**Payments** — due soon, due today, overdue ×3, failed, card expiring, receipt, refund
**Engagement** — plan nudge, quiet-client check-in, PB congratulations, birthday
**Race** — race week, taper reminder, good luck, results follow-up
**Admin** — session reminder, reschedule, cancellation

Each template: name, channel, subject (email), body, available merge fields, live preview,
version history.

### Merge fields
`{{first_name}}` `{{next_race}}` `{{race_date}}` `{{days_to_race}}` `{{target_time}}`
`{{current_pb}}` `{{plan_name}}` `{{amount_due}}` `{{due_date}}` `{{payment_link}}`
`{{coach_name}}` `{{last_session_date}}`

### Compliance built in
- **STOP keyword handling is mandatory and automatic** — any inbound STOP, UNSUBSCRIBE, or
  END sets `sms_opt_out = true` immediately and blocks all future marketing SMS
- Transactional SMS (payment, appointment, plan delivery) continues after opt-out where
  lawful; marketing SMS does not
- Consent state stored per channel per client, with timestamp and source
- Email unsubscribe link on all marketing email
- Quiet hours: no automated SMS between 21:00 and 08:00 in the recipient's timezone
- Full send log with delivery receipts, failures, and costs

---

## 9. ACTIVITY & ANALYTICS

This is the "same visibility as Green Buggy Hire" module. Specced from your description —
match it against the real implementation once I can see that code.

### Live activity feed
Real-time stream of what's happening on the site: page views, quiz starts, quiz completions,
signups, payments. Auto-refreshing.

### Session detail
Per session: session ID · visitor ID (cookie) · logged-in user if known · start and end
time · **total duration** · pages visited in order · **time on each page** · entry page ·
exit page · **referrer URL** · UTM parameters · device, browser, OS · **country, region,
city** · IP (see retention note) · events fired · conversion outcome

### Visitor profile
All sessions for a returning visitor stitched together. First seen, last seen, total
sessions, total time, pages viewed, whether they converted, and to what.

### Reports
Traffic by source, page performance with average time and exit rate, funnel from landing
through quiz to trial to paid, geographic breakdown, device split, returning vs new,
**page-level SEO performance joined to the keyword database**.

### Suspicious activity detection
- Repeated failed logins from one IP
- Logins from unexpected countries
- Rapid-fire form submissions (bot signature)
- Multiple accounts sharing a device fingerprint
- Admin actions outside normal hours or from a new location
- Unusual data export volume

Flagged to the Security view with a one-click block.

### Recommended stack
**PostHog** (self-hosted or EU cloud) covers session recording, page-level timing, funnels,
and feature flags in one tool and gives most of the above out of the box. Alternative:
Plausible or Umami for privacy-first basics plus a custom events table for the session
detail. Decide before building — retrofitting session stitching is painful.

---

## 10. SEO

Wires the keyword database into the admin so it's a living tool rather than a spreadsheet.

- Import `data/keywords.csv` — all 425 rows, with `buyer_type`, KD, volume, CPC, priority
- **Keyword → page mapping.** Which page targets which keyword. Flags unmapped keywords and
  orphaned pages.
- **Cannibalisation warnings** — two pages targeting the same keyword
- Rank tracking per keyword, with history and trend
- Search Console integration: impressions, clicks, CTR, average position per page
- **Content pipeline board** — planned / drafted / published / ranking, matching the CSV
  `status` column
- **Uniqueness validator dashboard** — which location pages are blocked and which fields are
  missing, so gaps get filled deliberately
- Indexed page count with an alert if it drops *(the early warning of an algorithmic filter)*
- Buyer-type filter on by default, so nobody accidentally builds for job-seeker keywords

---

## 11. MARKETING ASSETS

Central library so nobody is hunting for a logo in a WhatsApp thread.

- **Logos** — full lockup, wordmark, icon; light/dark; SVG, PNG, favicon
- **Brand tokens** — the colour palette with copy-to-clipboard hex values, type specimens
- **Email signatures** — per person, HTML and plain text, copy-to-clipboard
- **Photography** — approved images, tagged and searchable, with usage rights recorded and
  AI-generated assets clearly excluded
- **Templates** — social post sizes, story templates, plan PDF cover variants
- **Brand guide** — tone of voice, do/don't, the tagline lock
- Version control and an "approved for external use" flag on every asset

---

## 12. WEBSITE SETTINGS

Everything on the public site that should be changeable without a deploy.

- Homepage hero: headline, subhead, CTA text, background image
- Ben's bio, credentials, race record, achievement list
- Pricing: tier names, prices per currency, feature lists, what's highlighted
- Private coaching: spots available, application open/closed
- Testimonials — **real only, with a source field that cannot be left blank**
- FAQ content
- Announcement banner with schedule
- Feature flags: quiz on/off, Results Hub public/gated, trial length
- Legal page content
- Social links, contact details
- Maintenance mode

### Ben's editable subset
A short, safe list he can change from his phone without risk: his bio, his achievements,
his profile photo, his availability, coaching spots open or closed. Everything else is
Operator Mode.

---

## 13. ACCOUNTS & SECURITY

- Roles: **Owner** (Kieron) · **Coach** (Ben) · **Staff** · **Read-only**
- Granular permissions per module, defaulting to the two-mode split above
- Create, edit, suspend, delete users
- 2FA — mandatory for Owner and Staff, optional for Coach *(forcing it on Ben will cause
  friction; his role has no destructive permissions, so the risk is acceptable)*
- Session management with force-logout
- Password policy, secure reset flow
- **Full audit log** — every admin action: actor, timestamp, entity, before/after, IP
- Suspicious activity queue from §9
- IP allowlist option for Owner-level actions

---

## 14. DATA PROTECTION — MUST BE DESIGNED IN, NOT ADDED LATER

Three things here are legal requirements, not best practice.

### Health data is special category data
Injuries, conditions, medications and limitations fall under **UK GDPR Article 9**. That
requires:
- **Explicit consent** captured at collection, separately from general T&Cs, with a
  timestamp and a record of what was consented to
- Encryption at rest on those fields specifically
- Access logging on every read, not just writes
- A defined retention period

The quiz collects this data at screens 13 and 19. The consent capture has to be built into
the quiz, not bolted on afterwards.

### SMS requires PECR compliance
- Marketing SMS needs prior consent. Transactional does not.
- **The system must classify every template as transactional or marketing** and enforce
  opt-out state accordingly. Build this as a required field on the template model.
- STOP handling is automatic and immediate.

### Erasure vs financial retention — a real conflict
A client exercising their right to erasure conflicts with the HMRC requirement to retain
financial records for six years.

**The answer is anonymise, not delete.** Strip name, contact details, photos and health data;
retain the financial record against an anonymised customer ID. Build the deletion flow this
way from the start — a hard-delete cascade will either break the finance module or breach
retention obligations.

### Also required
- Cookie consent before any non-essential analytics fires
- IP addresses in session data: retain 30 days, then truncate the last octet
- Data export in a portable format for subject access requests
- Processor agreements with Stripe, Twilio, PostHog and the email provider
- Named DPO or responsible person recorded

---

## 15. AUTOMATION ENGINE

All automation runs through one rules engine rather than being scattered across the codebase.
Every rule is visible, editable, and pausable from the admin.

**Rule shape:** `TRIGGER → CONDITIONS → ACTIONS → COOLDOWN`

### Launch rule set

| Trigger | Action |
|---|---|
| Lead created | SMS ack to lead · notify admin |
| Lead untouched 24h | Nudge admin |
| Trial started | Welcome sequence |
| Trial ending 2 days | Conversion nudge |
| Plan sent | Delivery SMS |
| Plan unopened 3 days | Client nudge |
| No workout logged 10 days | Flag to Ben |
| New PB detected | Prompt Ben to congratulate |
| Payment due in 3 days | Client heads-up |
| Payment overdue | Dunning ladder (§5) |
| Payment failed | Stripe retry · notify admin |
| Card expiring 14 days | Ask client to update |
| Subscription cancelled | Exit sequence · notify admin |
| Session in 24h / 1h | Reminders |
| Race in 14 days | Prompt Ben · suggest a session |
| Race completed | Results follow-up |
| Client birthday | Prompt Ben |

### Guardrails
- **Global message cap per client per day** — prevents a bad rule interaction spamming someone
- Quiet hours enforced
- Every automated send logged and attributable to a rule
- **Global kill switch** for all automation
- Dry-run mode showing who would receive what, without sending

---

## 16. TECH STACK

| Concern | Recommendation | Why |
|---|---|---|
| Payments | **Stripe** (Billing, Payment Links, Customer Portal, Tax) | Dunning and PCI handled |
| SMS | **Twilio** | UK alphanumeric sender ID, delivery receipts, inbound webhooks for STOP |
| Email | **Resend** or **Postmark** | Transactional reliability; send from `mail.suvathletic.com` |
| Analytics | **PostHog** (EU) | Sessions, page timing, funnels in one tool |
| Calendar | **Google Calendar API** | Ben's existing calendar |
| PDF | **React-PDF** or **Puppeteer** | Server-side, brand-token consistent |
| Database | **Postgres** | Already planned for the Results Hub |
| Queue / cron | **Vercel Cron** + **Inngest** or **Trigger.dev** | Automation engine needs durable scheduled jobs |
| File storage | **Vercel Blob** or **S3** | Assets, PDFs, photos |
| Auth | **Clerk** or **Auth.js** | Roles, 2FA, session management |

Existing stack stays: Vercel, Sanity, Upstash Redis.

---

## 17. BUILD PHASES

**Phase A — Foundation**
Auth and roles · client and lead data model · audit log · admin shell with both modes ·
settings hub

**Phase B — Clients & Leads**
Lead intake and pipeline · lead SMS automation · client CRUD · notes · engagement flags ·
Coach Mode Today view

**Phase C — Money**
Stripe integration · subscription lifecycle · payment links · dunning ladder · finance
dashboard · receivables and chase log

**Phase D — Coaching Tools**
Plan builder · templates · versioning · branded PDF generation · delivery and tracking ·
system-drafted plans

**Phase E — Communications**
Unified inbox · template library · one-off and bulk sending · STOP handling · consent
management · automation engine

**Phase F — Diary**
Google Calendar two-way sync · booking links · reminders · session notes

**Phase G — Visibility**
Activity feed · session detail · visitor profiles · reports · suspicious activity ·
SEO module

**Phase H — Polish**
Marketing assets · Coach Mode refinement with Ben watching · mobile optimisation ·
onboarding walkthrough

**Test Phase D and H with Ben directly, on his phone, watching him use it without help.**
Whatever he hesitates on gets redesigned. That session is worth more than any amount of
internal review.

---

## 18. OPEN QUESTIONS

1. **Green Buggy Hire codebase** — needs to be shared for the activity module to be
   mirrored exactly rather than specced from description.
2. **Does Ben use Google Calendar?** The diary sync design assumes so. If it's Apple
   Calendar, the integration route changes (CalDAV, more fragile).
3. **Currencies at launch** — GBP only, or GBP + USD? Affects Stripe setup and the pricing
   model.
4. **VAT registration status** — determines whether Stripe Tax is needed from day one.
5. **Who is the responsible person for data protection?** Needs a name on record.
6. **Does Ben want inbound client SMS on his personal phone**, or only inside the admin?
   Affects the Twilio number setup.
7. **Manual-payment clients** — expected proportion? Determines how much polish the payment
   link flow needs.
