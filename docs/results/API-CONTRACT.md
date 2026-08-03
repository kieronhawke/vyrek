# Results API — how the frontend consumes it

The v1 API already exists in this repo at `app/api/results/v1/*`, built by the
data-engine lane. `lib/results/api-source.ts` is aligned to those exact routes.

```bash
RESULTS_SOURCE=api
RESULTS_API_URL=https://www.suthperformance.com/api/results/v1
RESULTS_API_KEY=…            # optional, sent as Authorization: Bearer
```

Set those and redeploy. **No code changes.**

> Server-rendering against the same deployment adds a network hop for no gain.
> Use `RESULTS_SOURCE=api` when the frontend is consumed from a *different*
> deployment, or when testing the adapter. Same-deployment rendering should use
> the direct source (`NEXT_PUBLIC_DATA_MODE=live`).

## The envelope

**Every v1 response is wrapped.** The adapter unwraps `data` and keeps the
attribution:

```json
{ "data": …,
  "attribution": { "timing": "mika:Timing", "organiser": "HYROX",
                   "note": "Results data is timed and published by mika:Timing for HYROX.",
                   "url": "https://results.hyrox.com/" },
  "mode": "demo" }
```

**Attribution is not decorative.** The underlying results are mika:Timing's
work published for HYROX, and any page showing them has to credit that.
`lastAttribution()` in the adapter exposes whatever the API actually returned,
so the credit follows the data rather than being hard-coded.

## Live route map

| Frontend method | v1 route |
|---|---|
| `listEvents` | `GET /events?season&region&status` |
| `getEvent` | `GET /event/{slug}` |
| `getRanking` | `GET /ranking/{event}-{division}?cursor&ageGroup&q&limit` |
| `getResult` | `GET /result/{id}` |
| `getAthlete` | `GET /athlete/{slug}` |
| `getStarters` | `GET /starters/{slug}` |
| `searchAll` | `GET /search?q=` |
| `getRecords` | `GET /records` |
| `getDivisionFinishTimes` | `GET /finish-times?event&division` |
| `getStationDistribution` | `GET /distribution?station&division` |
| — | `GET /health` — store kind, reachability, event count, ingestion state |

`limit` is capped at **500** server-side. The adapter asks for 500 rather than
pretending to request everything, so a "give me the whole division" call
returns a known page rather than a silent truncation.

---

## Payload shapes

- **JSON only.** Every response is `application/json`.
- **404 means "does not exist"** and renders the not-found page. Any other
  non-2xx is treated as an outage: the page degrades rather than crashing.
- **8-second timeout** per request. Anything slower is treated as failed.
- **Times are integer seconds**, never strings. `5490`, not `"1:31:30"`.
- **Rank 1 is the fastest finisher.** Derive it; do not pass through a source
  system's ranking, because they disagree about ties and DNFs.
- **DNFs are excluded from ranking** and carry `status: "dnf"`.

## Endpoints

### `GET /events?season&region&status`
`EventSummary[]`. Empty array, never 404, when filters match nothing.

```json
[{ "slug": "s9-2026-london", "name": "HYROX London 2026", "city": "London",
   "iata": "LON", "country": "United Kingdom", "countryIso": "gb",
   "region": "Europe", "venue": "ExCeL London", "season": "s9", "year": 2026,
   "startDate": "2026-05-16", "endDate": "2026-05-17",
   "status": "finished", "totalAthletes": 14037 }]
```
`status` is one of `upcoming` | `live` | `finished`. `countryIso` is lowercase
ISO-3166 alpha-2 — it drives the flag. `iata` drives the city mark; if you have
no code for a venue, send the first three letters of the city.

### `GET /event/{slug}`
`EventSummary` plus `divisions: EventDivisionSummary[]`.

```json
{ "…": "…", "divisions": [
  { "divisionCode": "hyrox-men", "label": "HYROX Men", "headline": true,
    "athleteCount": 3400, "finisherCount": 3221,
    "leaderTimeSeconds": 3273, "leaderAthleteSlug": "zachary-patel",
    "leaderAthleteName": "Zachary Patel",
    "waves": [{ "wave": 1, "time": "08:00", "athletes": 30 }] }]}
```
`divisionCode` must be one of the codes in `lib/results/types.ts`. Translate
your own naming at the boundary — the UI never sees source codes.

### `GET /ranking/{event}-{division}?cursor&ageGroup&q&limit`
`RankingPage`. `limit` is capped at 500 server-side.

