/**
 * Partner Programme commission rules. Flat tiered recurring; no flat
 * sign-up bounty.
 *
 *   Starter (0-9 active)    -> 30%
 *   Growth  (10-49 active)  -> 40%
 *   Elite   (50+ active)    -> 50%
 *
 * Tier is recomputed any time a referral becomes active or churns.
 * Clawback applies if a referee cancels within 30 days of their first
 * paid invoice.
 */

export type Tier = "starter" | "growth" | "elite";

export function tierForActiveCount(active: number): Tier {
  if (active >= 50) return "elite";
  if (active >= 10) return "growth";
  return "starter";
}

export function ratePctForTier(tier: Tier): number {
  if (tier === "elite") return 50;
  if (tier === "growth") return 40;
  return 30;
}

/** Returns the commission in pence for a single billed invoice. */
export function commissionPence(args: {
  invoiceAmountPence: number;
  tier: Tier;
}): number {
  return Math.floor((args.invoiceAmountPence * ratePctForTier(args.tier)) / 100);
}

/** 30-day clawback window for new referrals. */
export const CLAWBACK_WINDOW_DAYS = 30;

export function isInClawbackWindow(firstPaidAt: Date | string | null): boolean {
  if (!firstPaidAt) return false;
  const t =
    firstPaidAt instanceof Date ? firstPaidAt.getTime() : new Date(firstPaidAt).getTime();
  const cutoff = Date.now() - CLAWBACK_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return t > cutoff;
}
