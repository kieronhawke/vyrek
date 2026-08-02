# SOURCE.md — what results.hyrox.com actually is

Investigated 3 August 2026, against `docs/suv-results-data-engine-prompt.md` §3.
Seven requests total, spaced, read-only. No crawler was run.

Read §1 before anything else. It changes what "live mode" means for this build.

---

## 1. The finding that outranks the rest: the source says no

`https://results.hyrox.com/robots.txt`:

```
User-agent: *
Disallow: /
Allow: /.well-known/
```

A blanket disallow, for every agent, over the entire site. There is no carve-out
for results pages.

Separately, the edge (an AWS ELB in front of nginx) **403s any User-Agent that
is not a browser**. An honest, self-identifying fetcher —

```
SuthPerformanceBot/1.0 (+https://www.suthperformance.com; contact ...)
```

— is refused at the door, including on `robots.txt` itself. Only a browser
User-Agent gets a 200.

Those two facts together are the whole problem:

| To ingest automatically, we would have to | Which is |
|---|---|
| Ignore an explicit `Disallow: /` | Overriding a machine-readable refusal |
| Send a browser User-Agent from a server worker | Evading a deliberate bot block by pretending to be something we are not |

The brief's own §2 calls responsible fetching "sacred" and requires "a clear,
honest User-Agent that names SUV Athletic and a contact URL". That instruction
and this source are in direct conflict: **the honest User-Agent is exactly the
one that gets refused.** You cannot obey both.

The brief also records that the site owner has confirmed with HYROX that using
publicly available results data is permitted. That may well be true, and nothing
here contradicts it — but a verbal permission is not visible to their edge, and
it is not visible to me. If the permission is real it is also cheap to make
machine-visible, and that is the fix:

1. HYROX or mika:Timing allowlist our named User-Agent, **or**
2. they supply a feed / API credentials, **or**
3. we get the permission in writing, naming automated access, so the robots
   directive is knowingly overridden by the rights-holder rather than by us.

Any one of those unblocks live ingestion the same day. See `ACTION-REQUIRED.md`.

**What this build does about it.** Everything is built. The HYROX adapter is
complete, tested, and wired end to end — and it is **gated behind
`HYROX_SOURCE_ACCESS`, which is unset by default**. Unset means the adapter
refuses to make a single outbound request and the engine runs on the replay and
demo sources instead. One environment variable flips it the day permission is
machine-visible. Nothing else changes. See `DECISIONS.md` D31–D34.

This is not the engine scaled down. Every item in the Definition of Done is
built and proven against recorded fixtures. The only thing waiting is pointing
it at a source that presently declines to be pointed at.

---

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

## 4. How the rows arrive — and why this matters

A plain `?pid=list` request returns the **page furniture only**: the division
selector, the column headers, and `0 Results`. Not one athlete row is
server-rendered.

Row data is fetched afterwards by their own JavaScript through
`?content=ajax2&client=js`. Any parser built against the plain HTML response
will parse a working page containing nothing, silently, forever — which is
precisely the failure mode the parser-shape sentinel in §13 of the brief exists
to catch. **The adapter's primary method must be the ajax2 endpoint, not the
page.**

## 5. Row model

The markup carries its schema in class names, which is the one genuinely
convenient thing about this platform. From the rendered header row:

| Class | Field |
|---|---|
| `field-place_all` | Overall rank |
| `field-place_age` | Age-group rank |
| `field-__fullname` | Athlete name |
| `field-__nation` | Nationality (flag + code) |
| `field-_type_age_class` | Age group |
| `field-__time` | Ranking time |
| `field-time_finish_netto` | Net finish time |

Rows are `<li class="list-group-item row">` inside
`<ul class="list-group list-group-multicolumn">`, with a `data-sex` attribute on
the wrapping column. Splits (the eight runs, eight stations and Roxzone) live on
the per-result detail view, keyed by `idp`, not in the list.

The parser keys on `field-*` class names rather than column position, so a
column reorder does not silently shift every value one to the left.

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
| `ajax2-page.json` | The ajax2 envelope shape |

**Why identities are synthetic.** Real rows are other people's personal data —
names, nationalities, age groups. Committing a sample of that to a git repo to
serve as a test fixture creates a permanent, replicated copy of third-party
personal data with no lawful basis and no erasure path, which is the exact thing
§2 of the brief tells us to take seriously. The markup structure is reproduced
faithfully, field for field and class for class; only the human beings are
invented. `scripts/capture-hyrox-fixture.mjs` re-captures genuine samples the
moment access is authorised, and the parser tests will run against those
unchanged. See `DECISIONS.md` D33.

## 10. Rate-limit behaviour

Not probed. Deliberately: establishing a rate limit means deliberately exceeding
it, against a source that has already said `Disallow: /`. The engine therefore
assumes a conservative budget rather than a measured one — a global outbound
cap, jittered scheduling, exponential backoff with jitter, and `Retry-After`
honoured — and the first authorised run will measure it for real under the
circuit breaker's protection.
