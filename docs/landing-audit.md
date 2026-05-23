# Landing page section audit (Part 1.6)

Source of truth: `app/page.tsx`. Sections rendered in DOM order.

This audit maps each section to its brief reference. Sections not listed in
the brief stay in place by default (no silent removal). Sections marked for
removal or replacement are tagged accordingly.

| # | Section | Component | In brief? | Required change |
|---|---|---|---|---|
| 0 | (Removed) CohortBanner | `CohortBanner` | Part 1.2 | Removed from this page. Kept in repo for future `/journal` and `/plan` member surfaces. |
| 1 | Marketing nav | `MarketingNav` | Part 1.5 (Pricing link removed) | Pricing link removed from desktop nav, mobile drawer, and Cmd-K palette. |
| 2 | Hero | `Hero` | Part 2.1, 2.2 | Hero image vs video decision pending. Confirm sizing (mobile text-3xl min, desktop text-5xl+). |
| 3 | Social proof bar | `SocialProofBar` | Part 2.3 | Full restructure: one star row, one credibility line, one stat from `/api/stats/active`, unique press logos, no price, no "cancel anytime". |
| 4 | Plan teaser | `PlanTeaser` | Not in brief | No change required. Preserve. |
| 5 | Outcome stats | `OutcomeStats` | Part 2.4 (replaces "What you get for £4.99") | REPLACE entirely with bento "What you get with Vyrek" (4 cards: Personal Hyrox Coach, Dated Weekly Programme, Hyrox-Specific Programming, Progression You Can See). No pricing in this section. |
| 6 | Programmes (Find your programme) | `Programmes` | Part 2.5, 2.6 | Fix mashed text ("12weeks", "8stations"). Confirm 4 cards have programme images, route to `/quiz?program=[slug]`, distinct accent treatment. |
| 7 | Bento features | `BentoFeatures` | Not explicitly named, possible overlap with 2.7, 2.8, 2.9 | Audit overlap with new sections in Part 2. Likely to be split or absorbed into 2.8 (Dated weekly plan) and 2.9 (Adapt as you improve). |
| 8 | Week in life | `WeekInLife` | Part 2.10 | Currently text-only. Replace with day-by-day timeline with icons + Drive images, alternating image-text on mobile. New copy provided in brief (Tue/Thu/Sat vignettes). |
| 9 | Not ready (callout) | `NotReady` | Not in brief | No change required. Preserve. |
| 10 | Coach hub | `CoachHub` | Part 2.7 | Add real images: James Wright headshot (`coach-james-wright.jpg`), 2 "Joining 2026" silhouette placeholders. 3-tile desktop grid, horizontal scroll mobile. |
| 11 | Plan deep dive | `PlanDeepDive` | Part 2.11 | Audit: confirm 7-day Mon-Sun grid with example workouts, labelled "Example week, your personalised plan adapts based on your quiz". Hyrox-specific workout names. CTA to /quiz. |
| 12 | Methodology | `Methodology` | Part 2.12 ("Programming that works") | Audit + likely rewrite. Section currently exists. Review copy for AI phrases, ensure it actually explains WHY methodology works (backwards-from-race, block periodisation, calibration, adaptive rebuilds). Specific and technical. |
| 13 | Testimonials | `Testimonials` | Part 2.13 | Audit current 3 testimonials (Sarah, Marcus, Alex & Jamie). Confirm each has Drive portrait, quote, name, location, programme. Mobile carousel, desktop 3-col grid. No em-dashes (already swept). |
| 14 | FAQ | `Faq` | Part 2.14 | Preserve. Audit only: 8 questions present, answers honest, accordion works mobile, 2-col desktop. |
| 15 | Final CTA | `FinalCta` | Part 2.15 | Replace with clean repeat-CTA block per brief copy: centred large "Train like a Hyrox athlete." + "Find your plan" button + "7-day free trial. No card needed to start." No price. No "cancel anytime". |
| 16 | Marketing footer | `MarketingFooter` | Part 1.4 (socials removed), 1.5 (Pricing link removed) | Instagram + TikTok removed (kept RSS). Pricing link removed from Product column. |

## Notes for Part 2 execution

- Bento (current §7) and OutcomeStats (current §5) likely both replaced by the new "What you get with Vyrek" (Part 2.4) and the new visual sections in 2.8 / 2.9. Don't double-render.
- The animated phone mockup (Part 2.8) and the session-card + chart (Part 2.9) are new builds. Reuse PlanTeaser's existing phone mockup as the basis.
- Section 11 (PlanDeepDive) and the new 2.8/2.9 sections both touch "weekly plan" content. Confirm the deep-dive isn't redundant with the new sections; if it is, drop or fold in.

## Items confirmed not on the landing today

- Pricing card (correctly absent from landing)
- "Cancel anytime" copy (none currently on landing)
- £8.99 mentions on landing (none directly; verify after Part 2)
