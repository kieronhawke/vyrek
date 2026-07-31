# Production notes

What was built to turn the plan into publishable posts, and what a writer
needs to know. Companion to `post-template-spec.md`.

---

## A bug we found and fixed on the way

**Every MDX component prop written as an expression was being silently
dropped across the entire blog.**

`next-mdx-remote` v6 ships a security plugin that strips all JavaScript
expressions from MDX, including JSX attribute expressions. Anything written
as `prop={...}` — arrays, objects, numbers, booleans — never reached the
component. String props survived, so components rendered, just with their
data missing. Several defensively returned `null`, so the failure was
invisible: the block simply was not there.

This affected the existing library too: `KeyTakeaways items={[...]}`,
`ComparisonTable`, `RaceAnalytics splits={[...]}`, `Leaderboard`. Any post
using them has been shipping without those blocks.

Fixed in `app/blog/[slug]/page.tsx` with `blockJS: false`, which is safe
because blog MDX is first-party content committed to this repo and reviewed
like any other source file. **If we ever accept MDX from outside the team,
that must go back to `true`.** `blockDangerousJS` is left on regardless.

Worth re-reading any older post that used a data component — the block was
probably missing.

## Components available in MDX

Charts and data blocks (`components/blog/mdx-charts.tsx`):

| Component | Use |
|---|---|
| `<BarChart>` | Magnitude comparison. `emphasis="label"` highlights one bar and greys the rest. Ships a table view. |
| `<StatTile>` | One number that is the whole story. Use instead of a one-bar chart. |
| `<Meter>` | A single ratio against a limit. |
| `<Breakdown>` | Labelled components with an optional total. |
| `<Checklist>` | Tickable list, saves to localStorage per post. |

Calculators (`components/blog/mdx-calculators.tsx`):

| Component | Use |
|---|---|
| `<RaceCostCalculator>` | What a race weekend costs: entry, travel, hotel, food, kit, group splits. |
| `<PaceCalculator>` | Target finish time into run pace and station budget. |
| `<PtCostCalculator>` | Local sessions vs monthly coaching, with the 4.33-weeks arithmetic. |

Plus the existing `<Callout>`, `<PullQuote>`, `<Stat>`, `<StatGrid>`,
`<KeyTakeaways>`, `<ComparisonTable>`, `<SledCalculator>` and friends.

## Chart colour rules

