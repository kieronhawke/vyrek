# MarchOn teardown — the reference for the member app and the funnel

Source: `~/Documents/01 Business/Marchon/Marchon APP` (69 frames) and
`Marchon website MOBILE` (30 frames), supplied by Kieron 2 August 2026 as the
example of what he wants Suth Performance's app and account area to feel like.

This is a **structure and interaction** reference, not a palette reference.
Where we deliberately diverge, it says so and why.

---

## 1. Information architecture

Five tabs in a floating pill bar, brand mark as the centre icon:

| Tab | Holds |
|---|---|
| **Nutrition** | Food diary · Macros · Weight log |
| **Plan** | The current training phase, phase snapshot, KPI progress |
| **Today** | The session, the week strip, the streak — the default landing tab |
| **Community** | Per-programme channel, coach Q&A threads, member profiles |
| **Account** | Profile, subscription, integrations, display settings |

Today sits centre and is what the app opens on. Everything above it in the
hierarchy — programme, phase, week — is a control in the header, not a screen.

**For Suth:** the same five tabs map onto what already exists at `/app`
(`today`, `plan`, `progress`, `nutrition`, `account`) with Community as the
one genuinely new surface. `progress` folds into Plan as the phase snapshot.

---

## 2. The devices that do the work

Almost everything good about the app is one of eight repeated devices. Build
these as components once and the rest is composition.

