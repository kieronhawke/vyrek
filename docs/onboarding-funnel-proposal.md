# Suth Performance — Onboarding, CTA and Funnel Proposal

Prepared 30 July 2026. Owner of this workstream: the onboarding terminal.
Supersedes the CTA and quiz sections of `docs/capture-funnel-spec.md`;
everything else in that spec (lead delivery, cadences) still stands and is
carried forward here.

**Decisions already signed off by Kieron (30 Jul):**

1. **Pricing carve-out.** The self-serve tier shows its price publicly. Every
   coached path stays price-free and ends at Ben's free call. The no-pricing
   policy now applies to coaching only, not to the club checkout.
2. **Name: Suth Club.** URL `/club`. Nav "Suth Club". Button "Join Suth Club".
3. **Trial: 7 days free, no card.** Card requested on day 5 inside the members'
   area, not at signup.

---

## 1. The problem with what is live today

| Issue | Evidence | Cost |
|---|---|---|
| CTA copy does not name a benefit | "See your Week 1 free", "Start training", "Get your personalised week" appear across 25+ files | "Week 1" is meaningless to a cold visitor. It describes our internal artefact, not their outcome. |
| CTA and destination disagree | "See your Week 1 **before you pay**" leads to a funnel where we publish no price | Creates a price question we then refuse to answer. Classic trust leak. |
| One quiz for every audience | Quiz v3 is HYROX-only, 13 questions, asks "Have you raced a Hyrox before?" at screen 2 | Every beginner arriving from a `/personal-trainer` page is asked about race times. They leave. |
| No sift | Every finisher lands on the same reveal, then an account form | We cannot tell a £150/mo coaching lead from someone who will never speak to a human. Ben's time gets spent on the wrong calls. |
| Password wall at the end | `screens/account-creation.tsx` asks email **and password** after the reveal | Password fields at the point of highest intent are the single most common drop in this pattern. |
| Email captured only at the end | Same screen | The ~60% who abandon mid-quiz are unreachable. No abandonment sequence is possible. |
| Desktop is a phone in a box | `quiz-shell.tsx` is `max-w-md` on every breakpoint | On a 27" monitor the quiz is a narrow strip. Nothing fills the space, nothing builds while they answer. |
| Nothing visibly builds | Answers go into state and appear only at the reveal | Noom's core mechanic is that the plan updates in front of you. We are asking for effort with no visible return until the end. |

## 2. The three outcomes

Every call to action on the site now funnels to exactly one of three ends.

```
                       ANY CTA
                          │
                   THE RIGHT QUIZ
                  (chosen by the page)
                          │
                    ┌─────┴─────┐
                THE SIFT (screen ~12)
          ┌───────────┼───────────┐
          ▼           ▼           ▼
     SUTH CLUB    COACHED      COACHED
     self-serve   beginner      HYROX
     £X/mo        £100-150/mo   £100-150/mo
     7 days free  free call     free call
     instant      with Ben      with Ben
```

| Outcome | Who | Close mechanism | Ben's time |
|---|---|---|---|
| **Suth Club** | Wants structure, not conversation. Price-sensitive, self-starting, or simply not ready to talk. | Self-serve. 7-day no-card trial, then card. | Zero marginal. Content is filmed once. |
| **Coached, beginner door** | "I want to get fit and I want someone to keep me at it." | Contact details captured, lead lands in admin, instant SMS + email to them and to Ben, Ben calls and closes. | ~2h/month per client. |
| **Coached, HYROX door** | Racing or racing soon, wants a number. | Same as above, different language and different qualification. | ~2h/month per client. |

Nobody is ever rejected. The club is presented as a legitimate choice, never as
a consolation prize. That framing matters: a downsell that feels like a
downsell converts badly and damages the brand.

## 3. What we are actually selling

### 3.1 Suth Club

**Positioning line:** "Elite structure, without the elite price tag."

Recommended price: **£12.99/mo or £99/yr.** Reasoning:

- Runna is £15.99/mo and is the comparator most of our audience already knows.
  Sitting just under it is legible without looking cheap.
