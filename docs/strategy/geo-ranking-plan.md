# Geo pages: ranking plan and policy audit

**Date:** 3 August 2026 · **Scope:** 5,856 geo pages across 13 families
**Status:** not ready to index. The work below is what changes that.

---

## 1. What was measured, and how

Eight-word shingle overlap between page pairs, main content only — the nav and
the ~50-link footer are identical everywhere and would flatter every number by
a constant. Block-frequency analysis over a 240-page sample across both
families.

This is measurement, not estimation. Anyone can re-run it; the scripts are
`/tmp/uniq.mjs` and `/tmp/blocks.mjs` in the transcript, worth committing to
`scripts/` if this becomes routine.

### Overlap between any two pages in the same family

| Family | Mean overlap | Words/page |
|---|---|---|
| UK towns | ~55% | 1,150 |
| Race cities | 67.5% | 1,096 |
| Expanded markets | 64.3% | 1,161 |
| **US states** | **37.4%** | **529** |

### Overlap between the two families for the same place

| | Before the 3 Aug fix | After |
|---|---|---|
| Leeds | 71.1% | 52.1% |
| Cologne | 71.9% | 49.6% |
| Texas | 88.6% | 63.2% |

### Composition of an average page

```
359 words  shared with 20%+ of all pages
493 words  rarer than that
 88 words  true boilerplate (on ≥90% of pages)
```

**58% of an average page is meaningfully its own.** That is better than the
shingle figure suggests, and it is still not good enough at this scale.

---

## 2. The finding that matters

**The US state pages score best and are the shortest.** 529 words at 37.4%
overlap, against 1,150 words at 55%.

The ratio is what ranks, not the word count. A page with 250 place-specific
words in 500 total is half unique. The same 250 in 1,150 is a fifth unique.
Every templated paragraph added to "strengthen" a page has diluted it.

This inverts the usual instinct. **The fix is to cut, not to add.**

---

## 3. Policy audit

Assessed against Google Search spam policies and Bing webmaster guidelines.

| Policy | Risk | Position |
|---|---|---|
| **Scaled content abuse** | **HIGH** | 5,856 templated pages. Mitigated by real per-page data (gyms, parkruns, races, distances) but the 55–67% within-family overlap is the exposure. This is the one that matters. |
| **Doorway pages** | **MEDIUM** | Many location pages funnelling to one quiz is the literal definition unless each page stands alone. The defence is that each names real local gyms, a real race and real distances — but only while that stays true of every page. |
| Keyword stuffing | LOW | Deliberately not done. Requested and declined: repeating phrases across 5,856 pages is what the overlap metric detects, so stuffing would worsen the primary risk. |
| Machine translation without review | **HIGH (de/fr/es)** | 22 pages. Written rather than literally translated, but unreviewed by a native speaker. **Must not be indexed until reviewed.** |
| Structured data accuracy | LOW | FAQPage mirrors visible content. SportsEvent dates now come from hyrox.com rather than the invented calendar. Service and BreadcrumbList are accurate. |
| Sneaky redirects | LOW | The 1,877 `/hyrox/{town}` → `/hyrox-training/{town}` 308s serve the same intent and are declared out of the sitemap. Legitimate consolidation. |
| Thin content | MEDIUM | 146 pages carry no gym layer and are correctly `noindex`. The rule works; it must keep governing. |
| Hidden text / cloaking | NONE | Same HTML to all agents. |

---

## 4. The plan

### Phase 1 — cut the diluting prose (biggest single lever)

Four blocks appear on **every page of a family** (50% of a mixed sample) and
say nothing place-specific. Roughly **220 words per page**:

- "Conditioning is where most general programmes quietly fail…" (46w)
- "Progress gets measured rather than felt…" (46w)
- "A Hyrox is eight kilometre runs with a station between each…" (44w)
- "Whichever race you enter, the date is what makes a programme…" (41w)

These are brand argument, not local information. They belong on `/how-it-works`
and the hubs, linked from every location page, not restated on 5,856 of them.

Removing them takes an average page from ~1,150 to ~930 words and lifts the
unique fraction from 58% toward roughly 70%.

**Do not replace them with spun variants.** Rotating reworded paragraphs is
paraphrasing at scale and is named in the same policy. Cut, do not respin.

### Phase 2 — spend the words on data we already hold and do not use

Per page, currently unused:
- Gym **chains** present vs absent — tells a reader whether their membership travels
- The **split of gyms vs sports centres** — where floor space actually is
- **Distance spread** of the nearest gyms (all within 2 km, or spread over 8)
- Parkrun **count and spread**, not just the nearest
- For race cities: **how many races**, and whether the city repeats annually
- For states: races per state and metro-to-metro distances

Every one of these is already in the data layer and differs by place. This is
unique wordage that costs nothing to source.

### Phase 3 — raise the publishing bar

The `indexable` rule is currently "has a gym, a parkrun, or keyword evidence".
Given the scale, tighten to something like: **at least 2 data layers AND at
least 6 named local entities**. Pages below it stay live, linked and `noindex`
until the data improves — which is what the existing gate already does, just
at a level that matches 5,856 pages rather than 94.

### Phase 4 — verify before indexing

Gates to pass, all measurable:
- Within-family overlap **under 40%** (currently 55–67%)
- Cross-family overlap **under 35%** (currently 50–63%)
- Zero duplicate titles, descriptions, H1s — **already true**
- Zero broken internal links — **already true**
- Native review signed off for `de`, `fr`, `es`
- Structured data validated against Google's Rich Results Test

### Phase 5 — then open indexing

Remove the `X-Robots-Tag` from `next.config.ts`. Do it in stages rather than
all at once: the UK towns first, measure for a month in Search Console, then
the rest. If something is wrong, 1,882 pages is a recoverable mistake and
5,856 is a harder one.

---

## 5. What ranks these pages, honestly

Not density. These win on being the only page that can answer a specific
question — "which gyms near Bracknell have space to push a sled", "how far is
the nearest race from Billings", "which German cities are on the calendar" —
and on the internal link graph that makes the set legible as a whole.

The competitor comparison holds: hyroxvault has gym data and no results data.
We have gym data, race data and distances. The gap we cannot close yet is
results, which is still open question 1.
