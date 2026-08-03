# Geo pages: ranking plan

**Date:** 3 August 2026 · **Scope:** 5,856 geo pages across 13 families
**Status:** not ready to index. This is what changes that.

Revised after research. My first draft led with "cut the prose". Kieron
challenged it, and the challenge was right — the reasoning below is what
replaced it.

---

## 1. Where we actually stand

Eight-word shingle overlap, main content only. Block-frequency over a
240-page sample.

```
359 words  shared with 20%+ of all pages
493 words  rarer than that
 88 words  true boilerplate (on ≥90% of pages)
 58%       of an average page is meaningfully its own
```

| Family | Overlap between any two | Words |
|---|---|---|
| UK towns | ~55% | 1,150 |
| Race cities | 67.5% | 1,096 |
| Expanded markets | 64.3% | 1,161 |
| US states | 37.4% | 529 |

Two published benchmarks to measure against:

- **60–70% original content per page** is the commonly cited target. We are
  at 58% — below it, but marginally, not catastrophically.
- **500+ words of genuinely unique content per page** is the threshold cited
  for programmatic pages surviving the March 2026 update. We are at 493.

We are a few percentage points short of both, not an order of magnitude.

---

## 2. Does cutting harm ranking? No, and here is why

The concern is legitimate: content depth correlates with rankings, and
removing text can remove semantic coverage and long-tail matches.

It does not apply to the specific text in question, for a mechanical reason.
When identical boilerplate appears across many URLs, the engine attributes
that text to one URL and the rest get no credit for it. The four paragraphs
appearing on every page of a family are already earning nothing on 2,927 of
the 2,928 pages carrying them.

So the trade is not "lose ranking value to improve a ratio". The value is not
there to lose. But — and this is the correction to my first draft — that also
means **cutting is not where the win is**. It removes dead weight; it does not
add anything.

**The win is adding unique content, not removing shared content.** Adding
improves the ratio *and* keeps semantic coverage. Cutting only does the first.

Revised position: trim the four dead paragraphs because they earn nothing and
crowd the page, but treat that as housekeeping. The real work is §4.

---

## 3. What the winners actually do

Zillow, TripAdvisor, Yelp, Glassdoor, G2, Nomad List, Wise. Every one of them
runs the same three-part formula: a repeatable keyword pattern, a **structured
dataset competitors cannot easily replicate**, and a template that answers the
query for every variation.

- Zillow: home value estimates, price trends, school data, walkability
- TripAdvisor: user reviews
- Glassdoor: salary submissions
- G2: verified ratings
- Nomad List: structured city stats

None of them win on prose. They win on data nobody else has.

### The uncomfortable read on us

| Our data | Proprietary? |
|---|---|
| Gyms from OpenStreetMap | No — anyone can pull it |
| HYROX race calendar | No — it is published |
| Straight-line distances | No — anyone can compute them |
| parkrun locations | No — public feed |

**We have no data moat.** Every fact on these pages is one a competitor could
assemble in a weekend. That is the actual ranking problem, and no amount of
rewriting fixes it.

hyroxvault already has 2,273 hand-verified affiliated gyms. On the current
data we are not ahead of them.

---

## 4. The plan

### Phase 1 — housekeeping (days)

Trim the four family-wide paragraphs that earn nothing (~220 words/page), and
move that argument to `/how-it-works`, linked from every location page. Not
because it harms us, but because it crowds out the content that does work.

Spend the freed space on data we already hold and do not surface: whether
chains are present (does an existing membership travel), gyms vs sports
centres, how tightly the nearest gyms cluster, parkrun count and spread,
races per city and whether the city repeats annually, metro-to-metro
distances for states. All differ by place. All free.

Expected: 58% → roughly 70% unique, ~493 → ~600 unique words. Above both
published thresholds.

### Phase 2 — build the moat (the actual answer)

Two candidates, in order of value.

**a) Equipment verification, user-submitted.** OSM records that a gym exists,
not whether it holds a sled, a ski erg or a wall-ball target — and the page
already says so. That gap is exactly what a HYROX athlete knows and nobody has
published. A one-question contribution ("does this gym have a sled?") on every
gym listing builds, over months, the one dataset in this sport that competitors
cannot copy. It is the TripAdvisor play, at a scale a small brand can actually
reach.

**b) Results data.** Still open question 1, and now known to be harder:
`results.hyrox.com` disallows crawling in robots.txt, so scraping is off the
table on both policy and legal grounds. Legitimate routes: an official feed or
partnership, or athlete-submitted times. Worth pursuing precisely because it is
hard — difficulty is what makes it a moat.

### Phase 3 — raise the publishing bar

Current rule: has a gym **or** a parkrun **or** keyword evidence. Written for
94 pages. For 5,856, tighten to **2+ data layers and 6+ named local entities**.
Below the bar, pages stay live, linked and `noindex` — which is what the gate
already does, at a threshold that matches the scale.

### Phase 4 — gates before indexing

- Within-family overlap **under 40%** (now 55–67%)
- Cross-family overlap **under 35%** (now 50–63%)
- 500+ unique words per indexed page
- Zero duplicate titles, descriptions, H1s — already true
- Zero broken internal links — already true
- Native review signed off for `de`, `fr`, `es` — **hard gate**
- Structured data validated in Google's Rich Results Test

### Phase 5 — index in stages

Remove the `X-Robots-Tag` for **UK towns only**. Measure a month in Search
Console. Then the next family. Published guidance for surviving the March 2026
update suggests 25–30 new pages a week, not thousands at once — we cannot
match that literally with pages already built, but we can stage the *indexing*,
and 1,882 pages is a recoverable mistake where 5,856 is not.

---

## 5. Black hat: what it is, and why not here

Asked for, so answered honestly rather than avoided.

What is still practised: geo-doorway pages funnelling equity to a money page;
AI-generated articles with keywords injected into alt text, schema and
CSS-hidden divs; PBNs and paid links; large-scale link exchanges.

Why it is a bad trade for this business specifically:

1. **The window has closed.** Tactics that once took months to trigger a
   penalty now produce drops within days. The 2025 SpamBrain update removed a
   large share of targeted low-quality domains, with doorway pages and cloaking
   named directly.
2. **We are the doorway-page archetype already.** 5,856 location pages
   funnelling to one quiz is the textbook definition. Our only defence is that
   each page carries real local data. Adding hidden keywords removes the
   defence and confirms the charge.
3. **The asset is a named person.** Ben Sutherland competes under his own
   name. A manual action attaches to the brand he races under. There is no
   version of this where the site is disposable.
4. **The grey area is gone.** What used to be grey is now mostly devalued,
   penalised, or pointless.

The one legitimate borrowing from that playbook: **they are rigorous about
internal linking and about matching page to query intent.** Both are free,
both are already in place here.

---

## 6. What actually ranks these pages

Being the only page that can answer a specific question — which gyms near
Bracknell have room to push a sled, how far the nearest race is from Billings,
which German cities are on the calendar — and an internal link graph that makes
5,856 pages legible as one body of work rather than 5,856 attempts at the same
trick.

The prose is not the moat. The data is, and we do not have it yet. Phase 2 is
the plan.
