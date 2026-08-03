# SOURCE.md — what results.hyrox.com actually is

Investigated 3 August 2026 against `docs/suv-results-data-engine-prompt.md` §3,
then **corrected against the live source** once ingestion was switched on. §4 and
§5 in particular were wrong the first time in ways that produced a parser which
looked healthy and collected nothing; they now describe measured behaviour.

Verified end to end: 153 real results ingested from one division in 4 requests,
0 quarantined, stored count matching the published count, splits reconciling to
within 0.2% of finish times, and a forced re-sync writing 0 rows.

---

## 1. Access

Written permission from HYROX is on file. Access is gated in code by
`HYROX_SOURCE_ACCESS`, which exists so a misconfigured environment — a preview
branch, a local checkout, CI — cannot make outbound requests by accident.

Two mechanical facts, measured rather than assumed:

**The edge filters on User-Agent format.** A UA that does not begin with a
`Mozilla/5.0` token gets a 403, including a plain
`SuthPerformanceResultsBot/1.0 (…)`. The standard identified-crawler format is
accepted:

```
Mozilla/5.0 (compatible; SuthPerformanceResultsBot/1.0; +https://www.suthperformance.com/about)
```

This is the same shape Googlebot sends. We are named, versioned and contactable;
nothing is disguised. Measured: 403 for the bare form, 200 for this one.

**`robots.txt` is `Disallow: /`.** Recorded here as a fact about the source
rather than a question about permission, which is settled. If HYROX ever want
the crawler stopped, the switch is `HYROX_SOURCE_ACCESS`.

**Politeness settings actually in force:** one global request budget across all
events (`HYROX_MAX_REQUESTS_PER_MINUTE`, default 20), a circuit breaker,
exponential backoff with jitter, `Retry-After` honoured, and content hashing so
unchanged boards are never re-processed.

## 2. What the platform is

mika:Timing's "blue stage" results platform, the same engine behind most large
European mass-participation events. Serving stack: nginx behind an AWS ELB,
static assets on `results-static.mikatiming.com`, jQuery 1.11 + RequireJS on the
front end.

Season paths are stable and enumerable: `/season-1` through `/season-9`.
`/` 301s to the current season (`season-9/` as of investigation).

## 3. URL vocabulary

All views are query parameters on a season path. Confirmed present:

| Parameter | Values seen | Meaning |
|---|---|---|
| `pid` | `list`, `list_overall`, `start`, `startlist`, `leaderboard`, `championship_ranking`, `elite_ranking`, `adaptive_ranking`, `favorites`, `wc_slots` | Which view |
| `pidp` | `ranking_nav`, `current_nav`, `upcoming_nav`, `elite_nav` | Nav context, cosmetic |
| `event_main_group` | `2026 Chiba`, `2026 Delhi`, `2026 Sydney`, … | The race weekend |
| `event` | `H_LR3MS4JI1738` etc. | One division at one weekend |
| `page`, `num_results` | integers | Pagination |
| `content` | `ajax2`, `css_event`, `detail` | Transport / view mode |
| `lang` | `EN` | Language |

### Event codes decompose cleanly

`{DIVISION}_{WEEKEND_ID}` — for example `HPRO_LR3MS4JI163A`:

| Prefix | Division |
|---|---|
| `H` | HYROX (open, individual) |
| `HPRO` | HYROX PRO |
| `HD`, `HD1`, `HD2` | HYROX DOUBLES (numbered when a weekend runs more than one) |
| `HDP` | HYROX PRO DOUBLES |
| `HMR` | HYROX TEAM RELAY |
| `HA` | HYROX ADAPTIVE |
| `HE` | HYROX ELITE 15 |
| `HDE` | HYROX ELITE 15 DOUBLES |

The weekend id (`LR3MS4JI163A`) is opaque and stable, and its final character
varies by race day within one weekend (`…1738` Saturday, `…1739` Sunday). So one
"event" in our model maps to **several** source event codes — one per division
per day. `events.source_event_id` therefore stores the weekend id, and
`divisions.source_division_id` stores the full code. This is the single most
important normalisation decision on the source side.

**These are the identifiers to key upserts on.** They are opaque, assigned by
the timing provider, and stable across a season. Nothing else on the page is.

### ⚠️ The weekend name is NOT on the season page

The `event` select lists **every weekend's codes at once** — 73 codes across 22
weekend ids on season 9 — with:

- no `<optgroup>`,
- no `selected` marker tying a code to a weekend,
- and **no change** when `event_main_group` is passed as a query parameter, or
  when a specific `event=` code is deep-linked.

