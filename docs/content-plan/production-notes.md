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

## The three reference posts

Built to the full standard as the template for everything else:

- `what-is-a-good-hyrox-time` — BarChart with emphasis, PaceCalculator,
  KeyTakeaways, first-person Elite 15 authority
- `how-much-does-hyrox-cost` — Breakdown, RaceCostCalculator, two Callouts
- `how-much-is-a-personal-trainer-uk` — Breakdown, PtCostCalculator,
  Checklist, published prices

All three proof clean, build, and were checked at 390px and 1440px with no
horizontal overflow and no console errors. Calculator reactivity, the table
toggle and checklist persistence were tested in a real browser.
