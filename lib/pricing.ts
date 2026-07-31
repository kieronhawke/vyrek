/**
 * Pricing configuration. Centralised so the price appears in exactly one
 * place across landing, pricing page, checkout, emails. Phase G migrates
 * this to Sanity for non-coder editing.
 */

/**
 * Suth Club, the self-serve tier.
 *
 * The one place on the site where a price is published. Kieron's no-pricing
 * policy (29 Jul) covers coaching, which is always agreed on a call with
 * Ben; the club is a checkout product and cannot convert without a number.
 * Carve-out signed off 30 Jul, see docs/onboarding-funnel-proposal.md §1.
 *
 * Trial is 7 days with no card, the Ladder model: maximum top-of-funnel
 * volume, and everyone who enters becomes a warm lead for coaching.
 */
export const CLUB = {
  name: "Suth Club",
  monthlyPence: 1299,
  monthlyDisplay: "£12.99",
  annualPence: 9900,
  annualDisplay: "£99",
  trialDays: 7,
  trialLine: "7 days free. No card needed.",
  anchorCopy: "Less than a coffee a week",
  ctaLabel: "Start 7 days free →",
} as const;

export const PRICING = {
  monthlyPence: 899,
  monthlyDisplay: "£8.99",
  trialDays: 7,
  anchorCopy: "Roughly two coffees a month",
  ctaLabel: "Start training →",
  inclusions: [
    "Personalised 12-week programme",
    "Dated weekly plan, every Sunday",
    "Built by Elite 15 athletes",
    "Video form checks",
    "Plan recalibrates as you improve",
    "Cancel anytime, no questions",
  ],
} as const;
