# ACTION-REQUIRED.md

Things only you can do, Kieron. Everything else is built and tested.

Ordered by what unblocks the most. **Item 1 is the one that decides whether any
of this ever ingests a single row.**

---

## 1. Get HYROX to say yes in a way their servers can see

**Status: blocking all live ingestion. Nothing else unblocks it.**

`results.hyrox.com/robots.txt` says:

```
User-agent: *
Disallow: /
Allow: /.well-known/
```

A blanket disallow, for every agent, over the whole site. Separately, their edge
returns **403 to any User-Agent that is not a browser** — including the honest,
self-identifying one the brief requires us to send.

So automated ingestion today would mean overriding an explicit refusal *and*
disguising our server as a browser to get past a deliberate block. I have not
shipped that, and I would not recommend it: it risks the IP being banned, it
breaks the responsible-fetching rule the brief calls sacred, and it puts the
business on the wrong side of an argument it does not need to have.

The brief says you have confirmed with HYROX that using publicly available
results data is permitted. I have no reason to doubt that — but a verbal
permission is invisible to their edge. Any **one** of these makes it visible and
unblocks ingestion the same day:

1. **Ask them to allowlist our User-Agent.** This is the cheapest fix. Send them:
   ```
   SuthPerformanceResultsBot/1.0 (+https://www.suthperformance.com/about; contact: hello@suthperformance.com)
   ```
   Ask for it to be allowed through the ELB on `results.hyrox.com`.
2. **Ask for a feed or API access** (mika:Timing may offer one commercially).
   Better than scraping in every respect.
3. **Get the permission in writing**, naming automated access specifically, from
   someone at HYROX with authority to grant it. Then the robots directive is
   knowingly overridden by the rights-holder rather than by us. Keep the email.

**When you have one of them:**

```sh
vercel env add HYROX_SOURCE_ACCESS production   # value: authorised
```

That single variable turns the whole engine on. Nothing else changes.
Until it is set, the fetcher refuses to make a single outbound request and the
console shows "Ingestion paused" with this reason spelled out.

Detail and evidence: `docs/results/SOURCE.md` §1.

---

## 2. Restore Supabase and confirm it is on Pro

**Status: blocking the production database. The engine runs without it, on an
in-memory store, but nothing persists.**

`iiezxhzbissemvsfytwl.supabase.co` does not resolve — the project is paused.

1. Unpause it at https://supabase.com/dashboard.
2. **Confirm the Pro tier.** Daily backups and the restore path in the runbook
   depend on it; the free tier has no daily backups, and the resilience story in
   the brief assumes them.
3. Apply the migration:
   ```sh
   node scripts/apply-pending-migrations.mjs   # or paste 0101 into the SQL editor
   ```
   The file is `supabase/migrations/0101_results_engine.sql`.
4. Run the verification script, which exercises every repository method against
   the real database:
   ```sh
   node scripts/verify-results-repo.mjs
   ```
   This is the thing that turns the ⚠️ at the top of
   `lib/results/engine/supabase-repo.ts` into a tick. Until it passes, treat that
   file as compiled-but-unproven — the behavioural tests all run against the
   in-memory store.

---

## 3. Confirm Vercel is on Pro, and set the spend cap

**Status: the live poller's cron schedule needs it.**

- `vercel.json` now schedules `/api/cron/results-live` **every minute**. Hobby
  plans cannot run minute-level crons; on Hobby it silently will not fire at the
  rate live racing needs.
- **Enable the spend cap** (Settings → Billing → Spend Management). Brief §13
  asks for it explicitly, and it is the backstop that stops a loop in a worker
  from becoming a bill.

---

## 4. Set the remaining environment variables

I cannot read or set these for you where they are secret. All are optional
except `CRON_SECRET`, which is a security control.

| Variable | Why | Value |
|---|---|---|
| `CRON_SECRET` | **Required.** Protects every worker trigger. Unset means *closed*, so the crons will refuse to run until it is set. | Generate: `openssl rand -hex 32` |
| `HYROX_SOURCE_ACCESS` | Item 1 above. | `authorised`, once permission exists |
| `NEXT_PUBLIC_DATA_MODE` | `live` switches the site to ingested data and hides the "Demo data" pill. **Leave as `demo` until items 1 and 2 are done**, or the site will serve an empty database. | `demo` → `live` |
| `HEARTBEAT_URL_CATALOG` | Dead-man's switch. Free tier of cron-job.org, Better Stack or UptimeRobot. Create a "heartbeat"/"cron monitor" expecting a ping every hour, paste its URL here. Without it, a sync that *stops running* is invisible. | Monitor URL |
| `SENTRY_DSN` | Error tracking. `@sentry/nextjs` is already a dependency. | From Sentry |
| `HYROX_MAX_REQUESTS_PER_MINUTE` | Global outbound cap. Default 20. Lower it if HYROX ask. | `20` |

Set them with `vercel env add <NAME> production`.

---

## 5. Two editorial calls that are yours

- **Demo data on a live site.** The results section currently ships 76,185
  synthetic races. While `noindex` is on, that is honest. If you flip indexing
  before real data lands, it is not. Either keep `demo` mode's "Demo data" pill
  visible, or hold the results section back from indexing until item 1 lands.
- **The attribution wording.** Every API response credits mika:Timing. Once real
  data is flowing, that credit needs to be visible on the results pages
  themselves, not only in the payload. I have wired the data; the placement is a
  design call I would rather you approve than assume.

---

## What is NOT waiting on you

Everything else. Schema, adapters, parser, normaliser, validation, quarantine,
catalog sync, backfill, live self-arming, realtime fan-out, the serving API, the
real `LiveDataSource`, resilience, the correctness layer, the operator console,
erasure and claim — all built, and all proven by 469 passing tests that need no
database, no network and no permission from anyone.
