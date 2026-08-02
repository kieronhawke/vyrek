# Reference teardown 2 — Runna, Apple Fitness, RoxFit/HYROX, MarchOn

Source: 58 screenshots supplied by Kieron on 2 August 2026 (`~/Downloads/IMG_1930–1987.PNG`),
plus the earlier MarchOn set (see `marchon-teardown.md`).

Four apps, four different jobs:

| App | What it is good at |
|---|---|
| **Runna** | Onboarding, plan framing, race discovery. The best of the four. |
| **Apple Fitness** | Summary cards, trends, empty states. |
| **RoxFit / HYROX** | Session structure for *our actual sport* — intervals, RPE, stations. |
| **MarchOn** | Tab IA, prescription lines, chips. Already implemented. |

Coverage note: 10 read individually, the rest as 2-up sheets. The sheets are
legible enough for structure and headings, which is what this document is for.

---

## 1. The eleven things worth taking

### 1.1 Block progress in the header, not buried
Runna puts **`Week 10/12 ▾`** with a small progress ring in the *top bar of
every screen*. It is the single most useful piece of context in the app and it
never leaves. Ours is on the Plan screen only.

### 1.2 A plan is confirmed by listing its inputs
Before generating, Runna shows **"Your plan is customized based on these
details"** and bullets back every answer: current 5k time, available days,
preferred long-run day, start date, elevation profile, volume, difficulty.

This is the strongest trust device in the whole set. It makes a plan feel
authored, and it lets the athlete catch a wrong answer before it costs them
twelve weeks. Ours should do this after the quiz, before Ben writes.

### 1.3 Every question carries its coaching reason
Not "How many days?" but "How many days per week would you like to run?" with
*"This should be at most once more than you currently run per week to reduce
the risk of injury"* underneath. The app teaches while it asks.

### 1.4 Ability levels are defined objectively, and coach you at the point of choice
Beginner / Intermediate / Advanced / Elite, each with a testable definition
("You can complete a 5km run without stopping, in under 60 minutes"), and a
partial ring icon that fills as the level rises. Selecting a level you do not
match surfaces guidance *inside the selected card*: "If you can't complete a
5km in under 60 mins, no problem — go back and select 'Start running' first."

### 1.5 Sessions are numbered intervals with RPE, not paragraphs
RoxFit is the closest to our sport and its session structure is better than
ours:

```
  ①  INTERVAL 1/4          ⏱ 1m
     Ski Erg
     12 calories
     [ Rest remaining time ]
```

A numbered gutter, an interval chip, the movement, the quantity, and a rest
sub-chip. Prescriptions read `600 m · Race Pace · 8/10 RPE`. **RPE belongs in
our prescription line** — it is how a HYROX session is actually communicated.

### 1.6 Intensity is a glyph, not a word
`▮▮▮ HIGH` in red, `▮▮ MODERATE` in orange, `▮ LOW` in green. Sits in a 3-up
metric strip with duration and discipline. Scannable at a glance.

### 1.7 Race cards carry a photo, a flag and a count
Runna: date + distance in accent, race name, 🇬🇧 flag + location + "6,683
Runnas". RoxFit: B&W city photo, LIVE badge, date range, city, flag, region
chip.

**We have 113 real HYROX races with dates, venues and countries.** This is the
model for `/hyrox/events/[slug]`, and the mono treatment matches our brand.

### 1.8 The race page has metadata rows and a community
📅 date · 📍 flag + location · ⛰ terrain (with an ⓘ). Then an avatar stack and
"6684 other Runnas". Then prose, then community posts.

We hold terrain data already, from the parkrun layer.

### 1.9 Coaches are people, with photos and credentials
"Your plan, built by real coaches and data" → a card listing coaches with
photo, role above name, chevron → a full bio page with socials and
credentials.

`lib/ben.ts` already holds stronger credentials than Runna's head coach.

### 1.10 Pre-empt the failure mode
"Getting the most out of your plan — Running doesn't always go to plan, and
that's okay." Then links to *Rearranging Runs* and *Skipping workouts*. Telling
someone how to miss a session is what stops them quitting when they do.

### 1.11 Empty states are designed
Icon, a sentence about what will appear, and an accent link to the action that
fills it. "You haven't set any personal records yet — Complete a workout."

---

## 2. Component-level notes

- **Session card**: coloured left stripe encoding intensity, title, meta line,
  an inset "briefing ready" row, and a **completion checkbox on the card** so a
  session can be ticked from Today without opening it.
- **4-up circular action grid** under the plan card: Plan Overview / Rearrange
  Workouts / Connected Apps / Manage Plan.
- **Estimated race time as a range** — "2:59:00 – 3:16:00 in 11 weeks". More
  honest than our single predicted figure.
- **Weather** beside "Today's workouts" (☁ 29°). Cheap, and it matters when the
  session is outdoors.
- **Week strip with a dot** under any day carrying a session.
- **2-up metric cards** with sparkline and time axis (Apple).
- **Trends card**: 2×2 of metric name + value + a direction chevron in a circle.
- **Paywall**: per-week price alongside the headline price, a SAVE badge on the
  annual, stars and review count, and "No payment due today, cancel anytime".

---

## 3. What we should NOT take

- **Runna's teal, Apple's lime, RoxFit's yellow.** We have an accent drawn from
  the arena seating in Ben's race photography. Three of these four apps use a
  near-black ground with a bright accent; that is the look Kieron rejected.
- **Emoji as iconography.** Runna uses it well, but on a site whose imagery is
  real race photography of the founder it would read as cheap.
- **Streaks and badges.** Gamification suits a self-serve app with no coach. We
  are selling access to a person; the retention mechanism is Ben, not a flame
  icon.
- **AI-generated plan copy.** Runna generates; Ben writes. The whole product
  claim is that a person decided this.

---

## 4. Ordered backlog this produces

1. **Ask Ben** — a message thread in the member area. The most requested and
   the only two-way channel we lack.
2. **RPE + numbered intervals** in the session structure.
3. **Block progress in the member header**, on every screen.
4. **Race pages** for the 113 real HYROX races, in the Runna/RoxFit card idiom.
5. **Plan confirmation screen** listing the inputs Ben's plan was built from.
6. **Coach bio page** from `lib/ben.ts`.
7. **"When life gets in the way"** — rearrange and skip, with guidance.
8. Estimated finish as a range; intensity glyphs; completion checkbox on Today.
