# Vyrek — Competitive Analysis

**Date:** 2026-05-22
**Scope:** Three direct competitors for a UK Hyrox training app — Runna, Marchon, Hybrid Athlete Club.
**Use:** Reference document for positioning, pricing, and onboarding decisions.

All prices in GBP unless noted. Pricing verified May 2026; subject to change. Where a fact could not be verified from primary sources, it is marked *unverified*.

---

## 1. Runna

**URL:** runna.com (acquired by Strava in 2025)

### One-line positioning
"Personalised running plans coached by experts" — primarily marathon, half-marathon, 10K, 5K. Running-first, not Hyrox.

### Pricing
- Monthly: **£15.99/month** (GBP, UK-billed)
- Annual: **£99.99/year** (~£8.33/month equivalent)
- Combined Strava + Runna annual: **£119.99/year**
- Trial: **7-day free trial** (some referral codes extend to 14 days)
- Single tier — no Core/Pro split

Source: [Runna pricing page](https://www.runna.com/pricing), [Running Westward Ho review 2026](https://www.runningwestwardho.co.uk/post/runna-free-trial)

### Onboarding length
**~25 screens** in the mobile onboarding flow — covers fitness level, running history, race goal, weekly availability, route hilliness, device sync. Considered thorough but a friction point for some users.

Source: [Uiland UX teardown](https://uiland.design/screens/runna/screens/b7d405f1-038c-4c19-9787-b1cc3f41e2d2/flows/onboarding), [Reteno Runna flow gallery](https://gallery.reteno.com/flows/app-screens-runna)

### Plan visibility before payment
**Gated.** Users complete the full quiz, then hit a paywall before seeing the dated plan. Marketing copy promises "view your entire plan" but only after subscription/trial begins.

### Programmes / specialisations
5K, 10K, half-marathon, marathon, ultra, complimentary Couch-to-5K. **No Hyrox programme.** No cross-training or strength block as a first-class product.

### Mobile / native posture
Native iOS + Android. Apple Watch, Garmin, Fitbit, Coros integrations. Deep Strava sync since the 2025 acquisition.

### Coach / authority signal
"Elite coaches with Olympic-level experience" — generic. No prominent named coach on the marketing site; the founders (Dom Maskell, Ben Parker) have running pedigree but aren't centrepieces of the brand.

### UK-specific content
Founded in London, UK-headquartered. Race goals heavily skew to UK majors (London, Manchester, Brighton). No Hyrox.

### Strengths
- Best-in-class device + Strava integration (post-acquisition)
- High personalisation, adaptive plans
- Strong UK brand awareness, big paid acquisition spend

### Weaknesses / gaps Vyrek can exploit
- **No Hyrox programme at all** — Vyrek owns this lane
- Onboarding is long (25 screens) and ends in a hard paywall
- Plan is invisible until payment — opposite of plan-before-pay
- Single discipline (running) — ignores strength and station work

---

## 2. Marchon

**URL:** online.marchon.co.uk (UK-based; also marchon-global.com)

### One-line positioning
"Become your fittest, fastest, strongest" — broad hybrid fitness platform with Hyrox as one of ~9 programme tracks.

### Pricing
- **Core monthly:** £29.99/month (2 programme changes/month, 3-month minimum after trial)
- **Pro monthly:** £39.99/month (unlimited changes, nutrition, "real coach support")
- **Pro annual:** £229/year (~£19.08/month effective)
- Trial: **7 days free** on Core; trial terms on Pro unclear from marketing pages
- One-off paid plans: 12-week marathon plan $249, ATHX 12-week $149 (USD listings on App Store)

Source: [Marchon pricing page](https://online.marchon.co.uk/pricing/plan), [Marchon on App Store](https://apps.apple.com/us/app/marchon-training/id6443470301)

### Onboarding length
Quiz-gated funnel at `/onboarding/quiz` — exact screen count not public, but users must complete the quiz and create an account before pricing is revealed. *Unverified screen count.*

### Plan visibility before payment
**Gated.** No dated plan shown pre-payment. The 7-day trial is the only preview mechanism, and it requires card capture.

### Programmes / specialisations
Nine programmes: Gain, Shape, Hybrid, Perform, Compete, Compete+, Train, **Hyrox**, **Hyrox Pro**. Hyrox is 5 days/week strength + race-specific conditioning; Hyrox Pro is 7 sessions/week for the Pro category. **No dedicated doubles programme.** No clear beginner Hyrox track (Compete+/Hyrox Pro target advanced; no "first race" equivalent).

Source: [Marchon programmes](https://online.marchon.co.uk/programs)

### Mobile / native posture
Native iOS app (iOS 17+, Apple Watch, iPad, Vision Pro). 4.8★ / ~240 ratings on US App Store — small footprint. Website is the funnel, app is the delivery.

### Coach / authority signal
Founded by **Ollie (Ollie Marchon)**, co-founder of the PFCA. Brand-led, not coach-faced — site uses "world-class coaches" without naming individuals or listing Hyrox credentials.

Source: [PFCA about page](https://www.thepfca.com/about)

### UK-specific content
UK-headquartered, GBP billing, UK Hyrox race calendar awareness. Strong UK brand among CrossFit-adjacent crowd.

### Strengths
- Established UK Hyrox programme with Pro tier
- Polished native app, strong retention loop
- Founder credibility in functional fitness space

### Weaknesses / gaps Vyrek can exploit
- **Hyrox is 2 of 9 programmes** — they're not Hyrox-first
- **Pricing complexity:** Core vs Pro vs annual vs one-off plans + 3-month Core lock-in
- No plan-before-pay; quiz funnels to paywall
- **No doubles programme**, no beginner "first race" track
- Coach faces are anonymous — no Elite-15 athlete persona to rally around

---

## 3. Hybrid Athlete Club

**URL:** hybridathleteclub.com (UK-based)

### One-line positioning
"Everyday Athletes, Proven Progress" — Hyrox-specialist coaching with race-specific and daily programmes.

### Pricing
- Monthly Hyrox membership: **£44.99/month** (£11.24/week framing)
- Annual: not listed
- Trial: **7-day free trial**, no minimum term, cancel anytime
- Short product: 4-Week Station Improvement Plan, **£19.99** one-off
- Klarna / Clearpay available

Source: [Hyrox membership page](https://hybridathleteclub.com/product/individual-hyrox-program/)

### Onboarding length
Onboarding handled through a Fitr.training redirect (`hybridathleteclub.fitr.training`) — uses the third-party Fitr coaching platform for delivery. Screen count not measurable from the marketing site. *Unverified.*

### Plan visibility before payment
**Partially gated.** Membership detail (what's included, programme structure) is visible on the product page, but the actual dated plan only appears once the trial starts on Fitr.

### Programmes / specialisations
- Race Ready (event-specific, up to 20 weeks pre-race; London, Manchester, etc. each have dedicated pages)
- RoxDaily (year-round, no race booked)
- **Hyrox Doubles** — dedicated partner programme
- 4-Week Station Improvement (short, one-off)
- Webinars and race-week strategy add-ons

Source: [Doubles programme](https://hybridathleteclub.com/product/hyrox-doubles-program/)

### Mobile / native posture
**Delivered via Fitr.training** — third-party coaching app (iOS + Android). No own-brand native app. WordPress + WooCommerce marketing site.

### Coach / authority signal
Led by **James Kelly** (`@jamesdeag`) — Elite-15 Hyrox athlete and coach. Founder is the brand. Strong personal Instagram presence.

Source: [Hybrid Athlete Club Instagram](https://www.instagram.com/hybrid.athlete.club/), [James Kelly Instagram](https://www.instagram.com/jamesdeag/)

### UK-specific content
UK-native, GBP, race-specific programmes for UK Hyrox events (London, Manchester). Strong UK Hyrox community ties.

### Strengths
- True Hyrox specialist with named Elite-15 founder
- Has a doubles programme (rare)
- Race-specific programming for UK events

### Weaknesses / gaps Vyrek can exploit
- **No own app** — delivered through generic Fitr.training, breaks brand and limits UX control
- **£44.99/month is the highest of the three** with no annual option to soften it
- WordPress marketing site, no plan-before-pay, no editorial polish
- Programme catalogue is fragmented across one-off products + memberships
- No clear "First Race" 12-week beginner track positioned for the largest segment of new Hyrox entrants

---

## 4. Vyrek's wedge

Where Vyrek wins versus all three:

- **Plan-before-pay.** Runna, Marchon, and Hybrid Athlete Club all gate the dated plan behind payment or trial start. Vyrek shows a real dated Week 1 free; only Weeks 2–12 require trial. This inverts the funnel — the user sees value before card capture.

- **Hyrox-first, UK-native.** Runna has zero Hyrox. Marchon treats Hyrox as 2 of 9 tracks. Hybrid Athlete Club is Hyrox-only but lacks a native app and beginner ladder. Vyrek is purpose-built for UK Hyrox with four programmes covering the full athlete ladder: First Race (beginner 12-week), Sub-90 (intermediate), Doubles (partner), Pro (sub-75).

- **Trainer's Notebook voice.** Marchon ("become your fittest, fastest, strongest") and Runna lean on generic fitness-marketing hype. Vyrek's editorial, direct, no-hype voice reads as premium and signals coach-grade content rather than ad copy.

- **Single price, no decision tax.** £14.99/month flat. Marchon forces a Core vs Pro vs annual decision plus a 3-month Core lock-in. Hybrid Athlete Club is £44.99/mo. Runna is £15.99/mo for a non-Hyrox product. Vyrek is the cheapest Hyrox option and the simplest pricing on the board.

- **Named Elite-15 founding coach + brand-led architecture.** Like Hybrid Athlete Club, Vyrek leads with an Elite-15 athlete (credibility parity). Unlike Hybrid Athlete Club, the brand outlives any single coach, so the moat compounds.

- **Real £20 BACS referral bounty.** None of the three competitors offer cash referral. Runna uses extended-trial codes; Marchon and Hybrid Athlete Club have no public referral mechanic. A real £20 bounty is a sharper acquisition lever in the UK Hyrox community than a discount code.

- **Mobile-first web with native feel.** Marchon requires App Store download. Hybrid Athlete Club routes to third-party Fitr. Vyrek's PWA-grade web flow removes install friction for the 90% of traffic that's mobile, while keeping the Phase 2 native app option open.

---

## Sources

- Runna pricing: https://www.runna.com/pricing
- Runna onboarding (25 screens): https://uiland.design/screens/runna/screens/b7d405f1-038c-4c19-9787-b1cc3f41e2d2/flows/onboarding
- Marchon pricing: https://online.marchon.co.uk/pricing/plan
- Marchon programmes: https://online.marchon.co.uk/programs
- Marchon App Store listing: https://apps.apple.com/us/app/marchon-training/id6443470301
- Hybrid Athlete Club Hyrox membership: https://hybridathleteclub.com/product/individual-hyrox-program/
- Hybrid Athlete Club doubles: https://hybridathleteclub.com/product/hyrox-doubles-program/
- James Kelly (HAC founder): https://www.instagram.com/jamesdeag/
- PFCA / Ollie Marchon: https://www.thepfca.com/about
