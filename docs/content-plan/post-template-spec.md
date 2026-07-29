# Post production spec

How any post in `hyrox-posts.csv` / `pt-posts.csv` gets built. This is the
brief a writer (or an AI drafting pass) works from. Companion to
`master-strategy.md`.

---

## Structure by format

### `pillar` (2,500 words, 15 HYROX + 9 PT)

1. **Answer block** — 40–60 words answering the title question directly.
   This is the featured-snippet and AI-citation target. No preamble.
2. **Why trust this** — one line, specific: Ben's Elite 15 status, his
   division, his races. Never generic authority claims.
3. **Body** — 5–8 H2 sections, each answerable on its own (people arrive
   mid-page from search). One table or data graphic minimum.
4. **The practical part** — a plan, checklist, or protocol the reader can
   act on today. This is what earns the bookmark.
5. **Honest limitations** — what this won't do, who it's not for. The
   trust differentiator; competitors never do this.
6. **FAQ block** — 5–8 questions from the real question inventory, each
   answered in 40–60 words. Marked up as FAQPage.
7. **CTA** — primary from the CSV, framed as the next logical step, not a
   sales pitch. One secondary CTA. No more.
8. **Internal links** — up to hub, sideways to 3–5 siblings, down to any
   deeper post. Descriptive anchors, never "click here".

### `guide` (1,500 words, the bulk of the inventory)

Same skeleton, fewer sections: answer block → 3–5 H2s → practical part →
2–3 FAQs → CTA. One image or graphic minimum, two preferred.

### `glossary` (450 words, 88 posts across both sections)

1. **Definition** — 40 words, standalone, quotable. Marked up as DefinedTerm.
2. **In practice** — 150 words on what it means for a training decision.
3. **Related terms** — 3–5 internal links.
4. **One-line CTA.**

These are cheap to produce, rank fast on low-competition terms, and are
disproportionately cited by AI search. Batch them 5 at a time.

## Voice

- British English. Second person. Short sentences.
- Coach talking to an athlete, not a brand talking to a market.
- Specific over general: "152kg for men's Open" beats "a heavy sled".
- No hype adjectives, no "unlock your potential", no "game-changer".
- Admit uncertainty where it exists. "We don't know yet" is a valid line
  and it is why people come back.
- Ben's first-hand experience gets quoted where true and relevant, marked
  clearly as his. Never invent a Ben quote — collect them from voice notes.

## Non-negotiables per post (checklist before publish)

- [ ] Primary keyword in title, H1, first 100 words, one H2, slug
- [ ] Answer block in the first 60 words
- [ ] No invented statistics; every number links to its source
- [ ] No fabricated testimonials, reviews or proof (hard rule 1)
- [ ] Hyrox referenced descriptively only; no implied affiliation (hard rule 4)
- [ ] Medical-adjacent claims sourced and hedged; professional signpost where
      appropriate
- [ ] 3+ internal links out, 1 to the cluster hub
- [ ] Image with descriptive alt text, dimensions set, under size budget
- [ ] OG image generated; title legible at thumbnail size
- [ ] Meta title ≤ 60 visible chars; description 150–158 chars
- [ ] Schema per the CSV column
- [ ] Read on a phone before publishing. Tables scroll, CTAs reachable.

## Drafting workflow (realistic)

1. **Research pass** — pull the live SERP for the primary keyword. What do
   the top 3 actually answer? What do they all miss? That gap is the angle.
   The `angle_rationale` column is the starting hypothesis, not the final word.
2. **Outline** — H2s as questions. If an H2 isn't a question someone asks,
   cut it.
3. **Draft** — AI-assisted is fine and expected at this volume.
4. **Edit to voice** — the human pass. This is the bottleneck and the moat;
   do not skip it. An unedited AI draft reads like every competitor.
5. **Ben pass** — only for posts where his first-hand input is the point
   (marked in `notes`). A 2-minute voice note is enough.
6. **Fact check** — every number, every claim, every rule. Race rules change
   between seasons.
7. **Publish + log** — record publish date for the 90-day review.

## The 90-day review loop

For each post at 90 days: pull Search Console queries. If it's ranking for
queries the title doesn't match, retune the title to the actual language.
If it has impressions but no clicks, the meta description is wrong. If it
has neither, it needs internal links or it needs merging into a sibling.

This loop is worth more than the next ten posts. Schedule it.