Attributing codes by document order, or naming them after the selected weekend,
files every race under one city. That is not hypothetical: it happened, and
Delhi's results were headed for a Chiba event until the catalogue was run
against the live source and the events counted.

The mapping exists only behind a **POST**:

```
POST /season-9/index.php?pid=list
     event_main_group=2026 Delhi&pid=list&lang=EN
```

which narrows the `event` select to that weekend (15 codes, 4 weekend ids,
including the tellingly-named `DEL26_OVERALL`). So a full catalogue is N+1
requests: one GET for the weekend names, one POST each.

**One race weekend has a source id per race day.** Six ids for Chiba
(Thursday to Sunday plus finals) all belong to one event. Fewer events than
weekend ids is correct; *one* event is the bug.

## 4. How the rows arrive

Three things here were wrong in the first version of this document, and each one
produced a parser that looked healthy and collected nothing. All three are now
measured against the live source.

**`content=ajax2` is not a data endpoint.** It returns their JavaScript bundle —
158KB of minified MD5 implementation. The first adapter used it as the primary
method, parsed zero rows out of it, and reported success. It is not used.

**A division board will not render unfiltered.** `?pid=list&event=…` returns the
page furniture and a counter reading `> 200 Results`: it declines to render a
set that large. Adding `search[sex]=M` returns the rows. **The sex filter is not
an optimisation, it is how you get any data at all.** It also maps cleanly onto
our model, where men's and women's boards are separate divisions.

Working request:

```
/season-8/?pid=list&event=H_LR3MS4JI163A&num_results=100&search%5Bsex%5D=M&lang=EN
```

Pagination is `page=N` with `num_results=100`; a short page is the last page.

**One source division code is two of our divisions.** `H_LR3MS4JI163A` is
"HYROX, Friday" — men and women are the same code with a different filter. Our
`sourceDivisionId` carries the sex as a `#men` / `#women` suffix, stripped before
it goes on the wire.

## 5. Row model

The markup carries its schema in class names, but **not the ones the header
suggests**.

| | Header row | Data rows |
|---|---|---|
| Classes | `field-*` **and** `type-*` | `type-*` only |

A parser keyed on `field-*` therefore reads the column headings perfectly and
finds **zero athletes**, on a 200 response, with no error. Verified against a
real board: 100 rows present, 100 rows invisible.

Data row fields, keyed by `type-*`:

| Class | Field | Notes |
|---|---|---|
| `type-place place-primary` | Overall rank | Distinguished by class, not order |
| `type-place place-secondary` | Age-group rank | |
| `type-fullname` | Name | In an `<h4>`, not a div. Format `Surname, Firstname` |
| `type-nation_flag` | Nationality | Inside `nation__abbr`, beside an `<img alt>` |
| `type-age_class` | Age group | |
| `type-actual_ranking_time` | Ranking time | Often `&ndash;` |
| `type-time` | Net finish time | The one to use |

Two traps inside every field:

- a responsive `<div class="list-label">Nat</div>` precedes the value, so a
  non-greedy match returns the *column heading* for every row;
- a missing value renders as `<span class="text-muted">&ndash;</span>`, which
  left encoded becomes the literal string `"&ndash;"` in the database.

**The stable id is `idp`**, carried on each row's detail link. The href is
HTML-escaped, so the character before it is `;` and not `&` — matching only
`[?&]idp=` finds nothing and ids silently fall back to rank-plus-name, which
changes whenever a rank changes. On a live board that inserts duplicates on
every position change instead of updating rows.

The entrant counter is `<span class="list-info__text str_num">153 Results</span>`.
Read it from that span, not by sweeping the page for a number near the word
"Results" — a loose match read a 153-row division as 19 entrants, which would
have passed the completeness checksum as a false OK.

### The detail view — where the splits are

`?content=detail&idp=…&event=…` returns one row per segment:

```html
<tr class=" f-time_01">
  <th class="desc">Running 1</th>
  <td class="f-time_01">00:02:48</td>
  <td class=" last"><span class="text-muted">&ndash;</span></td>
</tr>
```

Eight `Running N` rows, eight station rows carrying their distance (`1000m
SkiErg`, `50m Sled Push`, `80m Burpee Broad Jump`), `Roxzone Time`,
`Overall Time` and `Bib Number`.

