# PROGRAMMING ENGINE & THE PERSONALISATION PROBLEM

**Slots into the handover pack as:** `10-programming-and-personalisation.md`
**Source:** Kieron ↔ Ben conversation, 30 July 2026
**Amends:** `09-admin-control-centre.md` §4, §5, and Coach Mode in §0

---

## 1. THE CENTRAL QUESTION

Ben's words:

> "In the world of AI, everybody is just copying and pasting bullshit. People are kind of
> aware of that. So how do you automate things but still make it feel very human?"

This is the most important design question in the entire project, and it has a real answer
rather than a vague one.

### The counterintuitive principle

**Make the automated things obviously automated, so that when Ben writes, it's unmistakably him.**

Most platforms do the opposite. They dress every system message in fake warmth — "Hey Sarah!
Great job this week! 🔥" — and the result is that *nothing* reads as personal, because the
client can't tell which messages involved a human. Once someone suspects one message was
automated, they retroactively discount all of them. The fake warmth doesn't just fail, it
poisons the real thing.

So: receipts look like receipts. Payment reminders look like system messages. Session
reminders are plainly functional. And then when a message arrives that says *"Saw your ski
erg split from Manchester — that's 8 seconds off. The change we made to your pacing is
working. Don't get greedy on the sled this time"* — the client knows a human wrote it,
because it's the only kind of message that ever sounds like that.

### The five things that actually signal a human

**1. Specificity only someone who knows you could produce.**
Not "great work this week." Instead: "your sled push was 4 seconds faster than Manchester."
The system's job is to *surface the specific fact*. Ben's job is to say what it means.

**2. Visible trade-offs.**
AI-generated content is frictionless — everything is possible, everything is positive.
Human coaching shows a decision being weighed: *"I've cut your Thursday run. You can't
absorb that volume three weeks out from the ultra."* Naming what was sacrificed and why is
the strongest human signal there is.

**3. Willingness to say no.**
An AI will build you a plan for three races in four weeks. A coach says *"I don't think you
should race the Great North Run properly. Here's why, and here's what I'd do instead."*
Disagreement is unmistakably human. **Build the tool so it makes saying no easy**, not so it
optimistically accommodates everything.

**4. Asymmetric attention.**
Humans don't respond to everything with equal length. Some things get three paragraphs, some
get "nice one." Uniform response length is one of the clearest AI tells. Never nudge Ben
toward consistent message length.

**5. His actual voice, imperfections included.**
Short sentences. Abbreviations. The way he actually talks. A style guide that sands this off
makes everything worse.

### The architecture rule

> **AI builds the skeleton. Ben supplies the judgement. The client only ever sees the judgement.**

Concretely:

| Layer | Who | Client sees it? |
|---|---|---|
| Structural draft — volume, session distribution, progression curve | System | No — never |
| Conflict analysis and options | System | No |
| **Which option to take** | **Ben** | Yes, as the plan |
| **Coach's Note** — why this week looks like this | **Ben, typed** | Yes, prominently |
| Observations surfaced ("PB detected", "split improved 4s") | System | No — it's a prompt to Ben |
| The message about that observation | **Ben** | Yes |

### Two hard rules for the build

**The Coach's Note is mandatory and cannot be AI-drafted.**
One free-text field per plan block. Minimum ~30 words. Human-typed. **If it's empty, the
plan cannot be sent.** No AI-suggest button, no template picker, no "generate" option — the
moment that exists, it gets used every time and the whole thing collapses.

It sits on page one of the PDF, under Ben's name. It is the single most valuable object in
the product.

**Never send an automated message that pretends to be personal.**
The system may send: receipts, reminders, plan-ready notifications, payment links.
The system may **prompt** Ben to send: congratulations, check-ins, race-week messages,
anything relational.
The system may **never** auto-send anything that presents itself as Ben's personal thought.

---

## 2. THE RACE CONFLICT RESOLVER

This is the standout feature, and it came directly out of Ben's frustration:

> "I've got an ultra marathon in three weeks, then two weeks after that the Great North Run,
> then the week after that a Hyrox Pro Doubles race."
>
> "I'm sat there going, okay, if she does this, that doesn't work, and we put that there..."

That's periodisation conflict resolution done by hand in Excel. It's the highest-value thing
in Ben's head and the hardest thing to hire for. Systematise the analysis; leave the decision
with him.

### What it does

Input: all enrolled races with dates, distances, disciplines and priority.
Output: **the conflicts, made explicit, with options and trade-offs.**

