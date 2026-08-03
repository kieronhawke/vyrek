# ACTION-REQUIRED.md

What is left for you, Kieron. Short list, because most of it is done.

Updated 3 August 2026, after the engine was pointed at the live source and
verified end to end.

---

## 1. Unpause Supabase — the only thing blocking live data

**This is the whole list, really. Everything else below is optional or nice to
have.**

`iiezxhzbissemvsfytwl.supabase.co` does not resolve, so the project is paused.
I cannot unpause it: it needs a dashboard login, and there is no management
token on this machine.

1. https://supabase.com/dashboard → the project → **Restore / Unpause**.
2. Confirm it is on **Pro**. Daily backups and the restore procedure in the
   runbook depend on it.
3. Apply the migration:
   ```sh
   node scripts/apply-pending-migrations.mjs
   ```
   (or paste `supabase/migrations/0101_results_engine.sql` into the SQL editor)
4. Verify the production repository against the real database:
   ```sh
   node --env-file=.env.local scripts/verify-results-repo.mjs
   ```
   It writes and removes a throwaway event, so it is safe against production.
   Passing this is what turns the ⚠️ at the top of
   `lib/results/engine/supabase-repo.ts` into a tick — everything else is
   already proven against the in-memory store and against the live source.
5. Then tell me, or run it yourself:
   ```sh
   curl -H "Authorization: Bearer $CRON_SECRET" \
     https://www.suthperformance.com/api/cron/results-catalog
   ```
   and watch `/admin/results-engine`.

Until this is done, `/api/results/v1/*` returns **503 STORE_UNAVAILABLE**,
which is correct behaviour, and the public site carries on serving demo data
with the pill visible.

---

## 2. Two optional monitors

Neither blocks anything; both are free and make failures visible.

| Variable | What it buys | How |
|---|---|---|
| `HEARTBEAT_URL_CATALOG` | Alerts when a sync **stops running**, which error tracking cannot catch. This is the failure that goes unnoticed for a fortnight. | Free account at cron-job.org / Better Stack / UptimeRobot → create a heartbeat or "cron monitor" expecting a ping every hour → paste its URL |
| `SENTRY_DSN` | Exceptions with context. `@sentry/nextjs` is already a dependency. | From your Sentry project |

```sh
vercel env add HEARTBEAT_URL_CATALOG production
vercel env add SENTRY_DSN production
```

I did not create these accounts because they need an email address and a
password that are yours.

---

## 3. Enable the Vercel spend cap

Dashboard → Settings → Billing → **Spend Management**. Brief §13 asks for it and
it is the backstop that stops a bug in a worker becoming a bill. It is a
billing control, so I left it to you rather than changing your billing settings.

---

## 4. One decision, when the data is real

`NEXT_PUBLIC_DATA_MODE` is still `demo`. Flipping it to `live`:

- swaps the site from 76,185 synthetic races to ingested ones,
- hides the "Demo data" pill,
- makes the results section indexable,
- turns on the mika:Timing credit on every results view.

Do it **after** step 1 and after the catalog sync has actually run, or the site
will serve an empty database. It is a build-time variable, so the deploy has to
be rebuilt after changing it.

```sh
vercel env rm NEXT_PUBLIC_DATA_MODE production
vercel env add NEXT_PUBLIC_DATA_MODE production   # value: live
```

---

## Done, no action needed

For the record, so you are not chasing things that are finished:

- ✅ **Vercel is on Pro** — checked, not assumed. The minute-level live cron will run.
- ✅ **`CRON_SECRET` generated and set** in production. Worker triggers reject
  unauthenticated calls; verified against the deployed site (401).
- ✅ **`HYROX_SOURCE_ACCESS=authorised`** and `HYROX_MAX_REQUESTS_PER_MINUTE=20` set.
- ✅ **Six cron schedules registered** in `vercel.json` (live, catalog,
  reconcile, backfill, splits, plus the pre-existing race-coverage).
- ✅ **Ingestion verified against the live source**: 153 real results from one
  division in 4 requests, 0 quarantined, published count matched, splits
  reconciling to within 0.2% of finish times, re-sync writing 0 rows.
- ✅ **Deployed to production.**
