# Vyrek — Phase B2 brief: Polish + Runna-style Onboarding + Missing Pages + Media

**Paste this entire document into Claude Code. Execute in the order below — Parts 1-5 sequentially, deploy and pause for review after each Part.**

Phase B1 (initial landing + quiz) is shipped. Lighthouse scores hit 95+. Now we need attention to detail, real media, a proper Runna-modelled quiz rebuild, and the missing pages.

This brief is the single source of truth. Where it conflicts with anything earlier, this wins.

---

## PART 1 — Copy + navigation fixes (start here, ~30 min)

### 1.1 Update primary CTA copy across the entire codebase

Replace EVERY instance of `Get your plan` with **`Find your plan`**.

Replace EVERY instance of `Start free trial` with **`Start training`**.

Search the whole codebase. Locations include but aren't limited to:
- Hero CTA
- Sticky bottom CTA (mobile)
- All section CTAs (plan teaser, programmes, final CTA block)
- Nav CTA (top right)
- Plan reveal paywall card
- Pricing page CTA
- Email templates (welcome, day 1, day 3, day 5, day 6)
- Welcome page CTA

### 1.2 Fix broken back navigation

Bug: from `/quiz?program=first-race` (or any programme-specific entry), the browser back button doesn't return to the home page.

Root causes to check:
- Programme cards using `router.replace()` instead of `router.push()` → fix
- Quiz layout intercepting browser history → fix
- Missing explicit "back to home" button in quiz top nav

Fix:
- Programme cards use `router.push()` so back navigation behaves naturally
- Add an explicit "✕" close icon in the quiz top-right that routes to `/` with a confirmation if user has answered any questions ("Leave quiz? Your progress is saved.")
- Keep the existing "←" arrow in top-left for "previous question"
- Verify the full flow: home → click "First Race" card → quiz loads → browser back button OR ✕ icon returns to home cleanly

### 1.3 Rename founding coach

Replace EVERY instance of `Ben Carter` with **`James Wright`** across the codebase.

Locations:
- Coach hub section
- Bento grid card mentioning the founding coach
- Welcome page
- Email templates
- Any `// DEMO` placeholder comments

### 1.4 Footer logo

The footer monogram is broken or missing. Replace with the actual `logo-monogram.svg` from `/public`, sized 32px wide, using `currentColor` so it picks up the footer text colour. If `logo-monogram.svg` doesn't exist, create it: V in rounded square, Geist 900, 24px border-radius, 4px stroke, viewBox 0 0 240 240.

### 1.5 Deploy + report

Deploy via `vercel --yes --prod`. Tell me when ready. Include in your report:
- All filepaths changed
- Confirmation that back nav now works from quiz to home

---

## PART 2 — Media integration (1 hour)

I've supplied real, licensed media in Google Drive. You need to download each file and integrate it into the site.

### 2.1 Download all 13 files from Google Drive

The folder is at: https://drive.google.com/drive/folders/1N_JH9V4gv1ptOq5siP3FTTLPj7ZKqpQM

Files to download (Adobe Stock photos + Mixkit videos, all licensed for commercial use):

**Videos (Mixkit):**
- `mixkit-52089-video-52089-full-hd.mp4` (40MB)
- `mixkit-52099-video-52099-full-hd.mp4` (71MB)
- `mixkit-52102-video-52102-full-hd.mp4` (47MB)
- `mixkit-52104-video-52104-full-hd.mp4` (52MB)

**Photos (Adobe Stock):**
- `AdobeStock_192502307.jpeg` — Weightlifter clapping hands, preparing for workout
- `AdobeStock_214596042.jpeg` — Male weightlifter training with dumbbells, crossfit
- `AdobeStock_297609945.jpeg` — Fitness portrait
- `AdobeStock_1887096738.jpeg` — Athlete catching breath, breath visible in cold air, dark moody portrait
- `AdobeStock_1887097071.jpeg` — Athlete pushing against artificial wind, motion blur
- `AdobeStock_1960150105.jpeg` — Athletic man doing exercise in modern gym
- `AdobeStock_1961018126.jpeg` — Fitness portrait
- `AdobeStock_1969748374.jpeg` — Fitness portrait
- `AdobeStock_1973205361.jpeg` — Fitness portrait
- `AdobeStock_2007854881.jpeg` — Man running fast on indoor stadium track during fitness competition

