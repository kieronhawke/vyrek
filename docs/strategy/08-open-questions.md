# OPEN QUESTIONS — DO NOT INVENT ANSWERS

These are unresolved. If a task depends on one, **stop and flag it to Kieron.** Do not
guess, and do not build around an assumed answer.

---

## 1. RESULTS DATA SOURCE — BLOCKING

**Everything compounding in this strategy sits on top of this layer:** the times cluster,
the local performance data, the calculators, the quiz PB lookup, the leaderboard, the
entire SEO moat.

Three routes, first two should run in parallel:

**a) Official data partnership with Hyrox.** They already run a gym affiliate programme,
so commercial partnerships exist. A licensed feed makes the whole thing bulletproof and
becomes a defence competitors cannot cross.

**b) "Claim your profile" — user-submitted.** Athletes add their own results, we enrich
with analytics. 100% first-party, legally clean, and it creates the account relationship
that converts to subscriptions. Better product anyway — user-verified beats scraped.
**This route is unblocked and can be built now.**

**c) Scraping.** Race times are facts and facts are not copyrightable — but the UK and EU
have a separate *sui generis database right* protecting the investment in compiling a
database. It does not exist in US law and catches people out. Hyrox also runs an active IP
enforcement team.

**Required before building on route (c): a UK solicitor's opinion on database rights.**
One conversation, not a project. Do not proceed without it.

---

## 2. DOMAIN AND HANDLES

Are `suvathletic.com`, `suvathletic.co.uk`, and `@suvathletic` on Instagram and TikTok
actually secured?

**If the social handles are gone, the brand name may need to fall back to SUTH.** Confirm
before any brand asset is produced. Handle availability kills more names than domains do.

---

## 3. BEN'S 1:1 CAPACITY

How many private clients can he realistically take? Determines the price point and the
"spots remaining" copy on `/coaching`.

---

## 4. PHOTOGRAPHY

The current photos folder is majority AI-generated PNGs, excluded from use. Only a small
number of usable stock JPEGs exist.

**The beginner branch of the quiz needs warm, human, real photography** and it is currently
the biggest asset gap in the project. A photo sourcing brief exists. Resolve before Phase 1
homepage work.

---

## 5. SUB-BRAND QUESTION

Does SUV Athletic carry both the Hyrox and beginner segments long term, or does the
beginner side eventually need its own sub-brand? Not urgent, but affects information
architecture decisions if answered late.

---

## 6. KEYWORD DATA GAPS

Never pulled from Semrush. Run these seeds and add rows to `data/keywords.csv`:

- `hyrox coach` and online-coaching terms
- competitor comparisons (runna alternative, best hyrox app)
- hybrid training, beginner fitness, strength, running clusters
- non-UK volumes (US, DE, AU will differ substantially)
- the full UK location long tail — only ~65 of ~1,100 towns are currently in the database
