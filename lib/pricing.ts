/**
 * Pricing configuration. Centralised so the price appears in exactly one
 * place across landing, pricing page, checkout, emails. Phase G migrates
 * this to Sanity for non-coder editing.
 */

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