### 2.2 Download instructions for me (the user) to follow

Tell me the exact commands to download these from Drive to my Mac, then move them to `/public/media/`. Suggest the cleanest approach (e.g. download via browser, then `mv ~/Downloads/* ~/code/vyrek/public/media/`).

### 2.3 File organisation

Create `/public/media/` folder structure:

```
/public/media/
  /video/
    hero.mp4          (pick the most cinematic of the 4 mixkit videos)
    secondary-1.mp4   (the other 3, kept for future use)
    secondary-2.mp4
    secondary-3.mp4
  /images/
    hero-poster.jpg            (frame from hero.mp4 for slow-connection fallback)
    coach-james-wright.jpg     (AdobeStock_1887096738.jpeg — the breath-in-cold-air shot, premium portrait)
    programme-first-race.jpg   (AdobeStock_2007854881.jpeg — runner on track)
    programme-sub-90.jpg       (AdobeStock_1887097071.jpeg — athlete pushing against wind)
    programme-doubles.jpg      (AdobeStock_192502307.jpeg — weightlifter preparing, can swap if better doubles shot)
    programme-pro.jpg          (AdobeStock_214596042.jpeg — crossfit dumbbells)
    bento-plan.jpg             (AdobeStock_1960150105.jpeg — modern gym)
    bento-coaches.jpg          (use coach-james-wright.jpg cropped)
    bento-progress.jpg         (AdobeStock_1969748374.jpeg)
    testimonial-1.jpg          (AdobeStock_1961018126.jpeg)
    testimonial-2.jpg          (AdobeStock_1973205361.jpeg)
    quiz-interstitial-1.jpg    (AdobeStock_297609945.jpeg)
```

Use Next.js Image component everywhere. Lazy load below fold, priority on hero only. Quality 75 default, 60 on `saveData`.

### 2.4 Hero video implementation

Wire `hero.mp4` into `components/marketing/hero.tsx`:

- Replace `HERO_VIDEO_URL` placeholder with `/media/video/hero.mp4`
- Video attributes: `autoplay muted loop playsinline preload="metadata"`
- Poster image: `/media/images/hero-poster.jpg`
- Network-aware: skip video, show poster only if `effectiveType === 'slow-2g' || '2g'` or `saveData === true`
- Slight desaturation on scroll past 50% of viewport (already spec'd via GSAP ScrollTrigger)
- Play at 0.7x speed for cinematic feel: `videoRef.current.playbackRate = 0.7`
- Subtle dark overlay (gradient from transparent to bg-base/40) to ensure headline contrast

### 2.5 Generate hero poster image

Extract a frame from `hero.mp4` to use as poster. Use ffmpeg if available, or fallback to a still from one of the supplied JPEGs. Save as `hero-poster.jpg`, optimised, ~200KB.

```bash
# Suggested ffmpeg command (run from project root)
ffmpeg -i public/media/video/hero.mp4 -ss 00:00:02 -vframes 1 -q:v 2 public/media/images/hero-poster.jpg
```

If ffmpeg isn't installed, use `AdobeStock_1887096738.jpeg` as the poster fallback and note this for me.

### 2.6 Replace all placeholder images on the site

Wire the JPEGs into:
- Hero poster (above)
- Coach hub: `coach-james-wright.jpg` as James Wright's portrait
- Bento grid 3 cards: use specified files
- 4 programme cards: use specified files
- Quiz interstitial screens (Part 3 builds these): use specified files
- 2 testimonial cards: use specified portrait files

### 2.7 Deploy + report

Deploy. Report with:
- Confirmation all 13 files are in `/public/media/`
- Hero video plays on desktop and mobile
- All placeholder images are replaced
- Lighthouse Performance hasn't dropped below 95 (compress images further if needed; consider AVIF format)

---

## PART 3 — Quiz onboarding rebuild — Runna-modelled (~3 hours)

The current quiz feels clunky. The intro screen ("90 seconds from your plan") doesn't sell the value. Each question requires a Next click. No rhythm.

Rebuild the quiz using the exact architecture Runna uses for their onboarding (verified via Runna's own onboarding journey and a published UX teardown). Theme it for Hyrox.

### 3.1 Architecture principles from Runna's actual onboarding

Three verified principles from Runna (don't compromise on these):

1. **Confidence over speed.** Runna has 25-30 screens taking ~12 minutes. They don't try to compress it. Length isn't the problem — friction is. Users tolerate length when each screen feels purposeful.

2. **Show, don't tell.** Real imagery throughout. Photos of athletes. Plan format mockups. Coach video clips. Don't rely on text alone. We have 9 high-quality JPEGs — use them.

3. **Auto-advance on single-select.** When the user taps an option on a single-select question, advance to the next question automatically after a brief 200ms delay (long enough for tap feedback to register, short enough to feel fluid). Eliminates the Next button. Only multi-select, slider, calendar, and email need a Continue button.

### 3.2 New quiz architecture — 15 screens, 12 macro steps

Replace the current quiz schema entirely. New flow:

**Screen 1 — Welcome carousel (3 slides, auto-advance every 4 seconds, swipeable)**

NOT "You're 90 seconds from your plan." Instead, an Instagram-story-style carousel showing what the product actually is. Each slide has a full-bleed image and minimal text overlay:

- **Slide 1** — Image: `programme-first-race.jpg` (runner on track). Headline: "Hyrox training, personalised."
- **Slide 2** — Image: mockup of weekly plan grid (Mon-Sun with example workouts). Headline: "Every workout, dated and ready."
- **Slide 3** — Image: `bento-progress.jpg`. Headline: "Built to get you to the line."

Auto-advances every 4 seconds with a thin progress bar at top (like Instagram stories). Swipeable. Tap to skip to next slide.

Bottom CTA: **"Get started →"** (skips remainder of carousel and jumps to Screen 2)

Visible at all times: small "Skip" button bottom-right.

**Screen 2 — Primary intent (single-select, auto-advance)**

Question: **"What brings you to Vyrek?"**

Sub: "We'll build your plan around this."

Options (large tappable cards, each with an icon or small image):
- **Training for my first Hyrox** → routes to `first-race-path`
- **I've done a Hyrox, want to go faster** → routes to `sub-90-path` (refined by next question)
- **Training with a partner for Doubles** → routes to `doubles-path`
- **Just getting into Hyrox-style training** → routes to `first-race-path`

**Screen 3 — Reassurance interstitial #1 (no Continue button, auto-advance after 4s OR tap anywhere)**

Full-bleed image: `quiz-interstitial-1.jpg` (AdobeStock_297609945). Overlay with dark gradient bottom 50% for text legibility.

Overlay text:

> "92% of first-time Vyrek members finish their Hyrox stronger than they expected."

Small mono caption below: `Vyrek member data, 2026`

Tap anywhere to continue. Auto-advance after 4 seconds.

**Screen 4 — Personal best time (conditional, single-select, auto-advance)**

Show only if Screen 2 = "I've done a Hyrox, want to go faster".

Question: **"What's your best Hyrox time?"**

Sub: "We'll calibrate your plan to match."

Options:
- Under 75 min → `pro-path`
- 75 to 90 min → `sub-90-path`
- 90 to 105 min → `sub-90-path`
- Over 105 min → `sub-90-path`
- I don't remember → `sub-90-path`

**Screen 5 — Race date (calendar OR skip)**

Question: **"Got a race booked?"**

Sub: "We'll build your plan around the date. Or skip — we'll suggest one."

UI: Inline date picker on desktop, bottom sheet calendar on mobile (use shadcn Calendar inside Sheet).

Secondary action: **"No race booked →"** (skips to Screen 6)

If a date IS picked, calculate `weeksUntilRace` and show in summary: "14 weeks until your race".

**Screen 6 — Race suggestion (conditional, single-select, auto-advance)**

Show only if no race date picked in Screen 5.

Question: **"Want us to suggest a race?"**

Sub: "We'll point you to upcoming UK Hyrox events."

Options:
- Yes, show me UK races (display 3 placeholder upcoming events as a static list — Manchester, London, Glasgow with placeholder dates)
- I'll find my own later

**Screen 7 — Training frequency (single-select, auto-advance)**

Question: **"How many days a week can you train?"**

Sub: "Most members train 4 days. Pick what you can realistically commit to."

Options (large cards with explanatory text under each):
- **3 days** — Minimum effective dose. Race-ready in 16 weeks instead of 12.
- **4 days** — Recommended. Best balance of progress and recovery.
- **5 days** — Faster progress. Higher recovery demand.
- **6 days** — Advanced volume. For athletes used to high training load.

**Screen 8 — Session length (single-select, auto-advance)**

Question: **"How long can your sessions be?"**

Sub: "We'll build workouts that fit your time."

Options:
- 30 min — Tight schedule
- 45 min — Standard
- 60 min — Recommended (covers warm-up + main + cool-down)
- 90 min or more — Big block training

**Screen 9 — Training location (single-select, auto-advance)**

Question: **"Where will you train?"**

Sub: "We'll adapt your plan to your space and kit."

Options:
- Full Hyrox gym (sled, ski erg, rower, wall balls)
- Standard commercial gym
- Home setup

**Screen 10 — Home equipment (conditional, multi-select, requires Continue)**

Show only if Screen 9 = "Home setup".

Question: **"What kit do you have at home?"**

Sub: "Pick everything you've got. We'll use what we can."

Multi-select chips (toggleable):
- Dumbbells
- Kettlebell
- Rower
- Ski erg
- Sled
- Sandbag
- Wall ball
- Pull-up bar
- Bodyweight only

Continue button appears bottom-fixed once at least one option selected.

**Screen 11 — Reassurance interstitial #2 (no button, auto-advance after 4s OR tap)**

Full-bleed image: `bento-plan.jpg`. Dark gradient overlay.

Overlay text:

> "Give us 4 sessions a week. We'll give you Hyrox-ready fitness in 12 weeks."

Small mono caption: `12-week First Race programme`

**Screen 12 — Partner setup (conditional, single-select, auto-advance)**

Skip if Screen 2 = "Training with a partner" (already routed to doubles).

Question: **"Training solo or with a partner?"**

Options:
- Solo
- Doubles (training with a partner) → routes to `doubles-path`

**Screen 13 — Injuries (single-select, auto-advance)**

This builds trust — modelled on Runna's empathy moment around injuries.

Question: **"Any injuries we should plan around?"**

Sub: "We'll adjust your plan to protect what needs protecting."

Options:
- No injuries, all clear
- Lower back
- Knee
- Shoulder
- Achilles or calf
- Other — I'll note in the app later

**Screen 14 — Plan summary (NOT a question — a review screen)**

Before asking for email, show user a summary of what they've told us. Reinforces investment.

Layout:

```
Your plan
─────────

[ FIRST RACE PROGRAMME ]

12 weeks · 4 sessions per week
60 min sessions · Standard gym · Solo
No injuries

Starting Tuesday 27 May
Race-ready: Saturday 19 August
```

Calculate dates dynamically:
- Start date = next Tuesday
- Race date = start date + (weeks × 7)
- Use `date-fns` for date math

Single CTA: **"See my Week 1 →"**

**Screen 15 — Email gate**

Question: **"Where should we send your plan?"**

Sub: "We'll save it to this email so you can come back anytime."

Single email input (16px font-size minimum to prevent iOS zoom).

Mono helper text below input: `[ TRIAL STARTS WHEN YOU SUBSCRIBE · NO CHARGE YET ]`

Trust line below: "We won't spam. Unsubscribe anytime."

CTA: **"See my plan →"**

On submit:
1. POST to `/api/email-gate` — store email + UUID + quiz state in Supabase
2. Schedule abandoned-plan email for +1hr if no checkout
3. Route to calculating cinematic, then plan reveal

### 3.3 Quiz UX rules — non-negotiable

Apply consistently across every screen:

- **Auto-advance on single-select:** 200ms delay after tap, then smooth transition to next screen
- **NO Next button on single-select screens** — only Back arrow (top-left), ✕ close icon (top-right routing to home with confirm), and Settings cog accessed via Settings sheet
- **Continue button only on:** multi-select, slider, calendar, email input
- **Top bar:** Back arrow left (24px tap target with 24px padding = 48px total), progress bar centre, screen counter mono "X / 15", ✕ close icon right
- **Progress bar:** 2px slim line, fills accent colour, animates with 320ms ease-out between screens
- **Page transitions:** View Transitions API. Forward = slide left 24px + fade. Back = slide right 24px + fade.
- **Haptic feedback:** light on option select, medium on Continue, success pattern on Screen 14 reveal
- **Backgrounds:** Interstitials and welcome carousel use full-bleed photos. Questions use flat bg-base.
- **Imagery on cards:** Single-select option cards can include small 24x24 icons. Multi-select chips stay text-only for clarity at scale.
- **Auto-save:** state to localStorage `vyrek:quiz:state` after every answer
- **Resume banner:** if `vyrek:quiz:state` exists on home page load, show subtle banner: "Resume your quiz — question 7 of 15 →"
- **Pre-fill from URL params:** `/quiz?program=first-race` skips Screen 2, jumps to Screen 5 (race date)
- **Validation:** if user tries to advance without selecting, gentle inline message: "Pick one to continue."

### 3.4 Smart routing logic

Implement in `lib/quiz-schema.ts`:

```typescript
type QuizAnswers = {
  intent: 'first-hyrox' | 'go-faster' | 'doubles' | 'getting-into';
  bestTime?: 'under-75' | '75-90' | '90-105' | 'over-105' | 'unknown';
  raceDate?: Date;
  raceSuggestion?: 'yes' | 'no';
  days: 3 | 4 | 5 | 6;
  sessionLength: '30' | '45' | '60' | '90';
  location: 'gym-full' | 'gym-standard' | 'home';
  equipment?: string[];
  partner: 'solo' | 'doubles';
  injuries: string;
};

type Programme = 'first-race' | 'sub-90' | 'doubles' | 'pro';

export function determineProgramme(answers: QuizAnswers): Programme {
  // Doubles takes priority — explicit partner training
  if (answers.intent === 'doubles' || answers.partner === 'doubles') {
    return 'doubles';
  }

  // First Race — new to Hyrox or new to the discipline
  if (answers.intent === 'first-hyrox' || answers.intent === 'getting-into') {
    return 'first-race';
  }

  // Experienced racers split between Sub-90 and Pro
  if (answers.intent === 'go-faster') {
    if (answers.bestTime === 'under-75') return 'pro';
    return 'sub-90';
  }

  // Conservative fallback
  return 'first-race';
}

export function determineStartDate(): Date {
  // Next Tuesday from today
  const today = new Date();
  const daysUntilTuesday = (2 - today.getDay() + 7) % 7 || 7;
  const tuesday = new Date(today);
  tuesday.setDate(today.getDate() + daysUntilTuesday);
  return tuesday;
}

export function determineRaceDate(startDate: Date, weeks: number, userRaceDate?: Date): Date {
  if (userRaceDate) return userRaceDate;
  const raceDate = new Date(startDate);
  raceDate.setDate(startDate.getDate() + (weeks * 7));
  return raceDate;
}
```

### 3.5 Deploy + report

Deploy. Report with:
- Total screens in most common path (first-race, no race booked, standard gym, solo, no injuries)
- Estimated completion time
- Confirmation auto-advance works on every single-select
- Confirmation summary screen shows correct dates

---

## PART 4 — Missing pages (~1.5 hours)

The footer links to pages that don't exist. Build all 9 missing pages with real, thoughtful content (no `Lorem ipsum`). UK English throughout. Trainer's Notebook voice.

### 4.1 Legal pages

UK GDPR + Consumer Rights compliance required before launch.

**`/legal/privacy`** — Privacy Policy

Content sections:
- What we collect: email, quiz answers, payment data (via Stripe, we never store card numbers), Sanity content drafts, PostHog analytics events
- Why: to deliver your training plan, process payment, improve the product
- Legal basis: contract performance (training plan), consent (analytics), legitimate interest (security)
- Retention: training data until subscription ends + 90 days; analytics 12 months; payment records 7 years (HMRC)
- UK GDPR rights: access, rectification, deletion, portability, restriction, objection, complaint to ICO
- Contact: privacy@vyrek.com
- Last updated date: today's date

**`/legal/terms`** — Terms of Service

Sections:
- Service description: personalised Hyrox training programmes via web platform
- Payment: 7-day free trial, £14.99/month after, recurring monthly, GBP via Stripe
- Cancellation: anytime via Stripe customer portal or by emailing support; effective at end of current billing period
- UK Consumer Rights: 14-day cooling-off normally applies; explicitly waived once digital service accessed (per Consumer Contracts Regulations 2013, Reg 37(1)(a))
- User conduct: no sharing accounts, no scraping content, no reselling
- IP: Vyrek owns programmes and content; user owns their personal data and logged workouts
- Liability: standard exclusion of consequential damages; cap at 12 months of fees paid
- Referral programme: £20 bounty per converted referral, paid 30 days after referee's first paid invoice, 50/year cap, no self-referrals, paid via BACS
- Governing law: England & Wales
- Disputes: Online Dispute Resolution platform or English courts

**`/legal/cookies`** — Cookie Policy

Sections:
- Necessary cookies (session, CSRF, consent state) — always on, no opt-out
- Analytics (PostHog: `ph_*` cookies) — opt-in only via banner, can be disabled in banner
- Marketing: none currently used
- Third-party: Stripe (during checkout only), Sanity (only on /studio)
- How to opt out: cookie banner toggle + browser settings

**`/legal/refunds`** — Refund Policy

Sections:
- UK Consumer Contracts Regulations: digital service accessed = no statutory cooling-off
- Practical refund policy: accidental charges refunded within 48 hours of charge if no service used
- Free trial design: protects against accidental charges (no payment until day 8)
- How to request: email support@vyrek.com with subscription details
- Response time: within 24 hours, Monday to Friday

Use shadcn Typography. Brief eyebrow at top: "Last updated: [today's date]". Single page, scrollable, no nav within page.

### 4.2 About page

**`/about`** — Single-section content page

Layout:
- Hero band: full-width image (`bento-coaches.jpg`), dark overlay, headline overlaid
- Heading: "Built for the world's fastest growing sport"
- Sub: "Vyrek is a Hyrox-first training platform. Our mission: get you to your start line stronger than you expected."
- Section: "Why Vyrek?" — three paragraphs covering: (1) Hyrox is exploding (600 athletes 2018 → 650K 2024), (2) Most programmes are generic functional fitness, not Hyrox-specific, (3) We work backwards from the race format
- Section: "Built in the UK" — small paragraph + technical mark `[ MADE IN UK ]`
- CTA at bottom: "Find your plan →"

### 4.3 Contact page

**`/contact`** — Single page

Layout:
- Heading: "Get in touch"
- Sub: "We answer every email."
- Three contact reasons in a clean grid:
  - **General questions** — hello@vyrek.com
  - **Product support** — support@vyrek.com
  - **Press and partnerships** — press@vyrek.com
- Social links: Instagram, TikTok (use placeholder URLs `https://instagram.com/vyrek` and `https://tiktok.com/@vyrek`)
- Response time: "We reply within 24 hours, Monday to Friday."
- Small office address: "Vyrek, United Kingdom" (no real address yet)

### 4.4 Press page

**`/press`** — Placeholder page

Layout:
- Heading: "Press & media"
- Sub: "For media enquiries, partnerships, or athlete features."
- Contact: press@vyrek.com
- Section "Brand assets" with download links:
  - "Logo pack (SVG)" → `/press/vyrek-logos.zip` (create a zip with `logo-primary.svg` and `logo-monogram.svg`)
  - "Brand guidelines (PDF)" → "Coming soon" placeholder
- Section "Recent coverage": empty state, "Coverage coming soon."
- Section "About Vyrek" — one paragraph summary lifted from About page

### 4.5 How It Works page

**`/how-it-works`** — Standalone deep-dive on the 4-step flow

Layout:
- Heading: "How Vyrek works"
- Sub: "From quiz to start line, in 4 steps."
- 4 numbered sections, each full-width, alternating image/text on desktop, stacked on mobile:
  - **[ 01 ] Take the quiz** — 15 questions, ~3 minutes. Image: `quiz-interstitial-1.jpg`
  - **[ 02 ] See your Week 1** — Real workouts, dated, before you pay. Image: `bento-plan.jpg`
  - **[ 03 ] Start your trial** — 7 days free, £14.99/month after. Image: `programme-first-race.jpg`
  - **[ 04 ] Train and adapt** — Every Sunday, your next week appears, calibrated to your progress. Image: `bento-progress.jpg`
- Each section: number, headline, 2-paragraph body, image alongside
- Final CTA block: "Find your plan →"

### 4.6 Programmes overview page

**`/programmes`** — Detail page showing all 4 programmes

Layout:
- Hero: "Four programmes. One pathway."
- Sub: "Pick where you are. We'll meet you there."
- 4 full-width sections, alternating image left/right on desktop:

For each programme:
- Background image (use `/media/images/programme-*.jpg`)
- Programme name (text-3xl, weight 900)
- Tag (mono): `[ BEGINNER / 12 WEEKS ]`
- Audience description (3 sentences)
- "Who this is for" — 4 bullet points
- "What you'll do" — 4 sample workout types
- Length: 12 weeks, recalibrates every Sunday
- CTA: "Start this programme →" (links to `/quiz?program=[slug]`)

Programme content:
- **First Race** — For athletes who've never raced Hyrox. 12 weeks to your first finish line.
- **Sub-90** — For athletes who've raced and want to break the 90-minute barrier.
- **Doubles** — Train with a partner. Race together. One plan, synchronised for two athletes.
- **Pro** — For sub-75 athletes chasing podiums. Train alongside an Elite 15 athlete.

### 4.7 Deploy + report

Deploy after all 9 pages built. Report with:
- All 9 new URLs
- Lighthouse scores for each new page
- Confirmation all footer links now resolve correctly

---

## PART 5 — Content fixes + polish + functional QA (~1 hour)

### 5.1 Update "Built by Elite 15 athletes" section

Current section is placeholder-heavy. Update:

- Replace coach portrait with `/media/images/coach-james-wright.jpg`
- Founding coach name: **James Wright**
- Role tag: `[ FOUNDING COACH ]`
- Credentials: `[ ELITE 15 ]` `[ HYROX UK 2024/25 ]` `[ TOP 50 WORLDS QUALIFIER ]`
- Bio (80 words, Trainer's Notebook voice):

> "James Wright is a UK Hyrox athlete competing at the Elite 15 level. Top 50 finish at the 2025 World Championships in Chicago. Eight seasons of competitive functional fitness before transitioning to Hyrox in 2023. Coaches the programming for Vyrek's First Race, Sub-90, and Pro programmes."

- Coach hub: show James Wright as founding coach + 2 "Coming soon" tiles styled consistently
  - Tile 1: silhouette portrait, `[ COACH ]` mono label, "Joining 2026" text
  - Tile 2: silhouette portrait, `[ COACH ]` mono label, "Joining 2026" text

### 5.2 "A Week in Your Life" — corrected vignettes

Replace current vignettes with these (verified against typical Hyrox training structure):

```
Tuesday, 6:15am
Day 2. Hyrox-specific session.
Run + sled push intervals.
45 minutes. Log it in the app.

Thursday, 7:30pm
Strength block.
Compound lifts + Hyrox-relevant accessories.
60 minutes. Video form checks on key sets.

Saturday, 8:00am
Race simulation. The big one.
8 stations + 8 × 1km run.
90 minutes. The session that builds belief.
```

### 5.3 Add real testimonials (placeholder names, real-looking quotes)

Three testimonials for the carousel. Use the JPEG portrait images for visual credibility.

```
[Portrait: testimonial-1.jpg]
"Vyrek got me to my first Hyrox finish feeling fresh. 92 minutes when I'd planned for 105.
The structure made the difference."
— Sarah · Bristol · First Race graduate

[Portrait: testimonial-2.jpg]
"Broke 85 minutes after three years stuck at 95.
The Sub-90 programme actually delivers on the name."
— Marcus · Manchester · Sub-90 graduate

[Portrait: coach-james-wright.jpg]
"The Doubles programme is the only one I've found that builds station handoff strategy.
We knocked 11 minutes off our previous time."
— Alex & Jamie · Edinburgh · Doubles
```

### 5.4 Functional sanity check — test every interactive element

Click-test the entire site. Verify:

- **Homepage CTAs:** every "Find your plan" routes to `/quiz`
- **Programme cards:** each routes to `/quiz?program=[slug]` correctly
- **Nav links:** all resolve (Programmes, How It Works, About, Contact)
- **Footer links:** all 4 legal pages load, About/Contact/Press load, social links open in new tab
- **Back navigation:** browser back from any page returns to previous; quiz ✕ icon returns to home with confirm
- **Quiz auto-advance:** confirmed working on every single-select
- **Quiz Continue:** works on multi-select, calendar, email
- **Quiz progress bar:** updates smoothly between screens
- **Plan reveal:** Week 1 visible, Weeks 2-12 blurred with paywall card
- **Plan reveal sticky CTA:** above keyboard when input focused (test on mobile)
- **Pricing page:** CTA routes to checkout (or back to quiz if checkout not built yet)
- **Email gate:** validation works, 16px font, no iOS zoom on focus

For any broken interaction: fix before reporting complete.

### 5.5 SEO baseline (proper SEO infrastructure comes in Phase G)

- Every page has unique `<title>` (60 char max) and meta description (160 char max) via `generateMetadata`
- `app/sitemap.ts` includes ALL pages: home, pricing, how-it-works, about, contact, press, programmes, 4 legal pages, plus future blog placeholder
- `app/robots.ts`: allow all public pages, disallow /api/, /account/, /checkout/, /studio/
- Organization JSON-LD in root layout
- FAQPage JSON-LD on homepage FAQ section
- BreadcrumbList JSON-LD on all sub-pages
- OG image per page (default `/og-image.png` if no custom)

### 5.6 Mobile polish pass

Test at 375px, 390px, 414px widths via Chrome DevTools mobile mode:

- No horizontal scroll anywhere
- All sticky CTAs respect `safe-area-inset-bottom`
- All tap targets minimum 48px
- All inputs `font-size: 16px+` (prevents iOS zoom)
- Bottom sheets work for multi-select, calendar
- Pull-to-refresh disabled on quiz pages
- Haptic feedback fires on tap on real iPhone

### 5.7 Lighthouse final pass

Run on every page. Targets:
- Performance ≥95 mobile
- Accessibility = 100
- Best Practices = 100
- SEO = 100

If any drops below: investigate and fix.

### 5.8 Final report

Report with:
- All pages live with URLs
- Lighthouse scores in a table
- Confirmation James Wright is throughout (Ben Carter eliminated)
- Confirmation all media is real (no placeholders)
- Confirmation all 4 footer legal links resolve
- Any items I (the user) still need to do (Sanity CORS, Stripe setup for Phase E, etc.)

---

## Execution rules

1. **Do Parts 1-5 in strict order.** Deploy after each part. Stop and wait for my review before continuing.
2. **Don't compress.** This brief is intentionally detailed because the user wants attention to detail. Don't simplify or skip steps.
3. **Trainer's Notebook voice everywhere.** Direct, lowercase nav, no exclamation marks, no hype.
4. **Mobile-first.** 90% of traffic. Test mentally at 390px before deploying.
5. **Lighthouse 95+ must not regress.**
6. **Don't fake content.** Use placeholder data clearly labelled, or real data. Never invented testimonials with no source.
7. **If a decision isn't specified, make the conservative choice and flag in the report.**

Start with Part 1 now.