```json
{ "eventSlug": "…", "eventName": "…", "division": "hyrox-men",
  "divisionLabel": "HYROX Men", "total": 3221, "fieldSize": 3221,
  "leaderTimeSeconds": 3273, "nextCursor": "100",
  "rows": [{ "id": "s9-2026-london-hyrox-men-1", "rank": 1, "ageGroupRank": 1,
             "athleteSlug": "zachary-patel", "athleteName": "Zachary Patel",
             "countryIso": "gb", "ageGroup": "30-34",
             "finishSeconds": 3273, "gapToLeaderSeconds": 0,
             "status": "finished" }]}
```
`gapToLeaderSeconds` may be computed by you or left at 0 — the UI derives it
either way. `id` must be **stable**: it is the permanent URL of that race.

### `GET /result/{id}`
`ResultDetail` — one race, fully split, plus the division averages.

```json
{ "id": "…", "eventSlug": "…", "eventName": "…", "eventCity": "London",
  "division": "hyrox-men", "divisionLabel": "HYROX Men",
  "athleteSlug": "…", "athleteName": "…", "countryIso": "gb",
  "ageGroup": "30-34", "rank": 1600, "ageGroupRank": 288,
  "finishSeconds": 5490, "status": "finished",
  "runs": [318, 320, 322, 324, 326, 328, 330, 332],
  "stations": { "ski-erg": 250, "sled-push": 150, "sled-pull": 220,
                "burpee-broad-jump": 310, "row": 260, "farmers-carry": 90,
                "sandbag-lunges": 280, "wall-balls": 350 },
  "roxzoneSeconds": 360, "fieldSize": 3221, "leaderTimeSeconds": 3273,
  "divisionAverage": { "runs": [...8], "stations": { …8 },
                       "roxzone": 380, "finish": 5520 }}
```
`divisionAverage` should be **precomputed per event and division**. Do not
aggregate it per request — that is what the whole analysis layer reads.

### `GET /athlete/{slug}`
`AthleteProfile` with the full race history.

```json
{ "slug": "…", "name": "…", "countryIso": "gb", "gender": "men",
  "ageGroup": "30-34", "isPlaceholder": false,
  "pbSeconds": 5490, "divisionsRaced": ["hyrox-men"], "seasonsActive": ["s8","s9"],
  "races": [{ "eventSlug": "…", "eventCity": "London", "season": "s9",
              "year": 2026, "date": "2026-05-16", "division": "hyrox-men",
              "divisionLabel": "HYROX Men", "rank": 1600, "ageGroupRank": 288,
              "finishSeconds": 5490, "resultId": "…" }]}
```

### `GET /starters/{slug}`
`StartList` — waves with their athletes.

### `GET /search?q=`
`{ athletes: […], events: […] }`. Backs a keystroke-driven palette, so it needs
to be fast; a stale answer beats a slow one. Ranking is applied client-side by
`lib/results/search.ts`, so return generous matches rather than a strict subset.

### `GET /finish-times?event&division`
`number[]`, **ascending**. Just the finish times.

Its own endpoint because result pages call it on every render and building it
from result rows cost 5.5s LCP. Serve it from an indexed column.

### `GET /records`
`RecordsBoard` — the fastest time per division.

Flag whether records are **ratified**. An unratified record published as fact
is a correction waiting to happen.

### `GET /distribution?station&division`
Either a `Distribution` object or a raw `number[]` of samples — whichever is
cheaper for you. The app builds the histogram either way.

---

## The one decision that is expensive to change

**Decide athlete identity first.** Every athlete URL depends on `slug` being
stable across events and seasons. Timing exports usually key on name + DOB
rather than a durable id, and if slugs churn, every link, every share card and
every indexed page breaks at once. This is the one decision that is expensive
to change later.

## Testing against it

```bash
RESULTS_SOURCE=api RESULTS_API_URL=http://localhost:4000/v1 pnpm dev -p 3005
```

Then run the existing suite — it is source-agnostic:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3005 npx playwright test tests/visual/results-section.spec.ts
```

If those 96 checks pass against the API, the platform is running on it correctly.

## Until it exists

Nothing is blocked. `scripts/import-results.ts` takes a CSV export today and
writes the same shapes to `data/results-live/` — see `DATA-IMPORT.md`. The API
replaces that pipeline; it does not gate it.
