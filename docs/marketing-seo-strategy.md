# Vyrek — Marketing + SEO Strategy

**Last updated:** 2026-05-22
**Owner:** Founder + content team
**Goal:** Dominate organic for UK Hyrox by being the fastest publisher of useful Hyrox content, the deepest topical hub, and the cleanest converting funnel.

This is the working playbook. It supersedes ad-hoc content decisions.

---

## North-star numbers (12-month targets)

| Metric | Today | 6mo | 12mo |
|---|---|---|---|
| Indexed URLs | 178 | 600 | 1,500+ |
| Blog posts published | 15 | 75 | 200 |
| Organic monthly sessions | TBD | 8,000 | 35,000 |
| Domain Rating (Ahrefs) | new | 25 | 45 |
| Free → trial conversion | TBD | 4% | 7% |
| Trial → paid conversion | TBD | 45% | 55% |

These are aggressive but achievable given the **125+ programmatic pages already shipped**, **155+ city pages still to be templated**, and **the fact that no UK Hyrox site has a publishing cadence**.

---

## Three strategic pillars

### Pillar 1 — Be first to publish

Every Hyrox race weekend has a 7-day pre-race attention spike (search volume on "hyrox [city]" peaks in the run-up). If Vyrek owns the first-page result for that query at T-7, we capture organic + ad-adjacent traffic for the cohort already converting.

**Tactical rule:** for every UK Hyrox race weekend, Vyrek publishes:
- **T-14 days:** Race preview ("Hyrox London March 2026: what to expect")
- **T-7 days:** Final-week prep guide ("7 days out from Hyrox Manchester: taper, fuelling, kit check")
- **T-1 day:** Race-day briefing ("Race-day kit checklist for Hyrox Birmingham")
- **T+1 day:** Recap + winning splits ("Hyrox Glasgow 2026: men's open winning time, division splits")
- **T+7 days:** Lessons + photos ("What we learned from Hyrox London — 4 patterns")

**This is automated.** See `app/api/cron/race-coverage/route.ts` (built this round). Vercel Cron triggers daily; the route scans `HYROX_EVENTS` and decides whether any of the above should publish today.

### Pillar 2 — Topical depth (own the question, not just the keyword)

For every Hyrox-adjacent question, Vyrek should be one of three things on Google's results page:
1. The clearest answer (featured snippet)
2. The deepest guide (clicked first from results)
3. The trustworthy source (cited by gear roundups, Reddit, race-prep threads)

This means:
- Every station gets a 1,500-word guide (✅ done — 8 stations)
- Every UK city gets a localised landing (✅ done — 103 cities/boroughs)
- Every comparison ("Hyrox vs X") gets a comparison page (✅ done — 5 comparisons)
- Every goal time gets a plan template (✅ done — 4 sub-X templates)
- Every audience gets an audience-specific page (✅ done — 4 audience plans)
- Every event gets an event page (✅ done — 4 events)
- Every gear category gets a buyer's guide (✅ done — 5 gear guides)

**The next 6 months adds:**
- Race recap pages for every UK weekend (~4-6 / year)
- Athlete profile pages (once consent collected) — `/athletes/[slug]`
- Coach 1:1 booking pages once the offering exists
- Training club partner pages — `/clubs/[slug]`
- Hyrox training PDF lead magnets (gated email opt-in)

### Pillar 3 — Distribution > publishing

The blog ≠ the moat. The moat is **knowing where Hyrox racers spend their attention and being in those rooms with useful content**.

**Channels (in priority order):**
1. **Reddit** — r/Hyrox (4k+ subs), r/crossfit, r/running. Useful answers + tool links (pace calculator gets shared most).
2. **Hyrox UK Facebook group** (large active community). Race-week briefings + the cohort-banner urgency.
3. **Strava clubs** — set up "Vyrek Athletes" club, post weekly training summaries.
4. **TikTok** — short race-tip videos (60 sec each), evergreen, station-by-station.
5. **YouTube Shorts** — same content as TikTok, second distribution.
6. **Hyrox-adjacent newsletters** — pitch RoxLyfe, HyroxInsider, Hybrid Athlete Club for guest content swaps.
7. **Email list** — capture via pace calculator + free PDF gate, ship a weekly "Hyrox Roundup" newsletter.

---

## Content engine (operational model)

### Cadence

| Type | Frequency | Owner |
|---|---|---|
| Race coverage (preview/recap) | Per UK event (~6-8/year) | **Auto-bot** — see below |
| Evergreen blog post | 2/week (long-form) | Coach team + freelance |
| Quick tip post (300-500 words) | 3/week | Editor |
| Email newsletter | Weekly (Sunday eve) | Editor |
| Social (TikTok/Instagram) | Daily | Founder + intern |
| Topic-hub refresh | Monthly | Editor |

**Output target by month 6:** 4 long-form + 12 quick posts + 4 race-bot posts = 20 posts/month → 240/year. From a base of 15, that gets us to 250+ posts inside the year.

### Race-coverage bot (deployed this round)

The bot is implemented as a Vercel Cron that runs daily at 06:00 UTC. It scans `lib/hyrox-events.ts` and decides whether any event has hit a coverage milestone (T-14/T-7/T-1/T+1/T+7). If yes, it triggers content generation from a template + the event's structured data. The output is a stub MDX file in `content/blog/_pending/` for human review, OR auto-publishes if `VYREK_BOT_AUTOPUBLISH=true`.