For the example above:

| Race | Week | Demand | Recovery debt |
|---|---|---|---|
| Ultra marathon | 3 | Aerobic durability, huge volume | 10–14 days |
| Great North Run (HM) | 5 | Threshold | 3–5 days |
| Hyrox Pro Doubles | 6 | Mixed anaerobic + strength endurance | — |

**Conflicts the system should flag automatically:**
- GNR falls *inside* the ultra's recovery window. It cannot be a target race.
- Hyrox Pro Doubles sits 3 weeks post-ultra and 1 week post-GNR. Strength and anaerobic
  power — exactly what a high-volume ultra block degrades — are the primary determinants.
- Three taper windows overlap. **You cannot peak for all three.**

**What the system presents — options, not an answer:**

> **Option A — Hyrox Pro Doubles is the A race.**
> Ultra becomes a controlled long effort, not a race. Maintain 2 strength sessions through
> the ultra block. GNR run as a threshold session. *Trade-off: ultra time will be well below
> her capability.*
>
> **Option B — Ultra is the A race.**
> Full taper into it. GNR is a jog. Pro Doubles is participation only.
> *Trade-off: Pro Doubles performance will be poor, and it's a Pro division entry.*
>
> **Option C — Split the difference.**
> No true peak. Solid across all three, exceptional at none.
> *Trade-off: honestly, this is the worst of the three unless she just wants to enjoy them.*

Ben picks. Then — critically — **the tool drafts him a message explaining the choice to the
client**, which he edits. That conversation is the product. The analysis just gets him to it
in two minutes instead of forty.

### Also flags
- Two races closer than the minimum recovery window
- Race scheduled inside a planned deload
- Taper overlapping a strength block
- Insufficient build time for a stated target (e.g. sub-60 in 4 weeks from a 75-minute PB)
- Travel/timezone before a race
- Discipline conflicts (marathon block vs Hyrox strength requirements)

---

## 3. PLAN OUTPUT — CLIENT CHOOSES THE FORMAT

Ben's instinct was right: **spreadsheet-style is what most clients actually want**, because
they want to tick things off and add their own notes. But not all of them.

### The delivery flow

Client gets a notification: *"Your programme is ready."* → lands on a page → picks a format.
All formats generated from the same plan object, so they never diverge.

| Format | Why | Notes |
|---|---|---|
| **Interactive (in-account)** | Default. Tick off sessions, log results, leave comments Ben can see. | The one that drives retention — it's the only format that feeds data back. |
| **Excel / Google Sheets** | Ben's clients already live here. Editable, familiar, they can add their own columns. | Branded, formulas intact, printable. Locked header rows, unlocked note columns. |
| **Branded PDF** | Print it, stick it on the fridge, take it to the gym. | Chartreuse on near-black. Coach's Note on page one. |
| **Calendar (.ics)** | Sessions straight into their phone calendar. | Underrated — massively improves adherence. |

**Push the interactive version gently.** It's the only format where completion data flows
back, which is what makes the next block better and lets the system surface those specific
observations Ben needs for his messages. Offer the others freely, but make the in-account
version the default and the nicest.

### Two-way notes
Client comments on a session → appears in Ben's inbox against that session. Ben replies
inline. This is where the personal relationship actually lives day to day, and it's a
feature most platforms handle badly.

---

## 4. PROGRAMMING HORIZON ≠ BILLING CYCLE

**The most important structural correction to the current spec.**

From Ben:

> "They'll pay monthly, but some get week-to-week, some get every two weeks. If they're on a
> month but they've got a race in two weeks, I'll just go — here's two weeks, let's see how
> the race goes, then we'll have a chat and adjust."

So billing and programming are **completely decoupled**. Monthly payment, variable programming
horizon driven by race proximity and coaching judgement.

### Data model change

```
Client {
  billing_cycle:        monthly | manual
  billing_next_date:    date
  programming_cadence:  weekly | fortnightly | monthly | race_led
  programmed_until:     date        ← FIRST-CLASS FIELD
  programming_status:   current | due_soon | overdue | awaiting_race_debrief
  next_race_id:         fk
}
```

`programmed_until` is the field Ben asked for by name. It drives the Coach Mode dashboard,
the automation rules, and the client's own view.

### Automation on it
- 3 days before `programmed_until` → **prompt Ben to build the next block**
- On `programmed_until` with nothing queued → flag as overdue, notify Ben
- Race completed → set status to `awaiting_race_debrief`, prompt Ben to book the chat
- Debrief logged → unlock next block build

