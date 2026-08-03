# Competitor SEO teardown — hyresult.com

Measured 2 August 2026 by fetching the site directly (curl, desktop UA, redirects
followed) and parsing the served HTML. Everything below is a fact about what
their server returns, not an inference from a screenshot.

---

## 1. The headline finding: there is no sitemap

```
GET /robots.txt          →  200   "User-agent: *\nAllow: /"      (2 lines, no Sitemap: directive)
GET /sitemap.xml         →  404
GET /sitemap_index.xml   →  404
```

A results database is tens of thousands of URLs. With no sitemap and no
`Sitemap:` line in robots.txt, **every page they own has to be discovered by
crawling internal links**. That is the single largest structural weakness on the
site, and it compounds with §4 below.

We ship `/sitemap.xml` plus a dedicated `/sitemap-results.xml`, both declared in
`robots.ts`.

---

## 2. One title and one description, shared across the site

| URL | `<title>` | `<h1>` | canonical |
|---|---|---|---|
| `/` | HYRESULT - HYROX athletes, results and race analytics | 1 | ✅ |
| `/events` | *(identical)* | **0** | **missing** |
| `/rankings` | *(identical)* | 1 | ✅ |

`/events` is the index of the entire database. It has **no `<h1>`, no canonical,
and a title that describes the homepage**. Their three most important hub pages
are mutually indistinguishable to a search engine.

Their templated pages are much better and are handled individually below — the
problem is confined to the hand-built routes, which happen to be the hubs.

---

## 3. Page-by-page measurements

| Page | Words | `<h2>` | Schema | Notes |
|---|---:|---:|---|---|
| `/hyrox/wall-balls` | 766 | 7 | Article, Breadcrumb | **Their best asset.** Title carries the weights: "Station 8, 100 reps, 4kg, 6kg, 9kg" |
| `/rankings/world-records/men` | 961 | **0** | none | `<h1>` is just "HYROX MEN" |
| `/event/s9-2026-london` | 604 | 1 | SportsEvent, Offer, Breadcrumb | Title targets **Tickets**, not results |
| `/ranking/s8-2025-london-hyrox-men` | 946 | **0** | CollectionPage, ItemList, Person | `<h1>` "HYROX MEN Ranking (5554)" — no city, no year |
| `/athlete/aaron-bassett` | 504 | 10 | ProfilePage, Person, Occupation | Genuinely good |
| `/location/london` | **226** | **0** | CollectionPage, ItemList, SportsEvent | Title: "HYROX location **LON**: London" |
| `/simulator` | 192 | **0** | none | |
| `/compare` | 162 | 2 | none | **No canonical**; title reads "racesside-by-side" |

### What they do well, and we should not ignore

- **Station guides.** 766 words, seven `<h2>`s, `Article` schema, and a title
  containing the exact weights people search. This is a properly built content
  page and it is why they own those queries.
- **`ItemList` + `SportsEvent` on location pages.** Correct schema, correctly
  nested. We now match this on our city hubs.
- **`ProfilePage` on athletes.** The right type, with a description that reads
  naturally and carries the race count.
- **Event pages target "Tickets"** — high commercial intent, and it captures the
  pre-race audience.

---

## 4. The crawl-depth problem

`/ranking/s8-2025-london-hyrox-men` serves **748 KB of HTML** and links
**100 of 5,554 athletes**. There is no `?page=`, no `rel="next"`, no crawlable
pagination of any kind:

```
grep -oE 'href="[^"]*(page|offset)[^"]*"' ranking.html   →  (nothing)
```

So **98% of every field is unreachable by a crawler** from the page that lists
it. Combined with no sitemap (§1), the only athletes that can be discovered are
those who finished top-100 somewhere.

`/athletes` returns 404 — there is no athlete index either.

---

## 5. Missing entirely

- **`Dataset` schema.** A ranking page *is* a dataset. Dataset rich results are
  a supported, competitive-free surface. Not emitted anywhere.
- **`FAQPage`.** Not emitted anywhere on the site.
- **`hreflang`.** None, despite HYRESULT GmbH serving a global audience.
- **A city-level results hub.** `/location/london` lists events but carries no
  results data — no median, no winning time, no field size.

---

## 6. What we changed in response

| Gap | What we shipped |
|---|---|
| No city hub worth ranking | `/results/city/[slug]` — every edition, plus median finish, fastest ever, venue history and a data-built FAQ. 566 words on a single-edition city vs their 226 |
| Cities hard to discover | `/results/city` index, grouped by country, linked from the nav and from every event page |
| Event pages target only tickets | Our titles already lead with **Results, Rankings & Start Lists**; added a per-event FAQ answering "who won", "what was the winning time", "how many raced" |
| No `FAQPage` anywhere | `FaqSection` renders and marks up from one array, so the copy and the schema cannot drift |
| No `Dataset` | Emitted on ranking pages and on the course speed index |
| No unique analytical page | `/results/course-index` — 1,038 words of measurement nobody else can produce |
| Brand duplicated in every title | Fixed across 17 Results pages (see §7) |

---

## 7. A defect we found in our own titles while measuring theirs

Every Results page rendered:

```
HYROX Events & Race Calendar: Every Season | Suth Performance · Suth Performance
```

`app/layout.tsx` sets `title.template = "%s · Suth Performance"`, and seventeen
pages *also* hard-coded `| Suth Performance`. The brand appeared twice in every
tab and every SERP entry, wasting roughly 20 characters of the ~60 Google
displays.

Typecheck cannot see this; neither can a screenshot, since the title tag is not
on the page. It survived because nothing asserted on it. There is now a test in
`lib/results/metadata-urls.test.ts` that fails if the suffix is reintroduced.

---

## 8. Still open

- **hreflang** — worth doing once there is non-English content to point at.
  Emitting `hreflang` for pages that do not exist is worse than omitting it.
- **Crawlable ranking pagination.** We server-render the first 100 rows like
  they do. The difference is that our rankings are in the sitemap and theirs are
  not — but neither of us exposes rows 101+ to a crawler. Worth revisiting once
  athlete ingestion lands, since the value is in the athlete links.
- **Paired-athlete course comparison.** The honest upgrade to the speed index:
  measure the same athletes at two venues in one season, which controls for
  field quality outright. Blocked on athlete-level cross-event data.
