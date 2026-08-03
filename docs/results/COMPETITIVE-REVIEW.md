# Competitive review — hyresult.com

Reviewed against the 107 screenshots in `refs/screenshots/` (captured 2026-08-02)
plus the reference notes in `REFS.md`. Updated 2026-08-03 after a closer read of
their result and rankings templates.

This is a feature-parity audit, not a design critique. The question is only:
what can a visitor do there that they cannot do here, and is it worth having.

---

## 1. What they have that we do not

| Their feature | Verdict | Status |
|---|---|---|
| **Result page tabs** — Totals / Runs / Workouts / Splits / Simulator | Worth having. Different questions want different views of one race | **Built** — see §3 |
| **Timing-mat splits** — Rox In, SkiErg In, SkiErg Out, Rox Out, with time-of-day | Worth having *when the data exists*. Separates transition-in from transition-out | Modelled, blocked on data |
| **Penalty display** — "Penalty: LUNGES (30s)" beside the finish | Worth having. A penalty explains a time that otherwise looks wrong | Modelled, blocked on data |
| **Live position badge** — "#2 of 882" updating during the race | We have this on the live strip, not on a result page | Partial |
| **Elite Points / Legends ranking** — cross-event athlete leaderboards | Worth having. Answers "who is actually the best", which a single race cannot | **Built** — see §2 |
| **Athlete "Partners" filter** — filter a career by doubles partner | Niche but cheap, and doubles athletes care | **Built** |
| **Athlete "Venues" tab** — results grouped by venue | Low value. Venue is not a performance variable in Hyrox | Skipped, deliberately |
| **Nation / gender filters on rankings** | Worth having | **Built** |
| **Pagination on long boards** | We virtualise instead, which is strictly better | N/A |

## 2. What we have that they do not

Unchanged from `REFS.md` §3, plus this round:

1. Race strip — the whole race as one proportional, interrogable timeline
2. What-if projection — "fixing this moves you from 412th to 341st"
3. Roxzone leak as a headline number
4. Pacing consistency score with a named verdict
5. Weakest station **by percentile**, not by raw seconds
6. Target-split mode in the simulator
7. Split plausibility flags
8. Share cards with save-image
9. Local sort/filter across 3,000 rows with no round trip
10. CSV export of any filtered view, and a designed PDF report
11. **Athlete power score** — one cross-event number, and the board built on it
12. **Station rankings** — who is fastest at one station across every event
13. **Head-to-head record** between two athletes who have raced each other

Their equivalent of 11 is "Elite Points", which is closed — no published formula.
Ours is documented and reproducible, which matters for trust and for SEO: a page
that explains its own maths earns links.

## 3. The result page, reconsidered

Theirs splits one race into five tabs. That is right, and our single scrolling
page was wrong for the same reason a spreadsheet has sheets: *totals*,
*run pacing*, *station work* and *raw splits* are four different questions and
a reader has one of them at a time.

Adopted, with two differences:

- Our **Analysis** tab has no equivalent there. It carries the what-if, the
  weakest-station verdict and the coaching link — the "so what" they never answer.
- Their Simulator tab pre-fills the simulator from that race. We link to it
  pre-filled rather than embedding it, because the simulator is a page that
  ranks on its own and burying it inside a tab wastes that.

## 4. Deliberately not copied

- **Venues tab.** Venue is not a performance variable. A tab that groups by it
  implies a signal that is not there.
- **Their pagination.** Virtualising 3,000 rows is better on every axis.
- **"Reach millions of athletes" partner banner.** A sales strip above the
  content of a page someone came to read.
- **Their percentile-only-in-the-simulator pattern.** We put percentile
  everywhere it applies, from one shared engine.

## 5. Blocked on data, not on build

Both of these are modelled in the types and will render the moment ingestion
supplies them:

- **Penalties.** `RaceResult.penaltySeconds` and `penaltyReason`.
- **Timing-mat in/out.** The current model holds one duration per station; the
  source carries a mat-in and mat-out per station, which is what lets you
  separate "slow at the sled" from "slow getting to the sled".

Neither should be invented in demo data. A fabricated penalty attached to a
name is worse than an absent one.
