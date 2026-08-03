# ACTION-REQUIRED.md

Updated 3 August 2026, after the new Supabase project was set up and loaded
with real HYROX data.

**There is one thing left, and it takes about thirty seconds.**

---

## 1. Send me the secret API key

The new results project is live, the schema is applied and it already holds real
race results. The only thing the application cannot do yet is *read* it, because
that goes over the Supabase API and needs the secret key. I have the database
password, which lets me do schema and bulk work over `psql`, but it is not an
API key and cannot be turned into one — the JWT secret is not exposed to SQL.

**Where:**

1. https://supabase.com/dashboard/project/fsuaovtszewuimtuluzb/settings/api-keys
2. Find the key labelled **`secret`** (or **`service_role`** on the legacy tab)
3. Click reveal, copy it, and paste it to me

It begins `sb_secret_…` (or `eyJ…` if it is the legacy service_role JWT). Either
works.

**What I will do the moment it arrives**, without you touching anything else:

- set `RESULTS_SUPABASE_SECRET_KEY` locally and in Vercel production
- run `scripts/verify-results-repo.mjs`, which exercises every repository method
  against the real database, including the one thing SQL cannot check: that
  PostgREST resolves the athlete embed the ranking endpoint depends on
- run the catalogue sync and the ingest workers against the live source for real
- confirm `/api/results/v1/*` returns 200 with real data instead of 503
- report back with what is in the database

**Do not** send me the `publishable` key again — that one is safe to be public
and cannot read these tables, because every results table has RLS on with no
policies.

---

## 2. Two optional monitors, whenever you like

Neither blocks anything.

| What | Where | Why |
|---|---|---|
| **Heartbeat** | Free account at cron-job.org → create a "cron monitor" expecting a ping every hour → send me the URL | Alerts when a sync *stops running*. Error tracking cannot catch that, and it is the failure that goes unnoticed for weeks. |
| **Sentry DSN** | Your Sentry project settings | Exceptions with context. `@sentry/nextjs` is already installed. |

## 3. Vercel spend cap

vercel.com → your team → **Settings → Billing → Spend Management**. Two minutes.
It is the backstop that stops a bug in a worker becoming a bill. I left it alone
because it is a billing setting.

---

## Done — no action needed

- ✅ **New Supabase project created and configured**: `fsuaovtszewuimtuluzb`.
  Schema applied, 11 tables, RLS on all 11, erasure function, settings seeded.
- ✅ **Real HYROX data loaded**: 340 results across three divisions of a real
  London weekend, 417 athletes, eight stations of splits each, 54 station
  distributions. Loading it twice leaves 340 rows, not 680.
- ✅ **Kept separate from the application's Supabase project.** Repointing the
  shared variables would have broken admin login, the quiz and the customer
  list, since none of those tables exist in the new project.
- ✅ **`RESULTS_SUPABASE_URL` set** locally and in Vercel production.
- ✅ **Vercel is on Pro** — checked, not assumed. Nothing spent against the £100.
- ✅ **`CRON_SECRET`, `HYROX_SOURCE_ACCESS`, `HYROX_MAX_REQUESTS_PER_MINUTE`**
  set in production. Worker triggers reject unauthenticated calls; verified
  against the deployed site.
- ✅ **Six cron schedules** registered.
- ✅ **531 tests green**, plus five live tests that really do contact
  results.hyrox.com and are skipped by default.

---

## Still my call, not yours, and not yet

`NEXT_PUBLIC_DATA_MODE` stays `demo` until the key lands, the workers have run
for real, and you have looked at the data. Flipping it swaps the public site
from synthetic to ingested results and makes the section indexable, so it
happens once, deliberately, with you watching.

⚠️ Note for when we do: another terminal added `RESULTS_SOURCE` routing to
`lib/results/index.ts`, and an explicit `RESULTS_SOURCE` **beats** the mode
flag. It is unset in production, which is correct. If it ever gets set, flipping
`NEXT_PUBLIC_DATA_MODE` will silently do nothing.

---

## One housekeeping note

You pasted the database password in chat, so it is in this conversation's
history and in my local `.env.local` (which is gitignored — I checked). It is
not in git and not in Vercel. If you would rather rotate it later:
Supabase → **Settings → Database → Reset database password**. Nothing I have
built depends on that specific value.
