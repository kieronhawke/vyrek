# REFS.md — reference review for the Results build

**Source material:** 107 desktop and mobile screenshots captured 2026-08-02, 16:44–16:56,
almost entirely of `hyresult.com`. Held locally at `refs/screenshots/` (gitignored).

**Method and its limits.** I reviewed seven screenshots in full detail, each chosen to cover
a distinct page template, and skimmed filenames/URLs across the rest to confirm the set does
not contain templates outside those seven. The detailed reads were: landing, event page
(desktop), locations index, race simulator, world-records board, event page (mobile), compare
(two states), athlete profile. I have **not** examined all 107 individually — the marginal
return after template coverage is low, and this file is honest about that rather than
implying a full sweep. If a later phase needs a template I have not seen, the screenshots are
on disk to go back to.

**Legal position.** These are competitor screenshots. They inform *pattern* decisions only.
No markup, copy, CSS, asset or data comes from them. Nothing in `refs/` ships.

---

## 1. Patterns worth keeping

**Navigation**
- Persistent left rail grouped by intent — Events / Analysis / Rankings — not by page type.
  A visitor who lands on a deep ranking page can see the whole product without going home.
- Search is pinned in the header on every page with a visible `⌘K` affordance. Search is
  treated as the primary navigation method, which is right for a results site: most arrivals
  are looking for one name.

**Event pages**
- Division list as the spine of the page, each row carrying entrant count, wave window, and
  two distinct actions (Starters / Ranking). It answers "is my division done yet" instantly.
- Status is a single loud badge (`● LIVE 23:53`) next to the date, with the live clock in it.
- City photography as a desaturated banner behind a dark content card. Cheap way to make 14
  events feel distinct without bespoke design per event.

**Rankings**
- Gap-to-leader as its own column (`+2:00`) rather than making the reader subtract.
- Trend chevrons showing movement over a trailing window — turns a static board into
  something worth revisiting.
- Per-row secondary action ("Analyze →") that routes to the deep breakdown. Every row is a
  doorway, not a dead end.

**Simulator** — the strongest thing in the set
- Each station input is a slider sitting **on top of that station's real distribution curve**,
  with a live percentile readout ("top 45.9%"). You are not entering numbers into a void; you
  see where the number places you as you drag.
- Total is decomposed into run / workout / Roxzone with each component colour-tagged, so the
  headline number is legible as three decisions rather than one.

**Athlete profiles**
- Tabbed facets — Races, Divisions, PBs, Stations, Venues — over one dataset. The same race
  history sliced five ways carries a lot of long-tail search intent cheaply.
- Race history grouped by event, with partner names inline for doubles, and rank badges on the
  right edge. Podiums get a distinct glyph rather than just a number.
- Identity line does real work: "HYROX ELITE athlete, 59 races, 8 divisions, 5 seasons,
  18 partners."

**Compare**
- Two-level comparison: averages first (Running / Workouts / Roxzone / Total), then the full
  segment-by-segment table. Summary before detail.
- A race-selection modal lets you narrow which races feed the average, with each race showing
  its time and division. The comparison is a claim you can qualify.

**Mobile**
- Event page reflows to a single column with the division rows intact and the two actions
  collapsed to icon buttons. The information architecture does not change between breakpoints,
  only its density.

---

## 2. Weaknesses to beat

1. **Red/green is the only delta encoding.** Compare and the diff columns lean entirely on
   red vs green fills. Signs are present, but hue is doing the primary work — a
   deuteranopic visitor reads a wall of undifferentiated bars. *Our answer:* chartreuse for
   faster, muted amber for slower, always paired with an explicit `+`/`−`, and never hue alone.

2. **Chrome-heavy, hierarchy-light.** The left rail, header, search and Instagram button are
   permanently present and consume real estate on every page, including the deep ones where
   the data should dominate. *Our answer:* sub-navigation that collapses on scroll, data
   first at every breakpoint.

3. **Event pages are thin.** Beyond the division list there is essentially nothing: no course
   notes, no records set at the event, no report, no coaching context. Each event page is a
   routing table. *Our answer:* dual-mode event pages with podiums, event records, a
   station-average strip, and an automated report — genuine reasons to land there from search.

4. **No editorial or coaching layer anywhere.** The site tells you your Sled Push was 2:25.
   It never tells you whether that is good, why it might be slow, or what to do about it.
   This is the single largest gap and the one we are best placed to fill — Ben's station
   guides turn a data lookup into a training decision.

5. **Nothing is shareable.** No share affordance, no OG cards observed. A PB is the most
   shareable moment in the sport and it dead-ends. *Our answer:* branded share cards for
   results, athletes, events and reports as a first-class feature.

6. **Anonymous content.** No author, no voice, no point of view. The data is competent and
   the product is faceless. *Our answer:* attributed coaching content (Ben Sutherland,
   Elite 15) wherever a human genuinely wrote it — and clear "generated from race data"
   labelling wherever one did not. Never blur the two.

7. **Numbers are not consistently tabular.** Times shift horizontally between rows in places,
   which is exactly the wrong feel for a timing board. *Our answer:* `tabular-nums` on every
   numeral in the section, without exception.

8. **Percentile appears in the simulator and nowhere else.** The best idea on the site is
   confined to one page. *Our answer:* one shared percentile engine feeding result pages, the
   simulator, the percentile tool and share cards.

---

## 3. Direct implications for our build

- Search must be the landing page's thesis, not a header afterthought.
- The distribution-curve-with-slider is the pattern to beat, and beating it means putting
  distributions on result pages too, not just the simulator.
- Every deep page needs one contextual next step. Their rows route sideways; ours should
  route *forward* — to the station guide, the plan, the claim-your-profile flow.
- Density is our advantage on desktop; ruthless single-column clarity is our advantage on
  mobile. Do not let one compromise the other.
