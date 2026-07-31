# QUESTIONS & ASSUMPTIONS

Everything the pack does not answer, everything I am assuming, and every contradiction I
found between documents. Nothing here has been guessed at in code.

Convention: **🔴 BLOCKING** stops a phase. **🟠 SHAPING** changes the design but I can build
around it. **🟡 NOTED** is a discrepancy recorded so nobody trips on it later.

---

## THE THREE KNOWN BLOCKERS (START-HERE.md)

### 1. 🔴 Activity module specced from description, not code
`spec/09 §9` describes the Activity & Analytics module as "the same visibility as Green
Buggy Hire", specced from a verbal description. The pack says that codebase has not been
provided.

**It appears to be on this machine** — `~/hire-a-golf-buggy` — from other work. I have not
opened it.

> **Question:** may I read that repo to mirror the real implementation, or should I build to
> the written spec only and accept a rework later?

Building to the spec as written until told otherwise.

### 2. 🔴 Results data ingestion is legally blocked
`context/08 §1`. Route (c), scraping, needs a UK solicitor's opinion on database rights
first. Route (a), an official Hyrox partnership, is commercial.

**Route (b), user-submitted "claim your profile", is unblocked.** That is the only ingestion
route I will build. No scraper, not even behind a flag.

Consequence to be aware of: the uniqueness validator requires *at least one results data
point* per location page. Until claimed profiles exist at volume, most of the 62 location
pages will legitimately fail the gate and sit in draft. That is the gate working, not a bug.

### 3. 🔴 Tier 3 is undefined
`spec/13 §6` proposes Coaching £150 / Elite £250 with capacities of 15 and 6, but marks it
unconfirmed. `spec/12 §9` lists defining it as blocking.

Building the entitlement, the `one_to_one_tier` enum and the data model. Tier 3 stays hidden
from the pricing page and from the quiz routing screen until confirmed.

---

## THE BIGGEST QUESTION IN THE PACK

### 4. 🔴 The brand name in this pack is superseded

The entire pack is written for **SUV Athletic** on `suvathletic.com`. This repo, and the live
site, are **Suth Performance** on `suthperformance.com`.

`docs/strategy/BRAND-NAME-CORRECTION.md`, already in this repo, says exactly that:

> NOTE: brand name in this pack (SUV Athletic) is SUPERSEDED — correct brand is Suth
> Performance on suthperformance.com (Kieron, 2026-07-29). All strategy/data content
> remains authoritative.

The pack is dated 30–31 July, *after* that correction, so I cannot assume it is simply older.

This is not cosmetic. It is load-bearing in at least eight places:

| Where | What it says | Consequence |
|---|---|---|
| `HARD-RULES §10` | Send from `mail.suvathletic.com` | Wrong sending domain, wrong SPF/DKIM |
| `spec/18 §1` | Verify `mail.suvathletic.com` in Resend | Two weeks of DNS and warm-up on the wrong domain |
| `spec/18 §2` | `EMAIL_FROM_TRANSACTIONAL=ben@mail.suvathletic.com` | |
| `HARD-RULES §5`, `spec/11 §5` | AI assistant named **"Ask SUV"** | Named after the superseded brand |
| `context/01` | Tagline *"All-terrain athlete"*, whole SUV rationale | The rationale does not survive the rename |
| `spec/14 §5` | Top bar reads "SUV ATHLETIC" | |
| `context/08 §2` | Asks whether the handles are secured, and says **"if the social handles are gone, the brand name may need to fall back to SUTH"** | Suggests the rename may already be the answer to this question |
| Everywhere | Copy, PDF cover, email signatures | |

> **Question:** is the pack's SUV Athletic naming a deliberate revival, or should I read
> "SUV Athletic" as "Suth Performance" throughout?

**I am assuming Suth Performance** — the repo, the live domain, the committed correction and
my own memory of your 2026-07-29 decision all agree, and `context/00-README-AMENDMENTS.md`
does not list the name among things /spec overrides. I will keep the assistant's name in one
config constant so a rename is a one-line change either way, and I will not produce any brand
asset until you confirm.

---

## SCOPE AND STARTING POINT

### 5. 🔴 The pack reads as greenfield. This repo is not.

`spec/10 §6` says "no recurring infrastructure exists. This is a greenfield build" — but that
sentence is specifically about *payments*. The application around it already exists and is
live behind a noindex flag:

- Next.js 16 app on Vercel, Sanity, Supabase, Upstash, Stripe, Resend, PostHog, Sentry
- A working quiz with two rails, a sift, and lead capture
- `/club` landing page, member area components, 58 blog posts, 65×2 geo pages
- 33 branded lifecycle emails and 15 SMS templates written yesterday
- An admin at `/admin` with customers, waitlist, partners, payouts, blog

> **Question:** am I building the admin control centre *into* this repo alongside the
> marketing site, or is this a separate application?

**Assuming: into this repo**, at `/admin` (Operator) and `/coach` (Coach), sharing the
database, auth, design tokens and email layer. That is what the routes in `spec/09 §0`
imply and it avoids two deployments and two auth systems.