- The existing config (`lib/pricing.ts`) is £8.99. That is under-priced now that
  the club contains Ben's courses and monthly Q&A, and it is a weak anchor
  against £100-150 coaching.
- £99/yr is a clean annual number that funds the acquisition cost up front.
- **Needs Kieron's sign-off.** Nothing is built assuming the number.

Inside:

| Feature | Why it is in there |
|---|---|
| Personalised 12-week programme, dated | The thing they came for |
| Rebuilt every Sunday from what they logged | Makes the subscription earn its keep weekly |
| Full station video library | HYROX-specific, we already have the guides |
| Ben's courses: First Race, Beginner Foundations, Station Masterclasses | Films once, sells forever |
| Monthly members' Q&A with Ben, recorded | The one bit of "access to Ben" that scales |
| "Ask Ben" async thread | Ben answers the best ones monthly, publicly, in the members' area |
| Monthly form-check reel | Members submit a clip, Ben reviews a selection on camera |
| Monthly challenge and real leaderboard | The retention mechanic. Weeks 3 and 4 are where beginners quit |
| Race-week protocol and pacing tools | Genuinely useful, genuinely ours |
| Printable session cards | Sounds small. Beginners in a gym with a phone in their hand hate scrolling |
| Partner perks (gyms, kit) | Uses the partner rails we already built |
| Cancel any time, no call to cancel | Say it out loud. It removes the main objection to a card |

Built-in upgrade path: at day 30, every member gets one offer of a free call
with Ben. The club is not just a revenue tier, it is the largest lead pool we
will ever have.

### 3.2 Coached (both doors)

**Positioning line:** "Ben in your corner, every week."

Price stays off the site. Internal band £119-149/mo, agreed on the call.

Inside: programme written personally by Ben, weekly review and adjustment,
direct messaging with a stated response window (24h Mon to Fri), monthly 30
minute 1:1 video call, race-day strategy, life absorbed into the plan
(holidays, injuries, work chaos), and Suth Club included.

### 3.3 The offer we advertise

This is the answer to "what will people actually want to sign up for".

The research is consistent and it points away from a free trial for the coached
path. Two-Brain's data has free consultations producing the best client
retention, and boutique studios see 30-45% conversion on free trials against
60-80% on a paid intro with a consultation attached. Free trials optimise for
signups; consultations optimise for clients.

So we run two different offers, one per outcome, and stop trying to make one
offer serve both:

> **Coached path headline offer:**
> "A free personalised plan, and a free 15-minute call with an Elite 15 HYROX
> athlete."

That is rare, verifiable, costs us nothing in marginal delivery, and it is
honest. Nobody else in the competitor table offers a call with an athlete of
Ben's record as the entry point.

> **Club path headline offer:**
> "7 days free. No card needed. Cancel any time."

Ladder puts "No Credit Card To Start" in its hero as a selling point in its own
right. It removes the only real objection at the top of a self-serve funnel.

What we deliberately do **not** say: "See your Week 1 free". It describes our
mechanism, not their outcome, and it implies a price we then will not show.

## 4. The CTA system

### 4.1 Rules

1. Two to five words. Verb first.
2. First person where the button is the user's own action ("Build **my** plan").
   Michael Aagaard's much-replicated test had first-person beating second-person
   by ~25% on exactly this kind of button.
3. The button must name what happens next. If it says "plan", a plan appears.
4. One primary CTA per viewport. A second CTA is allowed only when it serves a
   genuinely different temperature of visitor (ready to talk vs not ready).
5. Every primary button carries a one-line reassurance underneath: time cost,
   money cost, or commitment cost. Usually all three.

### 4.2 The set