**Why human-review by default:** even templated content needs a final eye for tone + facts. The bot generates the structure (headers, sections, schema), not the spirit. A reviewer's job is reduced from "write a 1,500-word post" to "approve 60 seconds of edits."

To add a new event: append to `HYROX_EVENTS` in `lib/hyrox-events.ts`. The bot picks it up the next day.

### Topic hubs (deployed this round)

The four highest-volume audience clusters now have dedicated hub pages:

- `/topics/womens-hyrox` — pulls all women-relevant content
- `/topics/masters-hyrox` — over-40 athletes
- `/topics/doubles-hyrox` — paired teams
- `/topics/first-race-hyrox` — first-timers

Each hub pulls related blog posts + plan templates + station guides + relevant city/event pages into one indexable surface. Internal-link density compounds.

---

## SEO tactical priorities (next 90 days)

| Priority | Action | Why |
|---|---|---|
| **P0** | Custom domain (vyrek.com) + Google Search Console verification | Indexing crawl rate is throttled on `.vercel.app` |
| **P0** | Submit sitemap.xml (178 URLs) to GSC + Bing Webmaster | Triggers initial crawl |
| **P1** | Set up automated race-coverage cron (live) | Captures T-14/T-1 search peaks |
| **P1** | Build /topics hubs | Internal-link density compounds rankings |
| **P1** | Email list capture via pace calculator + free PDF | Owned distribution |
| **P2** | Reddit + Hyrox FB seed posts (3 per channel per week) | Off-site signals + referral |
| **P2** | Athlete face wall on /about + /coaches once consent collected | Trust signals for higher-LTV personas |
| **P3** | Pitch HyroxInsider / RoxLyfe for guest post or tool roundup | Backlinks from authority |

---

## What to *not* do (anti-strategy)

- **No keyword-stuffed AI slop.** Every page must be readable as a coach's notebook entry, not a content-mill output. The bot generates *structure* from real data; it does not generate empty word count.
- **No fake testimonials with real names.** ASA compliance. Use anonymised + clearly-labelled illustrative content until real consented quotes land.
- **No PBN links / sponsored backlinks.** One Reddit ban kills the channel for 12 months.
- **No paid acquisition until trial-to-paid is ≥35%.** Below that, paid spend funds Stripe + losses.
- **No content for content's sake.** If a post wouldn't help one of the 5 personas (First Race, Sub-90, Doubles, Masters, Pro), don't publish it.

---

## Editorial style guide (the voice)

Already documented at `/press/brand-guidelines`. Summary:
- **Direct.** No "unleash your potential", no "crush your goals".
- **UK English.** Programme, colour, optimise.
- **Specific.** "Sled push at 152 kg for 50 metres", not "challenging sled work".
- **Honest.** Real numbers, real trade-offs, real limitations. The £4.99 honesty page is the template.
- **Coach's notebook, not marketing brochure.** Short lines. Factual. Slightly understated.

---

## Measurement + iteration

**Weekly review (every Monday):**
- Organic sessions delta vs last week (PostHog)
- Top 5 entry pages (PostHog → Insights → Entry pages)
- Top 5 exit-without-conversion pages
- Quiz funnel drop-off step (PostHog funnel)
- Any single page > 100 sessions/week that hasn't been updated in 90 days

**Monthly review (1st of month):**
- New posts published (target ≥20)
- New URLs indexed (target ≥40)
- Email list growth
- Reddit/FB referrals (UTM-tagged)
- Trial conversion rate by entry page

**Quarterly review:**
- Strategy re-read (this doc)
- Persona update — has the mix shifted?
- Competitive landscape — what have Marchon / HAC shipped?

---

## What's already in place (audit)

✅ **125+ programmatic pages live** — city, station, plan, comparison, event, gear, tool
✅ **15 blog posts** — average 1,500-2,000 words, FAQ schema, internal-linked
✅ **Cmd-K command palette** — power-user navigation
✅ **PostHog session replay + heatmaps** — funnel visibility
✅ **JSON-LD across the board** — Organization, WebSite, BlogPosting, Course, HowTo, FAQPage, LocalBusiness, Event, SoftwareApplication, BreadcrumbList, ItemList
✅ **Sitemap 178 URLs** — submitted nightly
✅ **RSS feed** at `/blog/rss.xml`
✅ **robots.txt** — explicit allow for all programmatic surfaces
✅ **Cookie consent + GDPR-safe analytics**
✅ **Mobile 98+ Lighthouse, 100 a11y/bp/seo**

## What this round adds

✅ **Strategy document** (this file)
✅ **Race-coverage cron** (`app/api/cron/race-coverage/route.ts` + `vercel.json` schedule)
✅ **8 new blog posts** (race-week prep, taper, mental game, parents, shift workers, beginners' kit, calendar 2026, sub-90 secrets)
✅ **Topic hubs** at `/topics/[slug]`
✅ **JSON Feed** at `/feed.json` for modern readers
✅ **Updated sitemap** with new content surfaces

---

## Owner / next actions

1. Push this commit live (or schedule for next deploy window).
2. Set `CRON_SECRET` env var on Vercel (random 32-char string).
3. Verify cron fires daily at 06:00 UTC for the next 7 days.
4. Manual approve / publish the first auto-generated race-preview post.
5. Set up Google Search Console + submit sitemap.
6. Open the Reddit + Hyrox FB accounts; brief first 3 seed posts.

The rest is publishing cadence + iteration.