### 6. 🟠 What happens to the work already built?
The existing quiz is ~13–17 screens across two rails. `context/02` specifies **28 screens**
with Branch A (beginner, 4–20) and Branch B (Hyrox, 4–22), and `spec/12 §4` adds a budget /
service routing screen and a Call Prep Sheet.

> **Question:** extend the existing quiz to the 28-screen spec, or rebuild it to the pack?

**Assuming: extend.** The existing flow already implements the pack's mechanics — progress
bar, back navigation, no auto-advance on multi-select, mid-flow email capture, a Meet Ben
screen, and a reveal. The gap is screen count and the routing screen, not architecture.

### 7. 🟠 Existing admin pages
`/admin` already has customers, waitlist, partners, payouts, blog and messaging. The pack
specifies 13 modules that partly overlap.

**Assuming:** fold the existing pages into the new module map rather than running two admins.
Partners and payouts are not in the pack's 13 modules — I will leave them in place and
untouched.

---

## PRICING AND COMMERCIAL

### 8. 🔴 The no-pricing policy contradicts the pack
On 2026-07-29 you set a policy that no Suth coaching price appears anywhere on the site, and
every coached path ends at a free consultation. On 2026-07-30 you approved a carve-out so the
club shows its price.

The pack publishes prices for everything: Hub £12.99, Programming £80, Coaching £150, Elite
£250, and `spec/13 §6` asks for visible capacity — "6 Elite spots — 2 remaining".

> **Question:** does the pack supersede the no-pricing policy for the coached tiers?

**Assuming: not yet.** Building the price fields, the Stripe price IDs and the entitlements,
but keeping coached prices off public pages until you say otherwise. One flag flips it.

### 9. 🟡 Hub price disagrees with the code
`lib/pricing.ts` still has `monthlyPence: 899` (£8.99) from the original build. The pack says
£12.99, which matches the `CLUB` config I added yesterday. Treating **£12.99 as correct** and
retiring the £8.99 constant.

### 10. 🟠 Currencies and VAT
`spec/09 §18` asks both and neither is answered. GBP only or GBP + USD? VAT registered?
Determines whether Stripe Tax is switched on from day one and whether `currency` needs to be
per-account from the start.

**Assuming GBP only, Stripe Tax off**, with `currency char(3)` present in the schema so
adding USD later is data, not migration.

### 11. 🟠 Is Hub included in Personal Programming?
`spec/11 §1` and `spec/12 §9` both ask. Building it as **included**, per the instruction in
`spec/11 §1`. Needs confirming before billing goes live so nobody is billed twice.

### 12. 🟠 Manual-payment proportion
`spec/09 §18` asks. Affects how much polish the payment-link and Mark-as-Paid flows need.
**Assuming a meaningful minority** and building Mark as Paid to the same standard as card.

### 13. 🟠 The third-party collector
`spec/10 §9 Q2` asks what they were charging and whether anything needs unwinding. ~£1,000
processed. Commercial, so not guessing. Does any of it need importing as historical payments?

---

## COACH AND CLIENT BEHAVIOUR

### 14. 🟠 Does Ben use Google Calendar?
`spec/09 §18 Q2`. The whole Diary design assumes Google. If it is Apple Calendar the route
becomes CalDAV and materially more fragile. **Assuming Google.** Phase F is where this bites,
so there is time.

### 15. 🟠 Inbound client SMS on Ben's personal phone, or only in the admin?
`spec/09 §18 Q6`. Changes the Twilio number setup and whether replies thread correctly.
**Assuming admin-only**, with the Twilio number owning the conversation.

### 16. 🟠 Session comments: push per comment or daily digest?
Asked twice, `spec/10 §9 Q4` and `spec/11 §10 Q4`. **Assuming per-comment push with a
per-event setting**, since `spec/18 §4` lists it as Push+In-app default On, and the global
3-per-day cap already protects against noise.

### 17. 🟠 Race priority A/B/C — who sets it?
`spec/10 §9 Q5`. **Assuming Ben sets it**, with the client able to state a target race during
onboarding which Ben then prioritises. It drives the conflict resolver, so it is a coaching
judgement.

### 18. 🟠 Excel or Google Sheets for the spreadsheet export?
`spec/10 §9 Q3`. **Assuming `.xlsx`** — it opens natively in Google Sheets, so one format
serves both. Flagging because it affects the library choice.

---

## AI ASSISTANT

### 19. 🔴 What may the assistant actually change?
`spec/11 §10 Q2` records that you said "edit a few things", and the doc's own read is
read-only on the plan. The doc calls this "the difference between a useful tool and a brand
liability".

**Assuming strictly read-only on plans**, with format generation, Q&A, and escalation only.
Not building any write path until you confirm.

### 20. 🟠 Ben's visibility of assistant conversations
`spec/11 §10 Q7` recommends yes. **Assuming yes**, logged and visible.

---

## PRODUCT SCOPE