The palette was validated with the dataviz validator against the dark
surface (#141414) and passes all five checks: lightness band, chroma floor,
CVD separation, normal-vision floor and contrast.

- Categorical slots are fixed in order and capped at four. **Do not add a
  fifth without re-running the validator** — adjacent tritan separation is
  already at 7.1, inside the floor band, which is only legal because every
  chart ships direct labels and gaps.
- Single-series and emphasis charts use the brand accent; everything else
  recedes to grey. Emphasis is the right form far more often than
  categorical.
- Text never wears the series colour. Values and labels use text tokens.

## Calculators and honesty

No calculator asserts a price we cannot source. Entry fees, fares and room
rates move constantly, so every money input is user-editable and seeded with
a clearly-labelled planning estimate, with a standing note that says so.
The calculator does arithmetic; the reader owns the numbers. Keep it that
way — a fabricated "average hotel price" is exactly the kind of invented
statistic hard rule 1 exists to prevent.

## Proofing

`node scripts/proof-posts.mjs [slug]` checks every post for:

- missing or over-length metadata, thin alt text, absent FAQs
- AI tells and marketing filler ("delve", "unlock your", "game-changer",
  "let's dive in", em dashes used stylistically)
- American spellings
- numbers presented as fact with no source or hedge nearby
- thin structure, walls of text with no chart or callout, missing CTAs
- long opening paragraphs that bury the answer

Flags are prompts for a human read, not automatic failures. Run it before
every publish.

**It currently flags 80 issues across the 48 pre-existing posts**, most
commonly no call to action (24 posts) and no chart or callout at all. Those
are worth a sweep — they are the cheapest wins in the archive.

## Posts written so far (58 live, 44 mapped to the plan)

All wave 1. Tracked in the CSVs as `status = published` with the shipped
slug in `notes`.

| Slug | Target | Blocks used |
|---|---|---|
| `what-is-a-good-hyrox-time` | what is a good hyrox time | BarChart (emphasis), PaceCalculator, KeyTakeaways |
| `how-much-does-hyrox-cost` | hyrox entry fee / cost | Breakdown, RaceCostCalculator, 2 Callouts |
| `how-much-is-a-personal-trainer-uk` | how much is a personal trainer (1,300/KD12) | Breakdown, PtCostCalculator, Checklist |
| `hyrox-training-near-me` | hyrox training near me (880/**KD6**) | Checklist, BarChart, Breakdown |
| `what-does-hyrox-stand-for` | what does hyrox stand for (5,400) | Breakdown, Callouts |
| `hyrox-rules-standards-penalties` | hyrox rules (720/KD23) | Breakdown, KeyTakeaways |
| `hyrox-stations-explained` | hyrox stations (2,900/KD29) | BarChart (9 bars), Callouts |
| `hyrox-workout-explained` | hyrox workout (22,200) | Breakdown, BarChart |
| `couch-to-hyrox` | couch to hyrox (unclaimed flagship) | Breakdown, BarChart, Checklist |
| `hyrox-race-day-bag-checklist` | hyrox bag (1,600/KD17) | Checklist, Breakdown |

They cross-link into a cluster: stations ↔ rules ↔ weights ↔ times ↔ cost,
with the beginner posts feeding `couch-to-hyrox` and everything funnelling
to the plan maker or a call.

### Verification run on every one

- `node scripts/proof-posts.mjs` — all clean
- Production build — 447 pages, no errors
- Rendered at 390px and 1440px: no horizontal overflow, no console errors
- Every internal link fetched and confirmed 200
- Every post confirmed to render at least one chart, calculator or checklist
- Calculator reactivity, table toggles and checklist persistence driven in a
  real browser (changing nights moved the race total £300 → £520)

## The no-pricing policy, and one existing post that breaks it

Site policy (Kieron, 29 July 2026, `docs/growth-plan.md` §3.1): **no Suth
pricing is published anywhere.** Every path ends at the free consultation.

The proofer now enforces this. It flags named Hub prices, "we/I charge",
monthly figures, "our rates", and trial offers. Quoting *third-party*
market rates is still fine and is often the point of a post — what must
never appear is our own price.

**`hyrox-cheapest-vs-best.mdx` conflicts with the policy and needs a
decision from Kieron.** It is an existing, live post built entirely around
a price-tier comparison with Suth Performance placed inside it: it
positions us against £30/mo and £45/mo competitors, references a
first-week-free trial, and its SEO description leads with "Free PDFs to
£400/mo". Fixing it is not a find-and-replace — the post's whole premise is
price comparison, so it needs either a rewrite around value tiers rather
than price tiers, or retiring. That is an editorial call, not mine to make
unilaterally, so it is left as-is and flagged here.

## Two funnel inconsistencies found during the sweep

**Fixed: the blog CTA pointed at a page that no longer exists as described.**
`PostFinalCta` renders on all 58 posts and its secondary button said "See
pricing" linking to `/pricing`, which has since been rebuilt as a no-numbers
"Coaching options" page. It now says "Talk to Ben, free" and links to
`/free-consultation`. Same fix applied to the `/hyrox/[city]` geo pages.
One component, every post.

This also explains why the proofer flagged 31 posts as having "no call to
action": they all *do* get the global CTA, it just is not in the body text.
An in-body contextual CTA still converts better than a footer one, so the
flag is worth keeping, but it is not the emergency the raw count suggests.

**Flagged, not fixed: "before you pay" appears on about 12 pages.**
The capture-funnel spec says "every path ends at the free consultation", but
the landing page, quiz page, how-it-works, about, plan-reveal, geo pages and
the blog sidebar all still say "See your Week 1 before you pay" — which
implies a self-serve checkout. Meanwhile `/legal/terms`, `/legal/refunds`
and the Stripe route still describe a 7-day free trial and subscriptions.

So the site is mid-migration between two models. Deciding whether
"plan-before-pay" survives as a message alongside consultation-first is a
strategic call that touches the landing page and the legal copy, so it is
Kieron's, not mine. Fixing it only in the blog would make the site
inconsistent with itself, which is worse than leaving it. **Needs a
decision.**

## Archive sweep (29 July 2026)

The 48 pre-existing posts were swept alongside the new writing. Flags went
from 80 to 47.

**Fixed across the archive:**

- **35 over-length page titles.** The proofer was checking `seoTitle` in
  isolation, but `app/layout.tsx` appends `" · Suth Performance"` (20 chars),
  so the *rendered* title was 20 over what was being measured. Every post
  was 60–80 characters where Google truncates around 65. All 35 rewritten to
  ≤45 chars with the keyword front-loaded, and the proofer now checks the
  rendered length.
- **A horizontal-overflow bug on mobile.** `hyrox-station-weights-explained`
  pushed the whole page sideways (504px in a 390px viewport). The table
  wrapper had `overflow-x-auto`, but its grid parent defaults to
  `min-width: auto` and refused to shrink, so the page scrolled instead of
  the table. Fixed with `min-w-0` on both the article body and the table
  wrapper — this affected any post with a wide table.
- Long meta description, remaining American spellings.

**Six posts enriched** from walls of text into something with structure:
`hyrox-vs-crossfit` (decision Breakdown), `hyrox-training-week-structure`
(BarChart showing the flat return past four days), `wall-balls-scaling-technique`
(the rep plan as a Breakdown plus a standards warning), `hyrox-taper-week-protocol`
(what actually decays in seven days), `race-day-nutrition` (race morning
counted back from your wave), `hyrox-rowing-strategy`. Each also got a
contextual in-body CTA.

**Still open:** 25 posts remain text-only and 24 lack an in-body CTA. Both
are genuine improvements rather than faults, since every post does get the
global footer CTA. Worth working through steadily rather than in one pass.

## Facts discipline

The repo's existing [station weights post](/blog/hyrox-station-weights-explained)
is the single source of truth for loads and distances. New posts **link to
it rather than restating the numbers**, which avoids both cannibalisation
and the risk of two pages drifting apart as standards change between
seasons.

Where a post needs a benchmark that no dataset backs (what counts as a good
finish time, which station costs most), it is labelled explicitly as
coaching judgement in the chart caption and in the opening callout. That is
the honest way to be useful before the results layer exists, and the proofer
enforces it: any bare percentage or "average" without a source or hedge
nearby gets flagged.

## Plan reconciled against the live site (31 July 2026)

The plan and the site had drifted. The plan's `slug` column holds the slug a
row was *planned* under, and posts ship under much shorter slugs, so the two
never matched by slug alone. Ten rows recorded the real URL in `notes`; the
other thirty-four did not, and the plan under-reported the live site by
27 posts.

The mapping now lives in `notes`, in two forms that mean different things:

| Status | Note | Meaning |
|---|---|---|
| `published` | `shipped as /blog/<slug>` | Row is done. No work left. |
| `refresh` | `live at /blog/<slug>` | A live URL exists; the plan still intends to upgrade it. |

Keeping those apart matters. Sixteen of the rows reconciled here were already
marked `refresh` by hand, and refreshes are an active queue: 4–6 a month,
free against the new-page budget, the fastest ranking gains available.
Collapsing them into `published` would have silently deleted sixteen pieces
of planned work.

**Where that leaves the count:** 58 posts live, 44 mapped to a plan row
(17 `published`, 27 `refresh`), 14 live posts with no plan row at all.
`check-content-plan.mjs` now prints this and fails the build if a row claims
a URL that does not exist, or if two rows claim the same one.

Pre-existing `refresh` marks were treated as authoritative throughout. Where
one existed, it won over anything the matcher proposed, because whoever set
it had a specific live post in mind.

### Still open, and not mechanical

**Two live posts duplicate two others.** Both pairs chase one query:

- `couch-to-hyrox` (24-week) and `hyrox-couch-to-finish` (16-week). Same
  audience, same intent, same head term.
- `hyrox-race-day-bag-checklist` and `hyrox-race-day-kit-checklist-2026`.
  Both are race-day packing lists, ~975 words each.

Two of those four shipped in the 29 July batch, so this is self-inflicted and
recent. Merge or differentiate is an editorial call, not a script's.

**Five posts are dated in the future** (to 28 August). `lib/blog/posts.ts`
sorts on `publishedAt` but never filters it, so there is no scheduling gate:
those posts are live now, carrying a `datePublished` that has not happened.
Either the dates come back to real ones or the filter gets built. The proofer
now flags any future date so this cannot recur silently.

**Two `refresh` rows point at nothing.** H162 (48-hour pre-race fuelling) and
H230 (recovery for hybrid athletes) are marked as upgrades to a live URL, but
no live post matches either. They are new posts mislabelled, or the post they
meant was renamed. The checker now warns on both.

**Fourteen `cta_primary`/`cta_secondary` values still read "Start the 7-day
Hub trial".** "The Hub" is superseded by Suth Club, and whether a trial exists
is the funnel lane's call, so those were left alone. The 24 rows reading "See
transparent coaching prices" were changed to "See coaching options", matching
the live `/pricing` and `/plans` labels, because promising a price the site
does not publish is a broken promise under the no-pricing policy.
