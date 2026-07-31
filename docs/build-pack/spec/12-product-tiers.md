# PRODUCT TIERS & THE ROUTING LADDER

**Slots into the handover pack as:** `12-product-tiers.md`
**Corrects:** `07-product-spec.md` — the three-tier model was wrong
**Source:** Kieron ↔ Ben conversation, 30 July 2026

---

## 1. CORRECTION TO DOC 07

Doc 07 described three tiers, with "private coaching with Ben" as the top one. That collapsed
two genuinely different products into one.

Ben's distinction, in his words:

> "For a lot of people, that's just one-to-one coaching. But my one-to-one coaching is
> **actual** one-to-one."

**Personal Programming and 1:1 Coaching are separate products at separate prices.** The model
is four tiers.

---

## 2. THE FOUR TIERS

| | Tier | Price | What it is | Ben's time |
|---|---|---|---|---|
| 0 | **Free** | £0 | Results Hub, leaderboard, calculators, all content | None |
| 1 | **Hub** | **£12.99/mo** | The product. Plans, video library, logging, full analytics, community | Minimal — see §5 |
| 2 | **Personal Programming** | **£80/mo** | Bespoke programme built around your constraints, reviewed fortnightly | ~1h/month per client |
| 3 | **1:1 Coaching** | TBD | Actual one-to-one. Direct access, sessions, ongoing contact | High — hard capacity cap |

### Tier 0 — Free
Pure acquisition. Exists to rank and capture email. Results lookup, athlete search, race
pages, benchmark calculators, public leaderboard. No plan, no logging.

### Tier 1 — Hub, £12.99/mo
The mass-market product and the one already partly built. Feature-flagged and hidden until
ready to deploy.

- Adaptive training plans — **algorithmic and templated, not built by Ben**
- Full video library, every station
- Workout logging with watch sync
- Full analytics: splits, station benchmarking, percentile ranking against real field data
- Competitor tracking
- Race-day pacing plans from venue data
- Nutrition log
- Community
- **Q&A access** — see §5, this needs careful framing

### Tier 2 — Personal Programming, £80/mo
Ben's current core product. The process he described:

1. **Free intake call.** Ben asks: what does your training look like now · strengths ·
   weaknesses · what you've done in Hyrox and what went well or badly · which days you can't
   train and why · what equipment you have access to and when · any other constraints.
2. He builds a bespoke programme around those constraints.
3. *"Let's talk again in two weeks."*
4. Fortnightly review, adjust, repeat.

Includes everything in Hub, plus the bespoke programme, plus the review calls, plus direct
messaging with Ben.

**Programming cadence is variable** — weekly, fortnightly, monthly, or race-led (doc 10 §4).
Billing is monthly regardless.

### Tier 3 — 1:1 Coaching, price TBD
Genuine one-to-one. Everything in Tier 2 plus real ongoing contact — sessions, live check-ins,
whatever "actual one-to-one" means in practice.

**Needs defining before it can be sold.** See §7.

---

## 3. THE INTAKE CALL IS A ROUTER, NOT A SALES CALL

This is the structural insight in Ben's description, and the current site doesn't reflect it.

The free call doesn't sell one product. It **sorts people into the right tier**:

```
Intake call
├── Wants bespoke, budget fine          → Tier 2 (£80) or Tier 3
├── Wants bespoke, can't afford £80     → Tier 1 (£12.99)  ← DOWNSELL, not a loss
├── Doesn't want bespoke                → Tier 1
└── Not ready                           → Free tier + nurture
```

Kieron's framing of the downsell was exactly right:

> "You could sign up to my monthly coaching — really affordable, £12.99 a month, where you
> have access to all of this data, it'll track your progress, you can message me on the app
> anytime."

**Build "Downsold to Hub" as a positive call outcome**, not a lost-lead status. A £12.99
subscriber who came off a call with Ben is a high-retention subscriber and a future Tier 2
upgrade. Record it as a win.

### Call outcomes to record
`Signed — 1:1` · `Signed — Programming` · `Downsold — Hub` · `Not now, follow up [date]` ·
`Not a fit` · `No show`

---

## 4. THE QUIZ SHOULD DO THE CALL'S WORK

**Ben's time on intake calls is the bottleneck on the whole business.** It doesn't scale, and
every unqualified call is an hour he doesn't get back.

Look at what he asks on the call against what the quiz already collects (doc 02, Branch B):

| Ben asks on the call | Quiz screen |
|---|---|
| What does your training look like now | 10, 11, 17, 18 |
| Strengths and weaknesses | 12 |
| What you've done in Hyrox, what went well | 4, 5 |
| Which days you can't train | 15 |
| Equipment access | 14 |
| Target and race | 6, 7, 8 |
| Injuries and constraints | 19 |

**Nearly all of it.** So:

### Build a Call Prep Sheet
The quiz generates a one-page brief Ben reads before the call: their answers, their real PB
pulled from the Results Hub, their percentile, their equipment gaps, their constraints, and
the conflict analysis if they have multiple races booked.

A 30-minute discovery call becomes a 10-minute confirm-and-close. Three times the calls in
the same hours.

### Add budget qualification to the quiz
One screen, framed as a service question rather than a means test:

> **"How would you like to work with Ben?"**
> - Bespoke programme built around me, with regular reviews — *from £80/month*
> - Structured plans and full tracking, message Ben with questions — *£12.99/month*
> - Not sure — talk it through on a call

This routes people to the right tier before Ben spends an hour on someone who was always
going to be a £12.99 subscriber. It's not a filter to exclude people — it's a filter so the
right people get his time.

---

## 5. THE MESSAGING PROBLEM — AND THE ANSWER

The Hub pitch includes *"you can message me on the app anytime and I'll answer any questions."*

At 50 subscribers that's charming. At 500 it's £6,500/month of revenue against Ben's entire
waking life, and the £80 clients — who are paying six times as much for access — get a worse
experience than the £12.99 ones. That inverts the value ladder and kills Tier 2.

**This is exactly what the AI assistant in doc 11 §5 is for.** The architecture already
solves it:

| Tier | Messaging |
|---|---|
| **Hub £12.99** | **"Ask SUV"** assistant, unlimited. Handles terminology, technique, logistics, plan explanation. Genuinely useful coaching questions escalate to a **weekly group Q&A** that Ben answers in one sitting. |
| **Programming £80** | **Direct messaging with Ben.** Stated response time — within 48h on weekdays. |
| **1:1** | Direct access, fast response, defined in §7. |

The honest framing for Hub: *"Ask questions any time — our assistant answers instantly, and
Ben answers the community's questions every week."* That's a real benefit, deliverable
forever, and it doesn't promise something that breaks at scale.

**Direct access to Ben is what Tier 2 is for.** Keep it there. It's most of why someone pays
six times more.

---

## 6. THE LADDER WORKS BOTH DIRECTIONS

The engagement flags from doc 09 §3 already give you the upgrade triggers. Wire them:

**Hub → Programming prompts:**
- Has a race booked within 12 weeks
- Logged 15+ workouts in a month (high engagement, wants more)
- Asked the assistant 3+ genuinely coaching-level questions
- Hit a plateau — benchmarks flat for 6 weeks
- Been subscribed 3+ months

Prompt copy comes from Ben, not the system: *"You've been putting the work in. If you want
something built properly around your race, that's what the programming tier is for."*

**Programming → Hub (soft landing):**
Someone cancelling £80 gets offered £12.99 rather than leaving entirely. Retention at a lower
price beats churn, and they're a future upgrade.

---

## 7. PRICING OBSERVATIONS

Not decisions — you've set £12.99 and £80 and they're live. But two things worth having on
record.

**£80 for Tier 2 looks low.** A bespoke Hyrox programme from an Elite 15 athlete, with
fortnightly review calls, at £80/month. For comparison: Runna is roughly £16/month for
purely algorithmic plans with no human involvement, and human online coaches typically sit
at £150–300/month. Ben's credentials are at the very top of the market and the price is near
the bottom of it.

The risk of underpricing here isn't just lost revenue — it's that £80 signals "template
service" to exactly the affluent metropolitan buyer you identified as the target. That buyer
often reads cheap as low-quality.

Worth testing £120–150 on new clients while grandfathering existing ones at £80. Existing
clients keep their rate permanently, recorded with a note so nobody "corrects" it later
(doc 10 §6).

**Tier 3 needs a definition before it can be priced.** Right now "actual one-to-one" isn't
specified. Needs: how many sessions, what contact frequency, what response time, whether
sessions are video or in-person, and **how many clients Ben can hold at once.** Until that's
defined it can't go on the site, and it's currently the tier that anchors everything else.

---

## 8. BUILD IMPLICATIONS

1. **Four tiers in the entitlements model**, not three:
   ```
   entitlements: {
     free:                 always true
     hub_subscription:     active | trialing | past_due | cancelled
     personal_programming: active | paused | none
     one_to_one:           active | paused | none
   }
   ```
2. **Hub feature-flagged and hidden** until deploy-ready, per Kieron's instruction.
3. **Call Prep Sheet** generated from every completed quiz.
4. **Call outcome tracking** with the six statuses in §3, including downsell as a positive.
5. **Budget/service routing screen** added to the quiz.
6. **Tier-aware messaging:** assistant for Hub, direct to Ben for Programming and above.
   Enforced by entitlement, not by convention.
7. **Weekly group Q&A** — a feature, not a chat channel. Questions queue during the week, Ben
   answers in one sitting, answers publish to all Hub subscribers. One hour serves everyone.
8. **Upgrade prompt engine** driven by the §6 triggers.
9. **Downgrade offer** on cancellation from Programming.
10. **Tier 3 hidden entirely** until §7 is answered.

---

## 9. OPEN QUESTIONS

1. **Define Tier 3.** Sessions, contact, response time, capacity, price. Blocking its launch.
2. **Is Hub included in Tier 2?** Doc 11 assumes yes. Confirm.
3. **Weekly group Q&A format** — written, video, or live? Written is cheapest and most
   reusable; video is better for the brand.
4. **Trial on Hub?** 7 or 14 days, card required or not.
5. **Annual pricing on Hub?** £12.99/mo → roughly £129/yr at two months free. Materially
   improves cash and retention.
6. **Does the free intake call stay free at scale**, or become a paid consultation once
   demand exceeds capacity? A £25 call fee, credited against the first month, filters hard
   without excluding anyone serious.
