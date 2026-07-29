# Suth Performance — Capture Funnel Spec

Prepared 29 July 2026. The complete capture system: entry doors, the
onboarding quiz page by page (both tone paths), detail capture, and
lead delivery to Ben by text and email. This is the build spec for
quiz v4 + the lead pipeline.

Design laws (from Kieron + the pack's hard rules):
- No pricing anywhere; every path ends at the free consultation.
- Beginners get softness, care, and motivation — HYROX is never a
  prerequisite at their door. Athletes get respected, precise questions.
- Progress bar always; back navigation always; single-select
  auto-advances, multi-select never does.
- Email captured mid-flow (never only at the end); phone captured at
  the consultation step with a reason ("for the call itself").
- Every lead reaches Ben within seconds by SMS + email. Speed-to-lead
  is the highest-leverage conversion variable in call funnels.

---

## 1. Entry doors (where capture starts)

| Door | Surface | First CTA |
|---|---|---|
| Beginner door | /couch-to-hyrox, /get-fit content, PT location pages, "lose weight/get fit" ads later | "Start your free fitness assessment" |
| HYROX door | /hyrox-coach, race hubs, station guides, HYROX location pages, tools | "Start the 3-minute quiz" / "Build my free plan" |
| Direct-to-call | /free-consultation (live), /coaching, nav + footers | "Book your free consultation" |
| Plan-maker | /tools + content CTAs | "Get my free plan (PDF)" |

All four converge on the same backend: assessment record → account →
consultation lead → Ben notified.

## 2. Quiz v4 — screen by screen

### Shared opening (screens 1-3)

1. **"What brings you here?"** — Get fit or lose weight (fresh start or
   long break) / Training for a HYROX race / I train already, I want to
   get faster / **Not sure yet — help me work it out** (escape hatch →
   beginner path). Sets `path`.
2. Age band (single select, auto-advance).
3. Gender (with prefer-not-to-say).

### PATH A — Beginner (soft, caring, motivational)

Tone rules: no jargon, no body-shame, no HYROX until screen 17, copy
written to reduce fear on every screen. Reassurance interstitials are
load-bearing, not filler.

4. **Main goal** — Lose weight / Feel stronger / More energy / Feel
   confident again / Healthy for my family.
5. **Where you're at** — Haven't exercised in years / A bit active /
   Active but no structure / I was fit once and want it back.
6. **Tried before and it didn't stick?** — Several times / Once or
   twice / This is my first real go.
7. **INTERSTITIAL (critical)** — "That's the most common answer we get.
   It's almost never a willpower problem. It's a programming problem —
   and that's fixable." Photo of Ben coaching. No question, one
   Continue.
8. **EMAIL CAPTURE** — "Let's save your progress. Where should we send
   your assessment?" (+ consent line, GDPR-clean). Unlocks the
   abandonment sequence for the ~60% who stop here or later.
9. What's got in the way (multi) — Time / Didn't know what to do /
   Boredom / Gyms intimidate me / Injury / Doing it alone.
10. Where will you train — Gym / Home, minimal kit / Home, some kit /
    Outdoors / Mix.
11. Equipment (conditional on 10, multi).
12. Days per week realistically — 2 / 3 / 4 / 5+ ("2 honest days beats
    5 imaginary ones").
13. Session length — 20 / 30 / 45 / 60 min.
14. Injuries or conditions (reuses the injury + follow-up screens
    already built).
15. Sleep quality (behavioural; feeds recovery framing).
16. Nutrition, honestly — 4 options, zero judgement in the copy.
17. Weight + height, **stones/kg/lbs toggle**, with skip: "I'd rather
    not say, just build the plan."
18. Target — number optional: "I don't have a number. I just want to
    feel better." (Only here does HYROX get one soft mention: "Some of
    our members end up racing HYROX. Zero pressure — good to know it's
    there.")
19. **MEET BEN** — beginner framing: "Ben races at the elite level. He
    also coaches people who've never set foot in a gym — and he built
    this path for them." Photo, one-line record, no times.
20. **REVEAL + CAPTURE** (see section 3).

### PATH B — HYROX athlete (precise, respectful)

4. Raced before? — Never (but I'm in) / Once / 2-5 / 6+ / Chasing
   qualification.
5. PB and where (if raced) — manual entry now; auto-lookup when the
   results layer lands (the "magic moment" upgrade).
6. Race booked? — Yes (date + city picker, feeds dated plan) / Looking /
   Not yet.
7. Division — Singles / Doubles / Relay / Pro.
8. **EMAIL CAPTURE** — "Save your assessment. We'll also send your
   station-by-station breakdown."
9. Target — Finish strong / Sub-90 / Sub-80 / Sub-70 / Sub-60 /
   Qualify. INTERSTITIAL after: where that target sits ("Sub-90 puts
   you ahead of most first-timers; here's what it demands weekly.") —
   percentile phrasing gets exact once results data exists.
10. Running background — 5k/10k/HM times or "I don't run much".
11. Strength background — key lifts or self-rated.
12. **Which stations worry you** (multi, all eight + "none") — drives
    programming AND which guides we email them.
13. Sled access — full sled / sled sometimes / no sled access.
14. Equipment access (multi) — ski erg / rower / sled / wall ball /
    sandbag / farmers handles.
15. Days per week + 16. Session length.
17. Weekly running volume.
18. Injuries (existing screens).
19. **MEET BEN** — credentials-forward: verified record from the
    dossier (Worlds Elite 15 6th, 48:35 doubles best, Pro Doubles wins).
20. **REVEAL + CAPTURE** (see section 3).

## 3. The reveal + capture screen (both paths)

The reveal IS the value exchange — show real substance before asking
for anything else:

- Path A: "Your 12-week path" — what week 1 looks like (3 sessions,
  named), what week 12 looks like, projected milestones. Warm copy.
- Path B: programme summary dated to their race, station priorities
  from their worry list, weekly structure.

Then ONE primary action, framed as the natural next step:

> **"Ben reviews every assessment personally. Book your free call to
> go through yours."**
> [ Pick a time → ]  (scheduler embed — Cal.com — showing Ben's real
> call windows)
> Secondary: "Or request a callback" → phone field + preferred time
> chips (morning/lunch/evening).
> Tertiary (quiet): "Just send me the plan for now" → account creation
> only, enters nurture sequence.

Phone capture happens HERE, with the honest reason ("for the call").
Account creation is folded into whichever action they take (email
already captured at screen 8; password optional — magic-link default).

## 4. Lead delivery to Ben (text + email, instant)

On every consultation request (scheduler booking OR callback form OR
/free-consultation page):

1. **Store**: consultation_requests row (migration 0004) with full quiz
   snapshot attached; status `new`.
2. **SMS to Ben** (Twilio; needs account + a UK number + BEN_MOBILE
   env): short and actionable —
   `New lead: Jamie, beginner path, goal: lose weight, 3 days/wk.
   Call booked Thu 18:30. Details: suthperformance.com/admin/leads/123`
   (Callback-request variant includes their phone + preferred window.)
3. **Email to Ben** (Resend): full brief — every quiz answer laid out
   readably, goal, injuries, equipment, race date, source page, and the
   admin deep link. Subject: `Lead · Jamie · beginner · call Thu 18:30`.
4. **Email to the lead**: confirmation with what happens next, Ben's
   photo, calendar file (if booked), and one useful piece of content
   matched to their path (beginner: first-week guide; athlete: their
   weakest-station guide).
5. **Admin pipeline** (extend existing admin): lead card with quiz
   answers, status flow new → contacted → call booked → called →
   won/lost, notes, and the one-click package close (payment links).

Failure handling: SMS and email are independent best-efforts; the row
insert is the source of truth; admin shows anything undelivered. (Until
Supabase is restored, email is the source of truth — current state.)

## 5. Follow-up cadences (automated)

- **Abandoned quiz** (email captured, no finish): 3 emails over 5 days;
  first within an hour ("Your assessment is saved — 90 seconds to your
  plan").
- **Finished, no call booked**: day 0 the plan, day 2 "Ben had a look"
  nudge, day 5 consultation offer, day 10 last touch → monthly
  newsletter.
- **Call booked**: confirmation + reminder SMS/email 24h and 1h before
  (no-show killer).
- **No-show**: same-day friendly rebook link, one more at day 3.
- **Post-call, not closed**: Ben's one-line personal email (template
  he edits), day 4 case-study touch, day 10 final.
All sequences from "Ben from Suth Performance"; never noreply@.

## 6. Measurement targets

| Step | Target |
|---|---|
| Quiz start → email captured | 60%+ |
| Quiz start → complete | 35%+ |
| Complete → call booked / callback requested | 25%+ |
| Booked → call happens | 70%+ |
| Call → paid client (any tier) | 40%+ |
| Speed to first contact | < 5 min (SMS instant, Ben's reply target same day) |

## 7. Build order

1. Lead-to-Ben notifications (SMS via Twilio + rich email) on the LIVE
   /free-consultation form — smallest change, immediate value.
2. Scheduler integration (Cal.com) + callback-request variant.
3. Reveal-screen rework on the current quiz (call CTA instead of
   account-only), phone capture.
4. Mid-quiz email capture screen.
5. Full dual-path quiz v4.
6. Cadences (needs Resend domain verified).
7. Admin lead pipeline UI + payment-link close (needs Supabase).

Decisions needed: Ben's mobile number + Twilio account (or an
alternative like a WhatsApp Business webhook), Ben's real weekly call
windows, and sign-off on the reveal-screen copy.
