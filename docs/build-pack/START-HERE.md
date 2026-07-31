# START HERE — SUV ATHLETIC BUILD

**Paste the prompt below into Claude Code, with this pack in the repo.**

---

## THE PROMPT

```
You are building the admin control centre and client account for SUV Athletic — a global
online Hyrox and fitness coaching business fronted by Benjamin Sutherland, an Elite 15
Hyrox athlete.

This pack is the complete specification. Read it fully before writing any code.

READ IN THIS ORDER — all of it, no skimming:
  1. rules/HARD-RULES.md          — non-negotiables. Violating these breaks the business.
  2. spec/09-admin-control-centre.md
  3. spec/10-programming-and-personalisation.md
  4. spec/11-client-account.md
  5. spec/12-product-tiers.md
  6. spec/13-pricing-and-value.md
  7. spec/14-design-system.md      — the visual system. Follow it exactly.
  8. spec/15-data-model.md         — the schema.
  9. spec/16-testing.md            — the quality gates. These are the definition of done.
 10. spec/17-contextual-guidance.md
 11. spec/18-integrations-and-notifications.md  — env vars, accounts, webhooks
 12. context/                      — brand, audience, SEO, product background
 13. data/                         — keyword database, seeded

Then, BEFORE writing code:

  A. Write a build plan to PLAN.md covering phases, order, and dependencies.
     Follow the phase order in spec/09 §17. Do not reorder it.
  B. List every assumption you are making, and every question the pack does not answer.
     Write these to QUESTIONS.md. Do NOT invent answers to anything in
     context/08-open-questions.md or the Open Questions section at the end of each
     spec document — those are unresolved on purpose.
  C. Confirm the stack against spec/09 §16. Flag any deviation and why.

Then build, phase by phase. After each phase:
  - Run the full test suite (spec/16)
  - Verify every item in the Definition of Done (spec/16 §12)
  - Commit with a clear message
  - Write a short progress note to PROGRESS.md
  - Move to the next phase

THREE THINGS THAT MATTER MORE THAN ANYTHING ELSE:

1. MOBILE IS NOT RESPONSIVE DESKTOP.
   Ben runs his coaching from a phone in a gym. Coach Mode is mobile-first and must feel
   like a native app — bottom tabs, 44px targets, sheets not modals, zero horizontal
   scroll at any breakpoint. The client app is used one-handed between sets. Test on the
   six-device matrix in spec/16 §3 continuously, not at the end.

2. THE DESKTOP ADMIN IS A CONTROL PANEL, AND IT SHOULD BE THE BEST ONE ANYONE HAS USED.
   Dense, fast, keyboard-driven. Command palette in Phase A, not as polish. Every number
   in tabular mono. Every table sortable, inline-editable, exportable. The design thesis
   in spec/14 §1 is "a timing system, not a CRM" — build to that.

3. NEVER LOSE A WORKOUT.
   Local-first writes, offline queue, idempotent sync. The offline test in spec/16 §2
   must pass on every commit. This is the single most common failure in fitness apps and
   the top driver of one-star reviews for our closest competitor.

WHEN YOU ARE BLOCKED:
  Stop and write the question to QUESTIONS.md. Do not guess at anything commercial, legal,
  or in context/08-open-questions.md. Keep building around it where you can.

WORK INDEPENDENTLY. Build, test, self-critique, fix, and move on. Take screenshots of
what you build and check them against spec/14 before considering a screen done.
```

---

## KNOWN BLOCKERS — READ BEFORE PLANNING

Three things in this pack cannot be built until someone answers them. Build around them,
and put them at the top of QUESTIONS.md:

1. **Activity module (spec/09 §9)** — specced from a verbal description of an existing
   system (Green Buggy Hire). That codebase has not been provided. Build to the spec as
   written, flag that it may need reworking once the reference implementation is available.

2. **Results data source (context/08 §1)** — the results ingestion pipeline is legally
   blocked pending a decision. **Route (b), user-submitted "claim your profile", is
   unblocked and can be built now.** Do not build a scraper.

3. **Tier 3 definition (spec/13 §6)** — proposed but not confirmed. Build the entitlement
   and the data model; keep the tier hidden from the pricing page until confirmed.

---

## WHAT'S IN THIS PACK

```
START-HERE.md              ← you are here
rules/
  HARD-RULES.md            9 non-negotiables
  uniqueness-validator.md  the publish gate
spec/
  09-admin-control-centre.md
  10-programming-and-personalisation.md
  11-client-account.md
  12-product-tiers.md
  13-pricing-and-value.md
  14-design-system.md
  15-data-model.md
  16-testing.md
  17-contextual-guidance.md
  18-integrations-and-notifications.md
context/
  00-BUILD-ORDER.md        SEO/site build order (separate from the app build)
  01-brand-and-identity.md
  02-audience-and-onboarding.md   ← the 28-screen quiz spec
  03-seo-architecture.md
  04-location-page-system.md
  05-content-clusters.md
  06-traffic-playbook.md
  07-product-spec.md
  08-open-questions.md     ← DO NOT invent answers to these
data/
  keywords-client-only.csv 307 rows — the build list
  keywords.csv             425 rows
  keywords-excluded.csv    118 rows — not customers
  location-targets.csv     62 UK towns with URLs
  keyword-database.xlsx
```

---

## THE BUSINESS IN ONE PAGE

Four tiers:

| Tier | Price | What |
|---|---|---|
| Free | £0 | Results Hub, calculators, content — the SEO engine |
| Hub | £12.99/mo | Plans, video library, logging, analytics, Ben's weekly Q&A |
| Personal Programming | £80/mo | Bespoke programme from Ben, fortnightly calls, direct messaging |
| 1:1 Coaching | £150 / £250 | Weekly contact, video form review, race support. Capacity-capped. |

**The moat is Ben, not the data.** A competitor (ROXFIT) already gives away a 3M-race
database for free. What nobody else has is a named Elite 15 athlete who personally builds
your programme and answers your messages. Every tier is a rung on a ladder toward more of him.

**Two people use the admin:**
- **Kieron** — operator. Desktop. Full control panel, all 13 modules.
- **Ben** — coach. Mobile. Five screens. Not a heavy computer user. If the tool feels like
  software he will abandon it and the business doesn't scale.

Ben's two questions, every day: *when is each client programmed until*, and *have they paid*.
Build the Coach Mode dashboard around exactly those.
