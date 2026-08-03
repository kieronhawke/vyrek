# Restoring the app database

The Supabase project this app pointed at — `iiezxhzbissemvsfytwl` — has been
deleted. Its DNS returns NXDOMAIN, so every call fails at the network layer
rather than with an error the app can handle.

**What that breaks right now:** admin login, member login at `/app`, customer
records, and the account the client should land in after paying. Everything
else — the quiz, the booking diary, lead capture, the emails and texts, the
onboarding flow, Stripe checkout — runs without it, because it is on Redis or
needs no storage at all.

**What it does not break:** the results engine. That lives on a separate,
still-live project and is configured through `RESULTS_SUPABASE_URL` and
`RESULTS_SUPABASE_SECRET_KEY`. Do not point those at the new project, and do
not run migrations `0101`–`0104` on it — they belong to the results project.

---

## What to do

### 1. Create the project

1. Go to <https://supabase.com/dashboard>, sign in.
2. **New project.** Free tier is enough.
   - Name: `suth-performance`
   - Region: **London (eu-west-2)** — the clients and the Vercel functions
     are both in the UK, and every millisecond here is on the page load.
   - Save the database password somewhere; you will not need it for the app
     but you will need it to get back in.
3. Wait for it to finish provisioning (about two minutes).

### 2. Run the migrations

In the dashboard: **SQL Editor → New query**. Paste and run each file from
`supabase/migrations/` **in numerical order**, skipping the results ones:

```
0001_init.sql
0002_quiz_v3.sql
0003_partner_programme.sql
0004_admin_observability.sql
0004_consultation_requests.sql
0005_live_presence.sql
0006_stripe_events.sql
0100_control_centre_identity.sql
```

Skip `0101`–`0104`. They are the results engine and belong to the other
project.

### 3. Create Ben's admin login

**Authentication → Users → Add user → Create new user.**

- Email: the address that is first in `ADMIN_EMAILS`
- Password: whatever you like, give it to Ben
- Tick **Auto Confirm User**, or he will not be able to sign in

The admin gate is an allowlist on `ADMIN_EMAILS`, not a role in the database,
so nothing else is needed. Anybody who signs in with an address not on that
list is bounced.

### 4. Send me three values

**Project Settings → API:**

| What | Looks like |
| --- | --- |
| Project URL | `https://xxxxxxxx.supabase.co` |
| Publishable / anon key | a long `eyJ…` string |
| Secret / service_role key | a different long `eyJ…` string |

The secret key bypasses row-level security. Treat it like a password: it goes
in `.env.local` (gitignored) and in Vercel's encrypted environment variables,
and nowhere else. **This repository is public.**

### 5. Then I will

- Put them in `.env.local` and Vercel (all three environments)
- Run `node scripts/check-supabase.mjs` to prove the connection and that
  every table the app touches exists
- Wire account creation into the end of onboarding, so paying lands the
  client in their own account rather than on a confirmation page
- Verify admin login, member login, and the whole journey end to end

---

## Seeding the first admin by hand

Done on 3 August 2026 against `yqaucesppyjpozrbetkf`, and worth writing
down because it fails in a way that points at the wrong thing.

`auth.users` has no unique constraint on `email` — Supabase allows the same
address across providers — so `on conflict (email)` does not compile. Delete
and insert instead.

A row inserted by hand also needs:

1. **A matching `auth.identities` row.** Without it, sign-in returns
   `Database error querying schema`.
2. **Empty strings, not NULL, in every token column** — `confirmation_token`,
   `recovery_token`, `email_change_token_new`, `email_change`. GoTrue scans
   these into non-nullable Go strings, so a NULL is a 500 on every sign-in.
   It reports the same `Database error querying schema`, which points at the
   schema rather than at the row that actually causes it. This is the trap;
   it cost twenty minutes.

```sql
update auth.users set
  confirmation_token         = coalesce(confirmation_token, ''),
  recovery_token             = coalesce(recovery_token, ''),
  email_change_token_new     = coalesce(email_change_token_new, ''),
  email_change               = coalesce(email_change, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change               = coalesce(phone_change, ''),
  phone_change_token         = coalesce(phone_change_token, ''),
  reauthentication_token     = coalesce(reauthentication_token, '')
where email = '<the admin address>';
```

Using the dashboard's **Add user** button avoids all of this. Only reach for
SQL when there is no dashboard access.

---

## Checking it yourself

Once the keys are in `.env.local`:

```
node scripts/check-supabase.mjs
```

It reports whether the project answers, which tables are present, and which
are missing — so a half-run migration shows up here rather than as a broken
page three days later.
