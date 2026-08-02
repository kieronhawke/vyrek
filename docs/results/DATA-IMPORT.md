# Pushing real data through the Results platform

Two commands and one environment variable. No code changes.

```bash
node scripts/import-results.ts results.csv --dry-run   # validate, write nothing
node scripts/import-results.ts results.csv             # write data/results-live/
```

Then set `NEXT_PUBLIC_DATA_MODE=live` **in Vercel** and redeploy.

---

## Why it has to be set in Vercel, not the shell

`NEXT_PUBLIC_*` variables are inlined at **build** time, not read at runtime.
Setting the variable when starting the server does nothing — the value was
already baked in. Set it in the Vercel project's environment variables and
redeploy. (Verified: the same shell variable passed to `pnpm start` had no
effect; passed at build, everything switched.)

## The CSV

One row per athlete per race. Case-insensitive headers, any column order.

**Required:** `event_slug`, `division`, `athlete_name`, `finish`

**Event metadata** (read from the first row of each event):
`event_name`, `event_city`, `event_country`, `event_date`, `event_venue`,
`event_status`

**Splits** — optional, but the analysis pages are the product:
`run_1`…`run_8`, `ski_erg`, `sled_push`, `sled_pull`, `burpee_broad_jump`,
`row`, `farmers_carry`, `sandbag_lunges`, `wall_balls`, `roxzone`

**Athlete detail:** `nationality` (ISO-2, e.g. `gb`), `age_group` (e.g. `30-34`)

Times accept `1:31:30`, `91:30`, `5:56`, or plain seconds. `DNF`, `DNS`, `DQ`,
`withdrawn` and `-` are all understood as non-finishes.

```csv
event_slug,event_name,event_city,event_date,event_venue,division,athlete_name,nationality,age_group,finish,run_1,...,roxzone
s10-2026-leeds,HYROX Leeds 2026,Leeds,2026-09-05,First Direct Arena,hyrox-men,Owen Fletcher,gb,25-29,1:24:40,4:52,...,5:40
```

`division` must be one of the codes in `lib/results/types.ts` — `hyrox-men`,
`hyrox-women`, `hyrox-pro-men`, `hyrox-doubles-mixed` and so on.

## What the importer guarantees

- **All-or-nothing.** Any error and nothing is written. A half-imported event
  looks fine and is wrong, which is worse than no import.
- **Ranking is derived, never trusted.** Sources disagree about ties and DNFs;
  the whole section assumes rank 1 is the fastest finisher, so it re-ranks.
- **DNFs are kept**, excluded from ranking, and shown as DNF.
- **Bad times are rejected, not coerced.** A finish column reading
  "about an hour" fails the row rather than becoming `0`.
- **Partial splits are kept with a warning.** A finish time alone is still a
  result; you are told how many rows will have thin analysis pages.
- **Reference splits are recomputed**, so the simulator and percentile tool
  work off real distributions immediately.

## What flipping to live changes

| | demo | live |
|---|---|---|
| Data | `data/results-demo/` (generated) | `data/results-live/` (imported) |
| "Demo data" pill | shown | hidden |
| Results `robots` | `noindex` | inherits the site default |
| `sitemap-results.xml` | empty | every event, ranking, athlete and guide |

Note the site currently sets `noindex` **sitewide** in `app/layout.tsx`, and
individual routes opt back in. Flipping the data mode removes the Results
section's own noindex but does not override that sitewide switch — that one is
yours, and deliberately separate.

## Streaming feeds, later

`lib/results/live-source.stub.ts` is for a *push* feed (live timing during a
race), not for file imports. It carries typed TODOs for each method. Wire it up
and set `RESULTS_SOURCE=feed`. Decide **athlete identity** before you do:
feeds usually key on name + DOB rather than a durable id, and athlete URLs
depend on it.