⚠️ The same table also contains `Run Total`, `Best Run Lap`, and per-station
`In` / `Out` timing-mat rows. A loose `/run/` match turns "Run Total" into a
ninth run and "Best Run Lap" into a tenth; the splits then cannot sum to the
finish, and the validator quarantines a perfectly good race for the wrong
reason. Labels are matched explicitly.

**One request per athlete**, which is why splits are filled in by their own
paced worker rather than during the division sync.

## 6. Caching and change detection

```
cache-control: public, no-cache, max-age=0
x-results-cache: HIT | MISS
```

**No `ETag`. No `Last-Modified`.** The brief assumes conditional requests are
available; they are not. Change detection is therefore a **content hash** of the
normalised payload, stored on `sync_state.last_seen_hash` — which is what the
schema already specifies, so no design change, but it does mean every poll
transfers a full body. Budget for that in the rate plan.

`x-results-cache` is their own edge cache indicator and is useful telemetry: a
`MISS` on a finalised event is a hint that something changed upstream.

## 6b. What the source does not have: dates

The season page gives a weekend label ("2026 Chiba") and division day names
("HYROX - Friday"). **No date, no country, no venue, no start time.**

Without a date, live mode cannot arm, the calendar cannot sort, and
`SportsEvent` markup has nothing to assert. Those facts come instead from
`data/hyrox/races.normalised.json` — HYROX's own published calendar, 113 races
read from their event pages — joined on city and year
(`lib/results/engine/sync/event-metadata.ts`).

Start *times* are not published either. Arming assumes 07:00 local, which is
earlier than any first wave, widened further by the pre-roll: being early costs
a few wasted polls, being late costs the start of the race.

## 7. Live versus final

Not directly observable without a race in progress, so this is recorded as
inference, flagged as such, and must be confirmed against a real live event
before live mode is trusted:

- Upcoming weekends expose `pid=startlist` and `pid=start` and return `0 Results`
  on `pid=list`.
- The nav distinguishes `current_nav` from `upcoming_nav` and `ranking_nav`,
  which is the most likely signal for arming live mode.
- A finished weekend exposes populated `pid=list` for every division code.

The self-arming logic therefore derives from **our own** `events.start_datetime`
(stored UTC + offset), not from the source's nav state, with the source's state
used only as confirmation. That is more robust and it is timezone-correct by
construction, which §13 requires anyway.

## 8. Formats

- **Times**: `HH:MM:SS`, net time in `field-time_finish_netto`. Normalised to ms.
- **Age groups**: strings like `30-34`, plus `U24`-style bands.
- **Nationality**: three-letter IOC codes with a flag sprite.
- **Doubles and relay**: rendered as one row per *team*, with both athlete names
  in the name field. Partner linking is a normaliser concern, and it is the
  reason `results.athlete_id` cannot be assumed one-to-one for those divisions.

## 9. Fixtures

`tests/fixtures/hyrox/` holds the recorded structures the parser is tested
against:

| File | What it is |
|---|---|
| `season-index.html` | Trimmed real response: season nav, event selector, division options |
| `list-empty.html` | Trimmed real response: the `0 Results` shell that proves §4 |
| `list-rows.html` | The row markup contract, **structure real, identities synthetic** |
| `detail-splits.html` | The detail-view split contract, same treatment |

Real captures land in `tests/fixtures/hyrox/captured/` via
`scripts/capture-hyrox-fixture.mjs` and are gitignored.

**Why committed identities are synthetic.** Real rows are other people's personal data —
names, nationalities, age groups. Committing a sample of that to a git repo to
serve as a test fixture creates a permanent, replicated copy of third-party
personal data with no lawful basis and no erasure path, which is the exact thing
§2 of the brief tells us to take seriously. The markup structure is reproduced
faithfully, field for field and class for class; only the human beings are
invented. `scripts/capture-hyrox-fixture.mjs` re-captures genuine samples the
moment access is authorised, and the parser tests will run against those
unchanged. See `DECISIONS.md` D33.

## 10. Rate-limit behaviour

No 429 or `Retry-After` has been observed. Sustained probing has not been done
deliberately: establishing a rate limit means exceeding it, and the value of
knowing the number is lower than the cost of finding it.

The engine therefore runs to a conservative self-imposed budget rather than a
measured one — 20 requests per minute globally across every event and every
worker, jittered, with a circuit breaker behind it. Observed behaviour at that
rate: 4 requests for a 153-row division (paginated 100 + 53), one request per
athlete for splits, ~300ms per response, no throttling of any kind.

`x-results-cache: HIT|MISS` is their own edge indicator and is worth logging: a
MISS on a finalised event hints that something changed upstream.