### 2.1 One question per screen
Enrolment never shows two things at once. Hairline progress bar pinned to the
top, one question, one line saying *why it is being asked* ("Community members
will be able to see this", "This information helps us calculate your nutrition
targets"), one control, and a Continue button that stays visibly disabled until
the question is answerable. Multi-select questions state the constraint in the
subtitle ("Select 1-2 answers").

### 2.2 Photo behind, content bottom-left
Full-bleed image, content anchored in the bottom third over a gradient:
wordmark, heavy caps headline, one paragraph, a solid pill primary and a ghost
pill secondary. Used for the splash, the three onboarding slides, and every
programme card. **This is the pattern Kieron pointed at**, and it is what the
Elite 15 frames were shot for.

### 2.3 Quantity in colour, name in white
Every prescription line reads `5 reps` **Barbell Front Squat**, with the
quantity in the accent and the movement in white, and a muted sub-line beneath
carrying the qualifier (`@ 20X1 Tempo`, `@ 70% 1RM`, `@ 5:30/km - 5:40/km`).
The number is the part you scan mid-set, so the number gets the colour.
Identical treatment in warm-up, working sets, running intervals and the player.

### 2.4 Chips carry the metadata
Set type, repeat count, load and duration live in small pills above the
exercise, never in a sentence: `Straight set · 2 sets`, `Circuit · Repeat 2x`,
`5:00 Aerobic · 1 set`, `Empty Barbell Warm Up @ 20/15kg · 1 set`.

### 2.5 The hatched rest band
Rest is a full-width band with a diagonal hatch fill and a stopwatch glyph —
`Rest as needed between sets`, `Rest 3 mins between sets`. Visually it reads as
"nothing happens here", which is exactly right. Distinctive and cheap to build.

### 2.6 Blocks as lettered stops
A session is `W · A · B · C · D · E · F` across the top: current one filled in
the accent, completed ones ticked, remaining ones muted. You always know how
much is left without scrolling. The warm-up gets `W` rather than a number.

### 2.7 The week strip
Seven columns, weekday initial over date, today boxed. In Nutrition the same
strip carries state per day (outlined = targets hit, hatched = rest day).

### 2.8 Timeline gutter
Nutrition lays the day out against times in a left gutter (07:00, 12:00,
15:00, 19:00) with meal cards to the right, and the workout itself appears in
the timeline as a hatched band. Pre- and post-workout are their own rows.

---

## 3. Screen-by-screen notes

### Today
Programme switcher and streak chip in the header, week strip, then a
horizontal row of action chips (`Phase Recap`, `Rearrange Week`, `View…`),
then the day. Rest days are not blank — they carry a written reason from the
coach ("An extra rest day to further facilitate recovery this week and save
juice for our KPI retests"). First-run state is designed rather than empty: a
"Complete a Welcome Workout" carousel with a `#1 Recommended` chip and a
`Set reminder` / `View workout` pair.

The marketing screenshots show a **Momentum score** — one big number with a
delta chip (`↗ 4 pts`) and a sentence explaining it. A single headline number
with a plain-English explanation is worth stealing; the specific metric is not.

### Plan
Phase pager (`‹ Pre-Competition Phase ›`), a coach video with a duration badge,
`Week 1 of 10` chip, then **Phase snapshot** — three stat tiles (Sessions,
PB's, Training Time) — then **KPI Progress**.

KPIs are named benchmark tests with a plain-English definition
(`IMPULSE — Your score is the total combined weight of all 3 successful clean
and jerks`), a Current column with an `Add` button, and a Retest column showing
a relative date. Missing data is an explicit warning row, not a blank.
Logging opens a **custom numeric keypad** rather than the system keyboard —
big targets for gym use.

### Workout preview → player
Preview: exercise demo video chips along the top, a `Glossary` link, blocks
with chips and prescriptions, a `Coach's notes` section, sticky `Start workout`.

Player: elapsed time, `AI Coach` chip, red `Finish`; segmented progress bar;
current set as a large prescription line; a central circular timer flanked by
reps and kg; a `Next` carousel of upcoming sets with thumbnails; a floating
bottom bar with play, `Rest 01:30`, and a focus control. Blocks carry a
thumbs-up/thumbs-down so the athlete can rate the session inline.

An AI recommendation appears as a bottom sheet: a paragraph of reasoning, a
reps/load table with a tick per set, and `Accept Recommendation`.

### Nutrition
Three pill tabs. Food diary shows a macro summary card (`0/2016 cal` with
Protein/Carb/Fat bars), a hydration reminder chip, then the timeline. Each
meal card carries four coloured progress dots — white calories, red protein,
blue carbs, orange fat — and a `+` to log. Sticky white `Log Food`.

Logging is **natural language**: "Describe your meal…" with a voice input,
plus a `Previous meals` tab. Weight log takes weight, up to five photos and
notes.

### Community
Per-programme channel with a member count and the coach's handle. Threaded
Q&A, avatars, reactions, and a member profile sheet on tap. The content is
mostly real coaching questions being answered publicly — that *is* the product.

### Account
Avatar with initials on a gradient plus a camera badge, name, email, two ghost
pills (`Subscription`, `Edit profile`), then an upgrade card. Edit profile is
label-above-value rows with hairline dividers and a disabled `Save` until
something changes; the email row is read-only with an explanation in the label
itself (`Email (please contact us to update)`). Integrations get their own
screen (Garmin Connect).

Upgrade sheet: three ticked benefits, two plan cards side by side with a
`Save 52%` badge on the annual, and a CTA that names the choice
(`Continue to Annual`).

### Phase recap
A shareable end-of-phase summary card with a small theme picker (white /
hatched / green) and `Copy to clipboard` + `Share`. Cheapest marketing surface
in the product; it is pure retention.

---

## 4. The website funnel

- **Hero** — full-bleed video, huge condensed caps headline, one paragraph,
  one accent pill CTA (`FIND YOUR PLAN →`), star rating underneath.
- **Social proof band** — `TRUSTED BY THOUSANDS`, then a full-width solid
  accent bar reading `AFTER 10 WEEKS`, then three large percentages.
- **Bracketed eyebrows** — `[ GET MOTIVATED ]`, `[ FUEL YOUR PERFORMANCE ]`
  above section headlines. Distinctive, costs nothing.
- **Programme carousel** — photo cards with outline tag chips, a scrollbar
  track and circular prev/next buttons.
- **Quiz** — wordmark plus hairline progress, one question per screen, large
  pill options, tap to advance. Interrupted mid-flow by a reassurance
  interstitial: a value proposition and stacked five-star review cards.
- **Results** — `Your perfect program`, with key phrases highlighted inline in
  the accent, then recommended programme cards.
- **Paywall** — a stat headline, a benefit card with outline circle icons,
  laurel badges, and `TRY FOR £0.00` rather than "start free trial". The trial
  is also drawn as a vertical timeline: Today → Day 5 (reminder email) → Day 7.
- **FAQ** — on a **white** section, black caps heading, plus-toggle accordion.
- **Handoff** — `You're in`, confirm the login email, store buttons.

---

## 5. Where we deliberately diverge

**Palette.** MarchOn is near-black with an acid lime (`#CCFF00`-ish). Our
control surface currently uses `#a3e635` on `#0a0a0a` — near enough the same
thing, and it is what Kieron flagged as hard to read. We take the structure and
drop the palette: a light ground, and an accent drawn from the Elite 15
photography rather than from MarchOn.

Worth noting that MarchOn themselves go light exactly where reading and typing
happen — the sign-up panel and the FAQ are both white sections. Going light for
an admin console is consistent with their own logic, not a departure from it.

**Density.** Their app is a consumer app at comfortable sizes. Our admin was
specced at 13px. We take their sizing, not the spec's.

**Named metrics.** `Momentum score`, `IMPULSE`, `LINE`, `VECTOR` are their
inventions. We need our own, grounded in HYROX — station splits, roxzone time,
run degradation — rather than borrowed names that mean nothing to our athletes.

**AI coach.** They surface an `AI Coach` chip in the player and auto-generate
load recommendations. We have no ANTHROPIC_API_KEY wired yet and Ben's
tolerance for an assistant changing programming is an open question in
QUESTIONS.md §19. Build the surface, leave the behaviour behind the flag.