| Surface | Primary CTA | Reassurance line | Secondary CTA |
|---|---|---|---|
| Homepage hero | **Build my free plan →** | "3 minutes. Free. No card." | Book a free call with Ben |
| Nav (all marketing pages) | **Build my plan** | none (nav) | none |
| Sticky mobile bar | **Build my free plan** | none | none |
| `/personal-trainer` and `/personal-trainer/[city]` | **Build my free plan** | "3 minutes. Built around your life in {City}." | Book a free call with Ben |
| `/hyrox-training/[city]`, `/hyrox/*`, station guides | **Build my race plan →** | "3 minutes. Dated to your race." | Book a free call with Ben |
| `/club` | **Start 7 days free** | "No card needed. Cancel any time." | See what's inside |
| `/pricing` (coaching options) | **Book your free call** | "15 minutes, video or phone. No pitch." | Start 7 days free |
| Blog, beginner cluster | **Build my free plan →** | "3 minutes." | none |
| Blog, HYROX cluster | **Build my race plan →** | "3 minutes. Dated to your race." | none |
| Tools and calculators | **Turn this into a plan →** | "3 minutes. Free." | none |
| Free-consultation page | **Book my call** | "Ben calls you. No pitch, no obligation." | none |
| Partner routes | **Apply to join** (unchanged) | | |

### 4.3 What gets rewritten

Full inventory of the strings to replace, from grep across `app/`,
`components/` and `lib/`:

| File | Current | Becomes |
|---|---|---|
| `components/marketing/nav.tsx:70` | "Start training" | "Build my plan" |
| `components/marketing/hero.tsx:139,147` | "See your Week 1 before you pay." / "See your Week 1 free" | New hero copy, "Build my free plan" |
| `components/marketing/sticky-mobile-cta.tsx:35` | "See your Week 1 free" | "Build my free plan" |
| `components/marketing/plan-deep-dive.tsx:63` | "Get your personalised week →" | "Build my free plan →" |
| `components/blog/post-final-cta.tsx:24` | "See your Week 1 free →" | Cluster-aware: "Build my free plan →" or "Build my race plan →" |
| `components/plan/sticky-cta.tsx:24` | "Start training. 7 days free →" | "Start 7 days free →" |
| `components/landing/geo-landing.tsx:44,204,557` | "See your Week 1 before you decide anything." / "See your Week 1" / "Start training with a plan that knows you." | Rail-aware hero and section copy |
| `lib/pricing.ts:12` | `ctaLabel: "Start training →"` | `ctaLabel: "Start 7 days free →"` |
| `app/layout.tsx:54,74` | Site description "See your Week 1..." | New description naming the free plan + free call |
| `app/quiz/page.tsx:12,28` | "see your Week 1 before you pay" | New quiz metadata per flow |
| `app/how-it-works/page.tsx:36` | "See your Week 1" | "Build my free plan" |
| `app/not-found.tsx:19` | "See your Week 1 before you pay." | "3 minutes to a free plan." |
| `app/hyrox/[city]/page.tsx:192`, `app/hyrox/gear/[slug]/page.tsx:190` | "see your Week 1 free" | "Build my race plan" |
| `app/hyrox-training/[location]/page.tsx:25` | metadata "See your Week 1..." | New metadata |
| `app/partners/dashboard/page.tsx:433` | partner swipe copy "personalised week 1" | Updated swipe copy |

Every "before you pay" instance goes. We do not publish coaching prices, so we
must stop implying one is coming.

## 5. The quizzes

One engine, three configured flows. Shared shell, shared components, three
question sets. `lib/quiz-flow.ts` already recomputes visible screens from
answers, so this is configuration, not a rewrite.

**The page pre-answers question one.** A visitor arriving from
`/personal-trainer/leeds` has already told us they want a personal trainer.
Asking them "what brings you here" wastes the highest-attention screen on the
whole funnel.

| Entry surface | Flow | Rail pre-set |
|---|---|---|
| Homepage, `/quiz`, `/how-it-works` | **Flow A** | none, screen 1 asks |
| `/personal-trainer`, `/personal-trainer/[city]` | **Flow A** | beginner |
| `/hyrox-training/*`, `/hyrox/*`, station guides, tools | **Flow B** | athlete |
| `/club` | **Flow C** | club, no call offered |
| Blog | A or B by cluster | by cluster |
| `/free-consultation` | no quiz, direct form | for people already sold |

### 5.1 Flow A — "Find your plan" (general and personal-training doors)

Soft, warm, zero jargon, no mention of HYROX until late and only as an option.

