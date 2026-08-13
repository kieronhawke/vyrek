import "server-only";
import type Stripe from "stripe";
import type { supabaseAdmin } from "@/lib/supabase/admin";
import { invoiceSubscriptionId } from "@/lib/billing/stripe-compat";
import {
  commissionPence,
  tierForActiveCount,
  type Tier,
} from "@/lib/partners/commission";
import { logEvent } from "@/lib/admin/events";

/**
 * Credit a partner's commission for one paid invoice — the single place that
 * does it, called from both the Stripe webhook and the reconciliation cron.
 *
 * Idempotent by invoice id: the atomic credit_partner_commission() function
 * (migration 0121) claims the invoice and applies the ledger writes in one
 * transaction, so calling this twice for the same invoice credits once. That's
 * what lets the cron safely re-run over recent invoices to backfill anything a
 * failed webhook missed.
 */

export type CreditResult =
  | { credited: true }
  | { credited: false; reason: string };

export async function creditCommissionForInvoice(
  admin: ReturnType<typeof supabaseAdmin>,
  invoice: Stripe.Invoice,
): Promise<CreditResult> {
  const subscriptionId = invoiceSubscriptionId(invoice);
  const amountPence = invoice.amount_paid ?? 0;
  if (!subscriptionId || amountPence <= 0) {
    return { credited: false, reason: "no-subscription-or-amount" };
  }
  if (!invoice.id) return { credited: false, reason: "no-invoice-id" };

  const { data: subRow } = await admin
    .from("subscriptions")
    .select("customer_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (!subRow?.customer_id) return { credited: false, reason: "no-customer" };

  const { data: ref } = await admin
    .from("partner_referrals")
    .select("id, partner_id, status, first_paid_at, recurring_earnings_pence")
    .eq("customer_id", subRow.customer_id)
    .maybeSingle();
  if (!ref) return { credited: false, reason: "not-referred" };

  const { data: partner } = await admin
    .from("partners")
    .select(
      "id, tier, active_subscribers, pending_payout_pence, lifetime_earnings_pence, total_referrals",
    )
    .eq("id", ref.partner_id)
    .maybeSingle();
  if (!partner) return { credited: false, reason: "no-partner" };

  const tier = (partner.tier ?? "starter") as Tier;
  const commission = commissionPence({ invoiceAmountPence: amountPence, tier });
  const isFirstPaid = !ref.first_paid_at;
  const newActive = (partner.active_subscribers ?? 0) + (isFirstPaid ? 1 : 0);
  const newTotal = (partner.total_referrals ?? 0) + (isFirstPaid ? 1 : 0);
  const promotedTier = tierForActiveCount(newActive);

  const { data: credited, error } = await admin.rpc("credit_partner_commission", {
    p_invoice_id: invoice.id,
    p_partner_id: partner.id,
    p_referral_id: ref.id,
    p_commission_pence: commission,
    p_is_first_paid: isFirstPaid,
    p_new_active: newActive,
    p_new_total: newTotal,
    p_promoted_tier: promotedTier,
    p_first_paid_at: new Date().toISOString(),
  });

  if (error) {
    const code = (error as { code?: string }).code;
    // Migration 0121 not applied yet: surface a reason rather than throwing, so
    // the caller can decide (the webhook logs and moves on instead of wedging).
    if (code === "42883" || /function .*does not exist/i.test(error.message ?? "")) {
      return { credited: false, reason: "rpc-missing" };
    }
    throw error;
  }

  if (credited) {
    await logEvent({
      actor: "system",
      action: isFirstPaid
        ? "partner.referral.activated"
        : "subscription.activated",
      targetKind: isFirstPaid ? "partner_referral" : "subscription",
      targetId: isFirstPaid ? ref.id : subscriptionId,
      metadata: {
        partnerId: partner.id,
        commission_pence: commission,
        tier: promotedTier,
      },
    });
    return { credited: true };
  }
  return { credited: false, reason: "already-credited" };
}
