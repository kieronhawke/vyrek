# Existing clients: onto card payment

*5 September 2026. Builds on the 29 August flow (name, email, mobile, rate,
date, send). Read `lib/onboarding/schedule.ts` first if you read one file.*

## What Ben does

`/admin/clients`. Six fields:

| Field | Meaning |
|---|---|
| Name, Email, Mobile | Who, and where the link goes. Either channel is enough. |
| **Owed today** (optional) | A balance they owe him now: a month in arrears, a block coached before the card existed. Blank means nothing. |
| Monthly rate | The rate they agreed. |
| First monthly payment | Today, or a date up to 31 days out (Stripe's own ceiling for a billing anchor). |

Then **Review before sending**. The server validates everything, renders the
real text message and the real email, and returns them without sending or
storing anything. Ben sees:

- who it goes to, on which channels, with the mobile in the form Twilio will dial
- the money as a table, in the client's own words
- the text, word for word, with its segment count and sender
- the email as it will render, with its subject and from address
- honest warnings: a reserved test number, email or texts not configured

Only then is there a **Send to {first name}** button. Back to edit keeps
everything typed. After sending, the row appears in the sent list with the
balance beside the rate, and offers **Cancel link** (the link stops resolving)
and **Send again** (pre-fills the form from the row).

## What the client does

Opens the link. Three screens: welcome (both money lines), details plus a
password, card. The card screen says the rate, what comes out today, and what
comes out monthly from when. Stripe takes the card. The welcome page after
Stripe says, in the past tense, what was taken and what is scheduled.

Their account is **billing-only**: subscription facts, Manage billing (Stripe's
portal), Request a change, and a "Coming to your account" note for training.
No rail, no tabs. Ben flips them to the full app from their customer page when
that is ready. This is the `member_mode: "billing"` mechanism from 12 August,
unchanged.

## What Ben receives when they finish

Email to every admin address and a text to every admin mobile, from
`lib/billing/notify.ts`, the moment the subscription row is inserted (which is
the dedupe: the welcome page and the webhook both activate, one inserts). The
email is "Client set up: Sam · £60/mo · £100 taken today" with a table of what
happened. The text: `CLIENT SET UP: Sam - £60/mo from 1 Oct (+£100 taken
today). Card on file.`

## The one hard constraint, and the three shapes

Stripe Checkout refuses a one-off line beside a future `billing_cycle_anchor`
with `proration_behavior: "none"`:

> You cannot set `proration_behavior` to `none` in a Checkout Session with
> one-time prices.

Measured on the test API, 5 September. The alternatives were all worse:

- **Default proration** charges a slice of the first month today. Wrong money.
- **`trial_end`** makes Stripe call it a free trial on the checkout page and
  in its emails, and refuses inside 48 hours. Rejected on 29 August for the
  same reason; not reopened.
- **Charge the balance off-session after a £0 subscription checkout**: the
  client sees "£0 today" then a £100 charge appears. Confusing, and an
  off-session first charge is where SCA declines happen.

So `paymentSchedule()` picks one of three shapes from balance × date, and the
checkout route builds that session:

| Owed today | Starts | Shape | What Stripe does |
|---|---|---|---|
| no | today | `subscription` | The existing path. First month now, monthly after. |
| no | later | `subscription` | Existing path with the anchor: £0 now, full amount on the date. |
| yes | today | `subscription-with-balance` | One subscription checkout, balance as a second one-off line. Measured: £100 + £60 → one £160 invoice, £60 next month. |
| yes | later | `balance-then-subscription` | A **payment** checkout takes the balance now and saves the card (`setup_future_usage: off_session`, `customer_creation: always`). On completion, activation creates the subscription itself via the Subscriptions API with the anchor and no proration, which that API allows. Measured: £100 paid, no invoice today, £60 on the date. |

The last shape is the new mechanism. `ensureDeferredSubscription()` in
`lib/onboarding/activation.ts`:

- runs from both activation callers (welcome page, webhook)
- searches the customer's subscriptions for one stamped with this session id,
  and reuses it
- otherwise creates one with a Stripe idempotency key `deferred-sub:{session}`,
  the saved payment method from the payment intent, and the anchor recomputed
  from the stamped date. If the date has passed since checkout, no anchor:
  the first month charges now, which is what the date meant.
- on any failure returns `ok:false`, so the webhook 500s and Stripe
  redelivers. The balance has been taken; giving up is not an option.

The checkout page for that shape states the monthly arrangement under the pay
button via `custom_text.submit`, so Stripe's own screen says the whole of it.

## One place for the words

Every surface used to assemble its own sentence from `amount` and `startsOn`.
None of them could say "£100 today" and the welcome page could say "nothing
has been taken yet" to somebody who had just paid a balance. Now:

- `scheduleLines()` — before the card: "£100 today, for your outstanding
  balance." / "Then £60 a month from Tuesday 1 October, on the same day each
  month."
- `scheduleAfterLines()` — after the card, past tense: "£100 has been taken
  today for your outstanding balance, and your card is saved."
- `scheduleRows()` — the table for the email panel and Ben's review
- `scheduleSms()` — "£100 today, then £60/mo from 1 Oct", plain GSM-7

The invite email, the text, the welcome screen, the card screen, the welcome
page, the "you're in" email and Ben's alert all read from these. The schedule
is resolved **as of the checkout** (`session.created`) when read back, so a
webhook redelivered days later still describes the arrangement the client saw.

## What travels in the link

`dueTodayPence` joins `amountPence` and `startDay` on the signed token
(compact key `d`) and in the stored payload. Same rules: signed so it cannot
be edited, bounds-checked on the way out (£1 to £10,000, its own band because
arrears can exceed a month), and **absent rather than zero** when nothing is
owed, so a link without a balance is exactly the length it was. The text
still fits one segment at the top of both bands with a long first name;
`invite-cost.test.ts` holds that line.

## Cancelling a link

`DELETE /api/onboarding/invite/{id}` removes the stored row. The link then
resolves as "expired", whose copy tells the client to ask Ben for a new one.
Nothing can be charged by a link that no longer opens. A signed-token
fallback link (store down at send time) has no row; the admin does not offer
the button for those.

## What is still Kieron's

- **Stripe is in test mode in production.** Nothing here takes real money
  until the live keys go into Vercel. Every checkout in this document was
  a `4242` card.
- Ben's alert goes to his personal mobile and both his addresses, hardcoded
  in `lib/admin/recipients.ts`. Test runs reach him too; see the note in the
  verification section.

## Verification, 5 September 2026

All against a production build served locally, the live Supabase project and
the Stripe **test** account. Every checkout below was paid for real on
Stripe's hosted page with `4242 4242 4242 4242`.

**Unit.** 1,761 tests pass. New: `schedule.test.ts` (the four arrangements,
the past-tense lines, GSM-7 safety, the passed-date collapse),
`due-today.test.ts` (signed and stored balance: round trip, tamper, bounds),
`activation-deferred.test.ts` (idempotency key, anchor with no proration,
reuse of an existing subscription, refusal without a saved card),
`invite-cost.test.ts` extended (one segment at the top of both bands with a
long first name). The one failing test in the suite, `lead-brief.test.ts`,
predates this work and fails only on a machine west of UTC.

**Browser spec** (`tests/visual/existing-client-setup.spec.ts`): Ben's form →
review panel (text verbatim, rendered email in a frame, money table, reserved
number refused before send) → back to edit keeps values → send → sent list
shows the balance → client's three screens carry both money lines → cancel
link → link reads as expired. Passes on the six-device matrix.

**Real checkouts, one per shape**, then the `checkout.session.completed`
webhook replayed twice, signed with the local secret:

| Shape | Stripe result | Then |
|---|---|---|
| nothing owed, from the 15th | subscription checkout, £0 today, `no_payment_required`; subscription active, anchor 15 Sept 09:00 London; upcoming invoice £60 on the 15th | welcome page: "Your card is saved and nothing has been taken yet. Your first payment of £60 is on Tuesday 15 September…" |
| £100 owed, from today | one invoice, £160 paid: "Outstanding balance" £100 + "Coaching" £60; upcoming £60 in a month | "£160 has been taken today: £100 outstanding balance plus £60 for your first month." |
| £100 owed, from the 15th | **payment** checkout, £100 paid; Stripe's page showed "Then £60 a month from Tuesday 15 September, taken automatically from this card"; the server created the subscription: active, anchor 15 Sept 09:00, no invoice today, `checkout_session` stamped; upcoming £60 on the 15th | "£100 has been taken today for your outstanding balance, and your card is saved. £60 a month comes out from Tuesday 15 September…" |

In every case: one customers row with the Stripe customer id, one
subscriptions row (active), the auth user in `member_mode: "billing"`, and
the webhook replays returned 200 without a second subscription or a second
email. A fourth checkout was completed with **no server listening** on the
return URL, then activated by webhook replay alone: account, customer and
subscription all created from the webhook path.

**The client's account.** Signed in with the password chosen before the
card: lands on the account page; no training rail or tabs; "Active", "Next
payment 15 September", "£60 a month", "Visa ending 4242, expires 12/34",
"Training: Carries on with Ben as normal", the "Coming to your account"
note; Manage billing, Request a change and Cancel present. `/app/today` and
`/app/plan` both redirect to `/app/account`.

**Live channels, one full run.** Resend delivered the invite ("E2E, set up
your payments"), the client's "your account is ready", and Ben's alert
("Client set up: E2E balance later … · £60/mo · £100 taken today") — one copy
per admin address, verified in the inbox. **Twilio refused the text with
error 20003 (Authenticate)**: the `TWILIO_AUTH_TOKEN` in both
`~/code/vyrek/.env.local` and `~/code/vyrek-app/.env.local` returns 401 from
Twilio's own account endpoint. That is a credential problem, not a code one:
the message body, segment count and sender were all correct in the review
panel and the response reported the failure honestly. Production's token
lives in Vercel and cannot be read back, and the Vercel runtime-log query
timed out twice, so whether production texts currently send is **unverified**.
The fix is Kieron's: a fresh auth token from the Twilio console into Vercel
and both `.env.local` files.

**Side effect worth knowing.** The Stripe test account's webhook endpoint
points at production, so every test checkout also reached the live site's
webhook. That is how it has always been configured; it produced "Payment
received" emails from production for the £160 invoices, and no conflicts,
because every write is idempotent on natural keys.

**Harness.** `scripts/e2e/` holds the scripts that did this: `drive-checkout`
(one shape end to end through Stripe), `replay-webhook` (the closed-tab path),
`check-account` (the billing-only portal as the client), `cleanup` (removes
everything they create). They read `.env.local` and need
`E2E_ADMIN_PASSWORD` for an admin login that is in `ADMIN_EMAILS`.