| # | Screen | Type | Notes |
|---|---|---|---|
| 1 | What brings you here? | single, auto-advance | Get fit or lose weight / Get stronger and more confident / Train for my first HYROX / Get faster at HYROX / **Not sure yet, help me work it out**. Skipped when the page pre-sets the rail. Last two hand off to Flow B. |
| 2 | What matters most right now? | single | Lose weight / Feel stronger / More energy / Feel confident again / Be healthy for my family |
| 3 | Where are you starting from? | single | Haven't trained in years / A bit active / Active but no structure / I was fit once and want it back |
| 4 | INTERSTITIAL | no question | "That is the most common answer we get. It is almost never a willpower problem. It is a programming problem, and that is fixable." Photo of Ben coaching. |
| 5 | Tried before and it didn't stick? | single | Several times / Once or twice / First real go |
| 6 | **EMAIL** | single field | "Let's save your plan. Where should we send it?" One field. No password, ever. Magic link. GDPR consent line. |
| 7 | What gets in the way? | multi, no auto-advance | Time / Didn't know what to do / Boredom / Gyms intimidate me / Injury / Doing it alone |
| 8 | Where will you train? | single | Gym / Home, minimal kit / Home, some kit / Outdoors / Mix |
| 9 | What kit do you have? | multi, conditional | Only when not "full gym" |
| 10 | Days a week, honestly? | single | 2 / 3 / 4 / 5+ with helper "Two honest days beat five imaginary ones" |
| 11 | How long can a session be? | single | 20 / 30 / 45 / 60 min |
| 12 | Anything we should train around? | single + follow-up | Reuses the injury screens already built |
| 13 | **THE SIFT** | single | See 5.4 |
| 14 | When could you realistically start? | single, coached only | This week / This month / Just looking for now. Readiness signal for Ben. |
| 15 | CALCULATING | cinematic | ~3.5s, names what it is doing |
| 16 | **REVEAL** | summary | See 5.5 |
| 17 | **ROUTE** | action | See 5.6 |

13 questions. Every one of them visibly changes the plan panel on the right.

### 5.2 Flow B — "Build my race plan" (HYROX door)

Precise, respectful, credentials-forward. No hand-holding language.

| # | Screen | Type | Notes |
|---|---|---|---|
| 1 | Raced before? | single | Never but I'm in / Once / 2-5 / 6+ / Chasing qualification |
| 2 | Race booked? | date + city, or none | Feeds the dated plan |
| 3 | Division | single | Singles / Doubles / Relay / Pro |
| 4 | **EMAIL** | single field | "Save your assessment. We'll send your station-by-station breakdown too." |
| 5 | Target | single | Finish strong / sub-90 / sub-80 / sub-70 / sub-60 / Qualify |
| 6 | INTERSTITIAL | no question | Honest context on where that target sits. Percentiles become exact once the results layer lands. |
| 7 | Best time so far | conditional | Manual now, auto-lookup later |
| 8 | Running background | single | 5k/10k/HM time bands or "I don't run much" |
| 9 | Which stations cost you time? | multi | All eight plus "none". Drives programming **and** which guides we email them. |
| 10 | Kit access | multi | Sled / ski erg / rower / wall ball / sandbag / farmers handles |
| 11 | Days a week | single | |
| 12 | Session length | single | |
| 13 | Injuries | single + follow-up | Existing screens |
| 14 | **THE SIFT** | single | Athlete framing, see 5.4 |
| 15 | CALCULATING | cinematic | |
| 16 | **REVEAL** | summary | Station priorities, dated block, weekly structure |
| 17 | **ROUTE** | action | |

### 5.3 Flow C — "Club plan builder" (`/club` only)

Six questions. No call offered anywhere in it. Straight to trial. This is the
Ladder and Runna pattern and it should feel fast.

Goal → Level → Days per week → Session length → Where and kit → Injuries →
Calculating → **Full week one, session by session, actually readable** → "Start
7 days free. No card needed."

Email is captured at the trial start, not mid-flow, because the flow is short
enough that mid-flow capture costs more than it earns.