### 21. 🟠 Nutrition scope for V1
`spec/11 §10 Q3`. **Assuming light V1** — photo log, manual targets, hydration tick — per the
recommendation in `spec/11 §8` and amendment 4 in `00-README-AMENDMENTS.md`. No food database,
no barcode scanning.

### 22. 🟠 Watch platforms at launch
`spec/11 §10 Q6`. `spec/11 §6` marks watch sync P0 alongside logging. Apple and Garmin both,
or Apple first? **Assuming Apple first**, with the sync layer written provider-agnostic.
Flagging because "P0" and "both at launch" together is a large Phase-scope question.

### 23. 🟠 PWA sufficient for launch?
`spec/11 §10 Q5` recommends yes. **Assuming PWA only**, no native shell.

### 24. 🟠 Weekly group Q&A format
`spec/12 §9 Q3`. Written, video or live? **Assuming written**, cheapest and most reusable,
and it is the format that a queue-and-publish model fits.

### 25. 🟠 Hub trial length and card requirement
`spec/12 §9 Q4`. You chose 7 days with no card for the club yesterday. **Assuming that
carries over.**

### 26. 🟠 Annual Hub pricing
`spec/12 §9 Q5` suggests ~£129/yr. I used £99/yr for the club page yesterday on your
"go with your recommendation". These disagree.

> **Question:** £99 or £129 for annual Hub?

Using **£99** until told otherwise, since it is already live in the code.

### 27. 🟠 Does the free intake call stay free?
`spec/12 §9 Q6`. Commercial. Not assuming.

---

## COMPLIANCE AND OPERATIONS

### 28. 🔴 Who is the responsible person for data protection?
`spec/09 §18 Q5` and `spec/09 §14`. Needs a name on record before health data is collected in
production. I will build the consent capture, the encryption and `data_access_log`, but the
named person is a field only you can fill.

### 29. 🟠 Processor agreements
`spec/09 §14` requires them with Stripe, Twilio, PostHog and the email provider. Legal, not
code. Flagging so it does not get missed.

### 30. 🟠 Health-data retention period
`spec/15` says "duration of relationship + 12 months". Confirming that is the intended policy
rather than an example, since it becomes an automated purge job.

### 31. 🟡 Twilio lead time
`spec/18 §1` warns a UK alphanumeric sender ID needs **two weeks**. Phase B depends on lead
SMS. Worth starting the registration now even though Phase B is a way off.

---

## CONTRADICTIONS FOUND BETWEEN DOCUMENTS

Recorded per your instruction. `/spec` wins over `/context`
(`context/00-README-AMENDMENTS.md`).

| # | Conflict | Resolution |
|---|---|---|
| 32 | 🟡 `START-HERE.md` says HARD-RULES has **9** non-negotiables and the pack listing repeats it. The file has **14**. | 14. Your prompt also says 14. The count in START-HERE is stale. |
| 33 | 🟡 `spec/10 §8` asks for a new global rule about auto-sending and the Coach's Note to be *added* to HARD-RULES. It is already there as rules 3 and 4. | Already applied. No action. |
| 34 | 🟡 `context/07` describes three tiers. There are four. | /spec wins — `spec/12`. Already covered by amendment 1. |
| 35 | 🟡 `context/03` calls the Results Hub the moat. `spec/13 §2` withdraws that. | /spec wins. The moat is Ben. Already covered by amendment 2. |
| 36 | 🟡 `spec/12 §7` says £80 looks underpriced. `spec/13 §1` explicitly corrects itself and says it is not. | `spec/13` is later and self-corrects. £80 stands. |
| 37 | 🟡 `spec/12` tier table says 1:1 price "TBD"; `spec/13 §1` notes you said £100–150 once and £120–250 elsewhere, and assumes £120–250. | Unresolved — folded into blocker 3. Not guessing. |
| 38 | 🟡 `spec/13 §1` benchmarks Hub against Runna at "roughly £16/month"; `spec/13 §2` lists Runna at £15.99/mo or ~£8/mo annual. | Same figure, different rounding. No action. |
| 39 | 🟠 `context/02` puts a **paywall at the end of the quiz** for both branches. The funnel built yesterday deliberately ends at a free plan plus either a call or a no-card trial, and your no-pricing policy forbids a coached paywall. | Not reconciling silently. Question 8 covers it. |
| 40 | 🟡 `spec/09 §16` recommends Clerk or Auth.js for auth. The repo already runs Supabase Auth with an email-allowlist admin gate. | Covered in STACK.md §3. |

---

## THINGS I AM DELIBERATELY NOT BUILDING

- Any results scraper, in any form, behind any flag
- Any `--force` or `skipValidation` bypass on the uniqueness validator
- Any AI-assist, template picker or generate button on the Coach's Note
- Any auto-send that presents itself as Ben's personal thought
- Tier 3 on any public surface
- Direct Debit / GoCardless (`spec/10 §6`, deferred)
- A food database or barcode scanning
- Native app shells
- Any fabricated testimonial, counter, logo or statistic, including as placeholder
