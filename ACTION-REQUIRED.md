# ACTION-REQUIRED.md

Updated 3 August 2026, after the results database went live with real data.

**Nothing is blocking. The engine is built, connected, verified against the real
database, and holding real HYROX results.**

What follows is three optional items and one decision that is yours to time.

---

## 1. Decision: when to point the public site at real data

`NEXT_PUBLIC_DATA_MODE` is still `demo`, deliberately. Flipping it to `live`:

- swaps the results section from 76,185 synthetic races to ingested ones
- hides the "Demo data" pill
- makes the section indexable
- turns on the mika:Timing credit on every results view

Right now the database holds three divisions of one real weekend plus the
season-9 catalogue. That is enough to prove the pipeline, not enough to be a
results site. **My recommendation: leave it on `demo` until the backfill has
run for a few days**, then flip it once and watch.

When you want it:

```sh
vercel env add NEXT_PUBLIC_DATA_MODE production   # value: live
```

It is inlined at build time, so the deploy has to be rebuilt after changing it.
Tell me and I will do it and verify.

⚠️ One trap for that day: another terminal added `RESULTS_SOURCE` routing to
`lib/results/index.ts`, and an explicit `RESULTS_SOURCE` **beats** the mode
flag. It is unset in production, which is correct. If it ever gets set,
flipping `NEXT_PUBLIC_DATA_MODE` will silently do nothing.

---

## 2. Optional: two monitors

Neither blocks anything. Both need an account with your email.

| What | Where | Why |
|---|---|---|
| **Heartbeat** | Free account at cron-job.org → create a "cron monitor" expecting a ping every hour → send me the URL | Alerts when a sync *stops running*. Error tracking cannot catch that; it is the failure that goes unnoticed for weeks. |
| **Sentry DSN** | Your Sentry project settings | Exceptions with context. `@sentry/nextjs` is already installed. |

## 3. Optional: Vercel spend cap

vercel.com → your team → **Settings → Billing → Spend Management**. Two minutes.
The backstop that stops a bug in a worker becoming a bill. I left it alone
because it is a billing setting.

## 4. Optional: rotate the database password

You pasted it in chat, so it is in this conversation's history and in my local
`.env.local` (gitignored — checked). It is not in git and not in Vercel. If you
would rather rotate it: Supabase → **Settings → Database → Reset database
password**. Nothing I have built depends on that value; the application uses the
API key, not the password.

---

## Done — no action needed

- ✅ **Results database live**: project `fsuaovtszewuimtuluzb`, schema applied,
  11 tables, RLS on all 11, erasure function, settings seeded.
- ✅ **Kept separate from the application's Supabase project**, which holds
  identity, customers, quiz and Stripe. Repointing the shared variables would
  have broken admin login and the customer list.
- ✅ **Repository verified against the real database** — all ten checks,
  including that PostgREST resolves the athlete embed `getRanking` depends on,
  which no amount of SQL testing would have caught.
- ✅ **Real HYROX data ingested by the real workers**: the season-9 catalogue
  (8 events, 146 divisions, dated and timezone-resolved), plus three divisions
  of a real London weekend — 340 results, 417 athletes, 31 with full splits and
  climbing as the splits worker runs.
- ✅ **Every serving method returns real data** through the same contract the
  frontend reads: rankings, athlete profiles, race breakdowns, search, records,
  finish-time distributions.
- ✅ **All environment variables set** in Vercel production:
  `RESULTS_SUPABASE_URL`, `RESULTS_SUPABASE_SECRET_KEY`, `CRON_SECRET`,
  `HYROX_SOURCE_ACCESS`, `HYROX_MAX_REQUESTS_PER_MINUTE`.
- ✅ **Six cron schedules** registered and access-controlled.
- ✅ **Vercel on Pro** — checked, not assumed. Nothing spent against the £100.
- ✅ **550 tests green**, plus seven live tests that really contact
  results.hyrox.com and the real database, skipped by default.