### 5.4 The sift

The one screen that decides which of the three outcomes someone gets. Placed
**late, after they have invested**, never at the start. Noom's whole model is
build commitment first, present the choice second.

**Flow A wording:**

> **How do you want to be coached?**
>
> - "I want Ben in my corner. A programme written for me, weekly check-ins, and
>   someone who notices if I go quiet." → **COACHED**
> - "I want a great plan and the tools to follow it on my own, at my own pace."
>   → **CLUB**
> - "I'm not sure. Show me both." → **RECOMMEND**

**Flow B wording:**

> **How do you want to work?**
>
> - "Coached by Ben. He writes it, he adjusts it weekly, he's on the end of a
>   message." → **COACHED**
> - "Give me the programme. I'll execute it." → **CLUB**
> - "Show me both." → **RECOMMEND**

Nobody is asked about money. We never ask a consumer their budget, it is crass
and it depresses completion. Support preference is a better proxy and it is a
question people are pleased to be asked.

**When they pick "show me both"**, we recommend rather than dither. Simple
additive score, coached if positive:

| Signal | Points |
|---|---|
| Named goal date or booked race | +2 |
| "Tried before and it didn't stick", several times | +2 |
| "Doing it alone" or "gyms intimidate me" selected as a barrier | +2 |
| Any injury declared | +2 (a human should look at this) |
| Chasing a specific time or qualification | +2 |
| 4+ days a week available | +1 |
| "Just looking for now" | -3 |
| 2 days a week | -1 |
| No goal, no date, no barriers named | -2 |

The reveal then shows both, with the recommended one as the primary button and
a one-line reason: "Based on what you've told us, we'd start you with…".
Honest, personalised, and it still lets them choose the other.

### 5.5 The reveal

The reveal is the value exchange. Show real substance before asking for one
more thing. Current `plan-summary.tsx` is close but under-delivers.

- **Flow A:** what week one actually looks like, three named sessions with
  their real durations, what week twelve looks like, and the honest milestone
  in between. Warm copy, no numbers they did not give us.
- **Flow B:** the dated block, the two stations we would attack first and why,
  weekly structure, race-week placement.
- **Flow C:** the whole of week one, session by session, readable, because
  there is no call to sell and the plan itself has to close.

### 5.6 The routes out

**COACHED:**