That `awaiting_race_debrief` state is Ben's actual workflow — "let's see how the race goes,
then we'll have a chat, then adjust." Model it explicitly rather than making him remember.

---

## 5. COACH MODE — REVISED AROUND BEN'S TWO MUST-KNOWS

He said it plainly:

> "The big thing is I need to know when they've got programming up until. From a logistical
> point of view, I need to know if they've paid or not."

That's the whole dashboard. Everything else is secondary.

### `/coach` — Today

**A single table, sortable, mobile-first. Three columns that matter:**

| Client | Programmed until | Paid |
|---|---|---|
| Sarah M. | **2 days** ⚠️ | ✅ Aug 12 |
| James T. | 18 days | ⚠️ **3 days late** |
| Priya K. | **Overdue** 🔴 | ✅ Aug 3 |

Plus a race column, since he asked for it:

| Client | Next race | When |
|---|---|---|
| Sarah M. | Hyrox Pro Doubles, London | 6 weeks |

**Above the table, three counts only:** plans due · payments late · races in 14 days.
No MRR. No churn. No graphs. He never sees a financial metric.

### Race enrolment
> "You can enrol them on races on your account so you can see which race they're working towards."

Races come from the Results Hub race calendar. Enrol a client → race appears on their profile,
on the diary, on the Today view, and feeds the conflict resolver. Multiple races per client,
each with a priority flag (A/B/C) — that priority is what drives the conflict analysis.

---

## 6. PAYMENT AMENDMENTS TO §5 OF DOC 09

### Current state (for the migration plan)
- Payments have been ad hoc
- A third party was collecting programming payments until two days ago — roughly £1,000
  processed to date
- 1:1 payments have been going directly to Ben's bank account
- **No recurring infrastructure exists.** This is a greenfield build, not a migration of
  an existing system.

### Onboarding flow Ben endorsed

Admin opens the client's record → clicks **Send Signup Link** → client receives a warm SMS
plus email with a Stripe Checkout link → picks their tier → subscription starts → marked
active automatically.

One click for the admin. That's the requirement.

### Existing client migration
Sequence to send:
1. Heads-up message: *"I'm moving everything onto a proper system so your programming and
   payments are all in one place — nothing changes for you except it gets easier."*
2. Signup link
3. Reminder at 3 days if not signed up
4. Manual follow-up flag at 7 days

Keep them on their current rate. Grandfather it in the record with a note, so nobody
accidentally "corrects" it later.

### CONFIRMED — build manual/offline payment marking
Cash and bank transfer happen and will keep happening.

Admin action: **Mark as Paid** → amount, date, method (cash / bank transfer / other),
optional reference, optional note. Writes a payment record, satisfies the period, updates
`billing_next_date`, appears in Finance flagged as `offline`, fully audit-logged.

Reconciliation view must show online and offline side by side so the finance picture is
complete.

### DEFERRED — Direct Debit
Ben's read was accurate: Bacs Direct Debit is more aggressive — the mandate survives a card
being cancelled, which is exactly why gyms use it. He said he'd explore it.

**Not in V1.** Design the payment model so a third method slots in later (GoCardless is the
route if it goes ahead), but don't build it. Also worth knowing: Direct Debit sits awkwardly
against a brand built on being friendly. Worth a proper conversation before committing.

### Notifications Ben asked for
- Text when a payment succeeds
- Text when a payment fails
- Client gets a text reminder
- All of it configurable per-event in Settings, on/off per channel

---

## 7. INTERNATIONAL TARGETING — WITH REAL DATA

Ben's thesis, and it's a good one:

> "HYROX is the same crowd as Ironman. You have to have some money to do it. Rich
> metropolitan areas. I'm going to target every rich metropolitan area."

**Targeting rule: affluence × Hyrox presence.** Not population. Not raw search volume.

### India — Ben's homework, done

He said he'd look into where in India. Here it is.

India has gone from **3 races in 2025/26 to 5 in 2026/27** — the fastest-growing Hyrox
market in the world right now.

| City | Dates | Venue |
|---|---|---|
| **Delhi** | 24–26 Jul 2026 | Yashobhoomi, Hall 1A/1B |
| **Mumbai** | 17–20 Sep 2026 | NESCO Centre, Hall 6 |
| **Gujarat** | 27–28 Nov 2026 | |
| **Noida** | 15–17 Jan 2027 | |
| **Bengaluru** | 12–16 May 2027 | |

