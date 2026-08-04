# ACTION REQUIRED

## 1. Upgrade the Supabase compute size — everything is blocked on this

**Project:** `fsuaovtszewuimtuluzb` (the results database)
**Where:** Supabase dashboard → the project → **Settings → Compute and Disk**
**Change:** Micro → **Small or Medium**

### Why

The database is **974 MB on an instance with 224 MB of memory** (Micro, 1 GB RAM).
Nothing stays cached, so every query reads from disk. Measured directly, with
nothing else running:

| Query | Time |
| --- | --- |
| Count 223 events | 0.6s |
| Search athletes by name | **43s** |
| Count 630,287 results | **110s** |

A healthy Postgres counts millions of rows a second. This manages about 5,700.

It has knock-on effects that look like unrelated bugs:

- **PostgREST is currently down** (Cloudflare 522). Supabase's API layer gave up
  waiting on queries like those, so `/api/results/*` returns errors even though
  the database itself answers.
- **Production builds fail.** They read the database while generating pages, and
  the reads time out.
- **Search is unusable.** The trigram index that makes `name ILIKE '%smith%'`
  fast cannot be rebuilt — every attempt saturates the instance and takes the
  API down with it.

This is not a query problem. The query work is done: narrow projections, keyset
pagination, a precomputed record board, partial indexes, batched writes. A
110-second count of 630k rows is a machine problem.

### Cost

Small (2 GB) or Medium (4 GB), roughly $15–60/month — inside the £100 authorised.
Small holds the current working set; Medium leaves headroom as the archive grows.

### What happens immediately after

The restart also brings PostgREST back, which fixes the current API outage. Then:

1. Rebuild the trigram index — search goes from 43s to roughly 200ms
2. `VACUUM ANALYZE` and re-measure every serving call
3. Deploy the current code (it is committed and ready)
4. Verify the journey end to end: search "Sutherland" → open the athlete → see
   their races

---

## 2. Pro station weights (not blocking)

`spec.mensPro` / `spec.womensPro` in `lib/hyrox-stations.ts` are deliberately
unset, so the race-spec table on each station guide shows Open only. They are
real published standards, but the Open figures already in the repo disagree with
public sources on the sled stations, and a guide that quotes a race weight wrong
is worse than one that stays quiet. Fill them from the official rules and the
rows appear by themselves.

---

## State of the data (all ingested, nothing outstanding)

- 223 events, 208 final · ~630,000 results · every one of 2,692 divisions pulled
- Leaderboards verified against the source — Barcelona 2023's women's board
  reads Aoife Fay, Victoria Cartmell, Oihane Salcedo González, exactly as HYROX
  publishes it
- `NEXT_PUBLIC_DATA_MODE=live` is set in production; `RESULTS_SOURCE` is unset,
  so nothing outranks it
- 1,120 tests pass

Known and written up in `docs/results/REPORT.md`: partner identities on team
divisions are still merged for divisions pulled before that fix, which affects
some athlete profile pages rather than any leaderboard. The cron corrects them
as it re-pulls.