> "Ben reads every plan personally before the call. Pick a time and he'll take
> you through yours."
>
> [ Pick a time → ] (scheduler showing Ben's real windows)
> Secondary: "Or ask Ben to call me" → phone + morning/lunch/evening chips
> Quiet tertiary: "Just send me the plan for now" → nurture sequence

Phone is captured **here**, with the honest reason attached ("so Ben can
actually call you"). Never earlier.

**CLUB:**

> "Your plan is ready. Start free for 7 days."
>
> [ Start 7 days free → ]
> Under it: "No card needed. Cancel any time. Nobody will call you."

That last line matters. A meaningful share of club people chose the club
precisely because they do not want a phone call. Saying so out loud converts.

**Card capture** happens on day 5 inside the members' area, framed as "your
plan continues on Tuesday", not as a paywall.

## 6. Lead capture and delivery

Speed to lead is the highest-leverage variable in any call funnel. The
Oldroyd / InsideSales lead-response study (2007, 15,000+ leads) found contact
odds roughly 100x higher and qualification odds 21x higher when a web lead is
contacted within 5 minutes versus 30. It is vendor data rather than a
controlled trial, but the direction has been reproduced consistently for
nearly two decades. Our target is contact inside 5 minutes, automated.

On every coached outcome, in this order:

1. **Store.** Lead row with the full quiz snapshot attached. Status `new`.
   This is the source of truth. Everything after it is best-effort.
2. **SMS to the lead, instantly.** From Ben, not a shortcode.
   > "Hi Jamie, it's Ben from Suth Performance. Got your plan through, I'll
   > give you a ring Thursday at 6:30. Anything you want me to look at before
   > then, just reply to this."
3. **Email to the lead, instantly.** Their plan summary, what happens on the
   call, Ben's photo and record, a calendar file if they booked, plus one
   genuinely useful thing matched to their answers (beginner: first-week
   guide; athlete: their weakest station guide).
4. **SMS to Ben, instantly.** Short and actionable.
   > "New lead: Jamie, beginner, wants to lose weight, 3 days/wk, tried and
   > stopped twice, no injuries. Call booked Thu 18:30.
   > suthperformance.com/admin/leads/123"
5. **Email to Ben.** Full brief, every answer laid out readably, source page,
   readiness signal, sift score, admin deep link.
   Subject: `Lead · Jamie · beginner · call Thu 18:30`
6. **Admin.** Lead card with the whole quiz, status flow new → contacted →
   call booked → called → won / lost, notes, and a one-click close that sends
   the payment link.

Club signups create a customer record, not a lead. They enter the club
lifecycle, and surface in admin as a separate pool for the day-30 upgrade
offer.

### 6.1 Follow-up cadences

| Trigger | Sequence |
|---|---|
| Quiz abandoned, email captured | 3 emails over 5 days. First inside the hour: "Your plan is saved, 90 seconds to finish." |
| Finished, no call booked | Day 0 the plan, day 2 "Ben had a look", day 5 the call offer, day 10 last touch, then monthly |
| Call booked | Confirmation, then SMS + email at 24h and 1h. This is the no-show killer. |
| No-show | Same-day friendly rebook link, one more at day 3 |
| Post-call, not closed | Ben's one-line personal email (template he edits), day 4 proof touch, day 10 final |
| Club trial started | Day 1 how to use it, day 3 first check-in, day 5 card prompt, day 30 free-call offer |
| Club cancelled | Day 90, one honest email from Ben |

Everything from "Ben from Suth Performance". Never `noreply@`.

## 7. Making it look and feel world class

### 7.1 Desktop

The quiz stops being a phone in a box. Two panes from `md` up:

```
┌──────────────────────────┬───────────────────────────┐
│                          │  YOUR PLAN                │
│  Question, large,        │  ┌─────────────────────┐  │
│  one per screen          │  │ 12 weeks            │  │
│                          │  │ 3 sessions / week   │  │
│  [ option ]              │  │ 45 min              │  │
│  [ option ]              │  │ Full gym            │  │
│  [ option ]              │  │ Around your knee    │  │
│                          │  └─────────────────────┘  │
│  ← back                  │  Updates as you answer    │
└──────────────────────────┴───────────────────────────┘
```

The right pane is not decoration. It is the commitment mechanic: every answer
visibly buys them something. That is the single biggest lesson from the Noom
teardown, and we currently do not do it at all.

### 7.2 Mobile

- The plan panel collapses to a slim, tappable "your plan so far" strip under
  the progress bar. Tap expands it.
- Options are minimum 56px tall with the whole row tappable.
- Single-select auto-advances, multi-select never does (existing hard rule,
  keep it).
- Progress bar and back button always present (existing hard rule, keep it).
- The primary button sits above the fold on a 667px viewport on every screen.
- Answers persist across a refresh and a closed tab, which they already do.

### 7.3 Trust furniture

Under every capture point, small and quiet: "We'll never sell your details.
Unsubscribe in one click." Under the call booking: "No pitch. If coaching is
not right for you, Ben will say so." That last line is the brand, and it is the
one competitors cannot copy credibly.

No fabricated proof anywhere, per the hard rules. Until real testimonials
exist, the proof slots carry Ben's verifiable record and public HYROX results
only.

## 7.4 Test coverage

Two Playwright specs, both running on all four viewport projects
(iPhone SE 375, iPhone 13 390, iPad 768, desktop 1440):

- `tests/visual/quiz-e2e.spec.ts` — the three journeys end to end: HYROX
  coached, beginner coached, and the club entry that skips the sift. Covers
  both sift branches, back navigation, and asserts zero console errors.
- `tests/visual/onboarding-robustness.spec.ts` — what a happy path never
  touches: tap targets on the entry screen, surviving a refresh mid-quiz,
  keyboard-only operation, a back route out of every full-bleed
  interstitial, the lead endpoint failing, a successful submit and the exact
  payload Ben receives, the club page, and horizontal overflow.

The lead form is always behind a route mock in tests. Submitting for real
emails a live inbox and a suite must never do that.

**Running them:** the repo's dev server and Playwright both default to port
3000. When a second terminal is working in this repo the two servers fight
over that port and the loser dies mid-run, which looks exactly like a wall
of test failures. Use a dedicated port:

```
npx next dev -p 3100
PLAYWRIGHT_NO_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test
```

## 8. Measurement

| Step | Target | Where it comes from |
|---|---|---|
| Landing → quiz start | 25%+ | CTA quality |
| Quiz start → email captured | 60%+ | Mid-flow capture at screen 6 |
| Quiz start → complete | 40%+ | Two-pane build mechanic, no password |
| Complete → coached route | 45-55% | The sift |
| Coached → call booked or callback | 55%+ | Reveal quality, scheduler friction |
| Booked → call happens | 70%+ | Reminder cadence |
| Call → paying client | 40%+ | Ben |
| Club route → trial started | 70%+ | No card, one tap |
| Trial → paid | 25-35% | Day 1-5 activation emails |
| Speed to first contact | under 5 min | Automated |

Every quiz screen gets an event so we can see exactly where people leave. The
sift screen gets its own funnel view: what proportion pick each option, and
whether the recommendation is being accepted or overridden.

## 9. Build order

Each step is shippable on its own and none of them touch the location data
lane.

| # | Ship | Blocked by |
|---|---|---|
| 1 | CTA rewrite across all surfaces (section 4.3) | nothing |
| 2 | Quiz engine refactor: flow config, two-pane desktop shell, live plan panel | nothing |
| 3a | Mid-flow email capture (done 30 Jul) | nothing |
| 3b | Password removed, magic link | see note below |
| 4 | The sift screen, scoring, and the three routes | nothing |
| 5 | Flow A (beginner and PT door) via `?rail=beginner` (done 30 Jul) | nothing |
| 6 | Flow B (HYROX door), currently the default rail | nothing |
| 7 | Lead row + admin lead pipeline UI | Supabase restore |
| 8 | Instant SMS to lead and to Ben | Twilio account, Ben's mobile, UK number |
| 9a | Email to the inbox with the full quiz brief (done 30 Jul) | nothing |
| 9b | Confirmation email to the lead (built, will not deliver until the domain is verified) | Resend domain |
| 10 | Scheduler (Cal.com) with Ben's real windows | Ben's call windows |
| 11a | `/club` landing page (done 30 Jul, £12.99/mo signed off) | nothing |
| 11b | Flow C, the short club-only quiz | nothing |
| 12 | Club checkout, day-5 card prompt, day-30 upgrade offer | club price sign-off, Stripe products |
| 13a | Branded email system + SMS copy (done 30 Jul) | nothing |
| 13b | Firing the cadences on schedule | Resend domain, and a trigger for each |

**Note on step 3b, removing the password.** This is not a UI change. Today
`/api/account/create` requires an `authUserId` from a browser
`supabase.auth.signUp(email, password)`, and it verifies that the caller's
session matches that id before writing any row. Passwordless signup
(`signInWithOtp`) returns no session until the user clicks the emailed link,
so that check cannot pass. Removing the password properly means:

1. Create the auth user server-side with the admin client, keyed on email.
2. Replace the session check with a different guard (signed quiz-state token
   or a short-lived nonce issued when the mid-flow email was captured), since
   the endpoint would no longer be able to rely on an authenticated caller.
3. Add magic-link sign-in to `components/account/login-form.tsx`, which is
   password-only today. Otherwise passwordless accounts can only get in via
   "forgot password", which is a confusing experience for someone who never
   set one.

That is a security-sensitive change to a live endpoint and it cannot be
tested end to end until Supabase is restored, so it is deliberately not
bundled with the UI work. The interim state is good: email is captured
mid-flow and carried to the final screen, so nobody types their address
twice, and the abandonment sequence has what it needs.

Steps 1, 2, 3a, 4 are done. Step 1 (the CTA rewrite) is held only by the
concurrent copy sweep on the same files.

## 9.1 Messaging system

Built 30 July. Preview everything at **`/admin/messaging`**, or a single
email without the admin gate in dev at
`/api/dev/messaging-check?id=<id>` (that route 404s in production).

- `lib/email/templates/_layout.tsx` — shared chrome: logo, footer links,
  Ben's signature, UTM tagging, and the email-client constraints it is
  built around.
- `lib/email/templates/funnel-lead.tsx` — 6 templates, lead to client.
- `lib/email/templates/funnel-nurture.tsx` — 7 templates, abandonment and
  post-plan follow-up.
- `lib/email/templates/funnel-club.tsx` — 6 templates, trial to win-back.
- `lib/email/templates/internal-lead.tsx` — what Ben reads before ringing.
- `lib/sms/messages.ts` — 11 messages with GSM-7 and segment checking.
- `lib/email/catalogue.tsx` — the registry that drives previews and tests.
- Senders in `lib/email/send.ts`, including scheduled sequences.

`/api/consultation` already uses the branded lead confirmation and internal
brief. Everything else is written and wired but needs a trigger.

**Blocking the logo:** `public/email/*.png` is new and undeployed, so
`https://www.suthperformance.com/email/logo-wordmark.png` currently 404s and
the logo shows as a broken image in real inboxes. It renders correctly
locally. Deploying the repo fixes it with no code change.

**Also fixed:** the apex domain 308-redirects to `www`, and email clients
handle redirects badly (some will not follow one for an `<img>` at all).
Email URLs now default to the `www` canonical. Set `NEXT_PUBLIC_SITE_URL`
to `https://www.suthperformance.com` in Vercel so the rest of the site
agrees.

**Not yet sold in any email:** Ben's video courses, the monthly members'
Q&A and the form-check reel, because they do not exist yet.

## 10. Open decisions for Kieron

1. **Club price.** Recommendation £12.99/mo, £99/yr. Current config £8.99.
2. **Coached band.** £119-149/mo proposed, agreed on the call, never published.
   Confirm the floor and ceiling so Ben has a script.
3. **Ben's call windows.** Needed before the scheduler goes in. Two 90-minute
   blocks a week is roughly 10-12 calls.
4. **Ben's mobile and an SMS provider.** Twilio or a WhatsApp Business webhook.
   Nothing in section 6 works without it.
5. **Does the club get a free-call offer at day 30, or never?** Recommendation:
   yes, once, and only once.
6. **Guarantee.** "Follow it for 12 weeks, and if nothing improves the next
   block is free" is the strongest single converter available to us. It needs
   Ben's comfort and clean terms.

---

### Sources

- [RevenueCat: inside Noom's web-to-app onboarding funnel](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel/)
- [Web2App World: Noom funnel breakdown](https://web2appworld.com/breakdowns/noom/)
- [Ladder](https://joinladder.com/) and [Runna](https://www.runna.com/) live CTA and trial copy
- [RNT Fitness](https://www.rntfitness.co.uk/) scorecard and application funnel
- [Two-Brain Business on free trials](https://twobrainbusiness.com/free-trials-2024/)
- [ChalkIt: free trial vs intro offer conversion](https://www.chalkitpro.com/post/free-trial-vs-intro-offer-gym)
- [Expertise.ai: speed-to-lead statistics, verified with folklore debunked](https://www.expertise.ai/stats/speed-to-lead-statistics)
- [MIT / Oldroyd lead response management study](https://25649.fs1.hubspotusercontent-na2.net/hub/25649/file-13535879-pdf/docs/mit_study.pdf)
- [Sender: call-to-action statistics](https://www.sender.net/blog/call-to-action-statistics/)
- [Stormy: quiz funnel conversion benchmarks](https://stormy.ai/blog/perspective-quiz-funnel-playbook-2026)
- [Sport England Active Lives, via Fitness Station](https://www.fitnessstation.co.uk/achieving-real-results-in-peterborough-3-fitness-accountability-trends-for-2026)