Two things worth knowing:

**Delhi ran last week** — 24–26 July, India's first three-day Hyrox weekend and the opening
event of the 2026/27 season. There are fresh Delhi results in the system right now. A Delhi
results page published this week catches post-race search while it's peaking.

**The title sponsor is Masters' Union**, a business school. That tells you the demographic
directly — affluent, professional, English-speaking. Exactly Ben's target and exactly the
audience that buys premium online coaching.

Priority order: **Mumbai → Delhi/Noida → Bengaluru → Gujarat.** Mumbai has the highest
wealth concentration and its debut sold out.

### Confirmed targets from Ben's existing clients
- **South Africa** — he has a client there. Johannesburg (May 2026) and Cape Town (Aug 2026).
- **USA** — two clients. Largest national schedule at 9 events.

### Tier 1 — affluent + Hyrox host + English-speaking

| Region | Cities |
|---|---|
| UK | London, Manchester, Birmingham, Glasgow, Cardiff |
| USA | New York, Boston, Washington DC, Dallas, Denver, Anaheim, Tampa, Nashville, Salt Lake City |
| Middle East | Dubai, Abu Dhabi — very high disposable income, strong expat fitness culture |
| Asia-Pacific | **Hong Kong**, Singapore, Sydney, Brisbane |
| Canada | Toronto, Vancouver |
| Ireland | Dublin |
| South Africa | Johannesburg, Cape Town |

**Hong Kong is the single highest-priority international city.** It hosts the **World
Championships in June 2027**, it's extremely affluent, and it's English-speaking. Build that
page early and let it mature ahead of the event.

### Tier 2 — affluent, needs native-language content
Munich, Hamburg, Berlin, Frankfurt, Düsseldorf, Karlsruhe (Germany is Hyrox's founding and
deepest market) · Zurich, Geneva · Paris, Lyon, Bordeaux, Nice · Amsterdam, Utrecht,
Maastricht · Milan, Rimini · Madrid, Barcelona, Valencia, Málaga · Copenhagen, Stockholm,
Oslo, Helsinki

### Tier 3 — emerging, watch and enter early
Seoul, Incheon · Tokyo, Chiba · Shanghai, Guangzhou, Shenzhen, Hangzhou · Jakarta ·
Mexico City, Monterrey, Puebla · São Paulo, Rio, Buenos Aires · Warsaw, Poznań, Gdańsk ·
Istanbul

**Strategic note:** the Asian expansion is significant — ten-plus events in the region means
athletes no longer travel internationally to race, which means genuine local search demand
is forming right now. Entering these markets before the content competition arrives is
cheap. In eighteen months it won't be.

---

## 8. AMENDMENTS SUMMARY FOR CLAUDE CODE

Changes to `09-admin-control-centre.md`:

1. **§0 Coach Mode** — Today view rebuilt around three columns: `programmed_until`,
   payment status, next race. No financial metrics ever.
2. **§3 Clients** — add `programming_cadence`, `programmed_until`, `programming_status`,
   race enrolments with A/B/C priority.
3. **§4 Training Plans** — add the Race Conflict Resolver. Add multi-format output
   (interactive / Excel / PDF / .ics). **Coach's Note becomes a mandatory, human-typed,
   send-blocking field with no AI-assist.**
4. **§5 Payments** — manual/offline payment marking is CONFIRMED for V1. Direct Debit
   DEFERRED. Add the existing-client migration sequence. Note there is no legacy system to
   migrate from — greenfield.
5. **§15 Automation** — add `programmed_until` triggers and the `awaiting_race_debrief` state.
6. **NEW GLOBAL RULE for `rules/HARD-RULES.md`:**
   *The system may send transactional messages and may prompt Ben to send personal ones. It
   may never auto-send a message that presents itself as Ben's personal thought. The Coach's
   Note has no AI-assist and blocks send when empty.*

---

## 9. OPEN QUESTIONS

1. **Tier structure and pricing.** Ben mentioned "different options" but they aren't defined.
   Needs: tier names, what programming cadence each includes, price per tier, currencies.
2. **What was the third party charging**, and does anything need unwinding with them?
3. **Excel vs Google Sheets** for the spreadsheet output — or both? Affects the generation
   library choice.
4. **Does Ben want client session comments as push notifications**, or batched into a daily
   digest? Real-time will get noisy fast.
5. **Race priority (A/B/C)** — set by Ben, by the client during onboarding, or both?
