"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin/auth";
import { mintOnboardingToken } from "@/lib/partners/tokens";
import {
  sendApprovalEmail,
  partnerOnboardingUrl,
} from "@/lib/partners/emails";
import { logEvent } from "@/lib/admin/events";

/**
 * Server actions called from admin UI. Every action re-checks admin
 * status (defence in depth, even though the layout already gates) and
 * writes via the service-role client (bypasses RLS).
 *
 * All actions return { ok, error? } so client buttons can show inline
 * status.
 */

type ActionResult = { ok: true } | { ok: false; error: string };

function fail(e: unknown): ActionResult {
  return {
    ok: false,
    error: e instanceof Error ? e.message : "unknown error",
  };
}

// ─── Partner application actions ────────────────────────

export async function approvePartnerApplication(
  applicationId: string,
): Promise<
  ActionResult & {
    onboardingUrl?: string;
    emailSent?: boolean;
    emailReason?: string;
  }
> {
  try {
    const { user } = await assertAdmin();
    const sb = supabaseAdmin();

    const { data: app, error: appErr } = await sb
      .from("partner_applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();
    if (appErr) throw appErr;
    if (!app) return { ok: false, error: "application not found" };
    if (app.status !== "pending") {
      return { ok: false, error: `application already ${app.status}` };
    }

    await sb
      .from("partner_applications")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    // Mint the onboarding token and email it. The partner row itself
    // isn't created until the applicant finishes /partners/onboard, that
    // way they pick their own slug and supply bank details directly,
    // bypassing the encryption-of-empty-strings problem.
    const token = mintOnboardingToken(applicationId);
    const onboardingUrl = partnerOnboardingUrl(token);

    let emailSent = false;
    let emailReason: string | undefined;
    try {
      const result = await sendApprovalEmail({
        to: app.email,
        name: app.name,
        onboardingUrl,
      });
      emailSent = result.ok;
      if (!result.ok) emailReason = result.reason;
    } catch (e) {
      emailReason = e instanceof Error ? e.message : "send failed";
    }

    await logEvent({
      actor: user.email ?? "admin",
      action: "partner.application.approved",
      targetKind: "partner_application",
      targetId: applicationId,
      metadata: { emailSent, emailReason: emailReason ?? null },
    });

    revalidatePath("/admin/partners");
    revalidatePath(`/admin/partners/${applicationId}`);
    revalidatePath("/admin/partners/list");

    return { ok: true, onboardingUrl, emailSent, emailReason };
  } catch (e) {
    return fail(e);
  }
}

export async function rejectPartnerApplication(
  applicationId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const { user } = await assertAdmin();
    const sb = supabaseAdmin();
    const { error } = await sb
      .from("partner_applications")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason || null,
      })
      .eq("id", applicationId);
    if (error) throw error;
    await logEvent({
      actor: user.email ?? "admin",
      action: "partner.application.rejected",
      targetKind: "partner_application",
      targetId: applicationId,
      metadata: { reason },
    });
    revalidatePath("/admin/partners");
    revalidatePath(`/admin/partners/${applicationId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function requestApplicationInfo(
  applicationId: string,
  note: string,
): Promise<ActionResult> {
  try {
    const { user } = await assertAdmin();
    const sb = supabaseAdmin();
    const { error } = await sb
      .from("partner_applications")
      .update({
        status: "needs_info",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: note || null,
      })
      .eq("id", applicationId);
    if (error) throw error;
    await logEvent({
      actor: user.email ?? "admin",
      action: "partner.application.needs_info",
      targetKind: "partner_application",
      targetId: applicationId,
      metadata: { note },
    });
    revalidatePath("/admin/partners");
    revalidatePath(`/admin/partners/${applicationId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ─── Partner actions ────────────────────────────────────

export async function suspendPartner(
  partnerId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const { user } = await assertAdmin();
    const sb = supabaseAdmin();
    const { error } = await sb
      .from("partners")
      .update({
        suspended_at: new Date().toISOString(),
        suspension_reason: reason || null,
      })
      .eq("id", partnerId);
    if (error) throw error;
    await logEvent({
      actor: user.email ?? "admin",
      action: "partner.suspended",
      targetKind: "partner",
      targetId: partnerId,
      metadata: { reason },
    });
    revalidatePath("/admin/partners/list");
    revalidatePath(`/admin/partners/p/${partnerId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function unsuspendPartner(
  partnerId: string,
): Promise<ActionResult> {
  try {
    const { user } = await assertAdmin();
    const sb = supabaseAdmin();
    const { error } = await sb
      .from("partners")
      .update({ suspended_at: null, suspension_reason: null })
      .eq("id", partnerId);
    if (error) throw error;
    await logEvent({
      actor: user.email ?? "admin",
      action: "partner.unsuspended",
      targetKind: "partner",
      targetId: partnerId,
    });
    revalidatePath("/admin/partners/list");
    revalidatePath(`/admin/partners/p/${partnerId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setPartnerTier(
  partnerId: string,
  tier: "starter" | "growth" | "elite",
): Promise<ActionResult> {
  try {
    const { user } = await assertAdmin();
    const sb = supabaseAdmin();
    const { error } = await sb
      .from("partners")
      .update({ tier })
      .eq("id", partnerId);
    if (error) throw error;
    await logEvent({
      actor: user.email ?? "admin",
      action: "partner.tier.set",
      targetKind: "partner",
      targetId: partnerId,
      metadata: { tier },
    });
    revalidatePath("/admin/partners/list");
    revalidatePath(`/admin/partners/p/${partnerId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ─── Payout actions ─────────────────────────────────────

export async function createPayoutForPartner(
  partnerId: string,
): Promise<ActionResult & { payoutId?: string; amount_pence?: number }> {
  try {
    const { user } = await assertAdmin();
    const sb = supabaseAdmin();

    const { data: partner, error: pErr } = await sb
      .from("partners")
      .select("id, pending_payout_pence")
      .eq("id", partnerId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!partner) return { ok: false, error: "partner not found" };
    const amount = partner.pending_payout_pence ?? 0;
    if (amount < 5000) {
      return { ok: false, error: `balance ${amount}p below £50 minimum` };
    }

    const now = new Date();
    const periodEnd = now.toISOString().slice(0, 10);
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 1);
    const periodStart = startDate.toISOString().slice(0, 10);

    const { data: payout, error: insErr } = await sb
      .from("partner_payouts")
      .insert({
        partner_id: partnerId,
        amount_pence: amount,
        period_start: periodStart,
        period_end: periodEnd,
        status: "pending",
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    // Zero out the pending balance now that it's been queued as a payout.
    await sb
      .from("partners")
      .update({ pending_payout_pence: 0 })
      .eq("id", partnerId);

    await logEvent({
      actor: user.email ?? "admin",
      action: "partner.payout.queued",
      targetKind: "partner_payout",
      targetId: payout.id,
      metadata: { partnerId, amount_pence: amount },
    });

    revalidatePath("/admin/payouts");
    revalidatePath(`/admin/partners/p/${partnerId}`);
    return { ok: true, payoutId: payout.id, amount_pence: amount };
  } catch (e) {
    return fail(e);
  }
}

export async function markPayoutPaid(
  payoutId: string,
  bacsReference: string,
): Promise<ActionResult> {
  try {
    const { user } = await assertAdmin();
    const sb = supabaseAdmin();
    const { error } = await sb
      .from("partner_payouts")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        bacs_reference: bacsReference || null,
      })
      .eq("id", payoutId);
    if (error) throw error;
    await logEvent({
      actor: user.email ?? "admin",
      action: "partner.payout.paid",
      targetKind: "partner_payout",
      targetId: payoutId,
      metadata: { bacsReference },
    });
    revalidatePath("/admin/payouts");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function markPayoutFailed(
  payoutId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const { user } = await assertAdmin();
    const sb = supabaseAdmin();
    const { error } = await sb
      .from("partner_payouts")
      .update({
        status: "failed",
        bacs_reference: reason || null,
      })
      .eq("id", payoutId);
    if (error) throw error;
    await logEvent({
      actor: user.email ?? "admin",
      action: "partner.payout.failed",
      targetKind: "partner_payout",
      targetId: payoutId,
      metadata: { reason },
    });
    revalidatePath("/admin/payouts");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ─── Customer actions ───────────────────────────────────

export async function sendCustomerPasswordReset(
  customerEmail: string,
): Promise<ActionResult & { link?: string }> {
  try {
    const { user } = await assertAdmin();
    const sb = supabaseAdmin();
    const { data, error } = await sb.auth.admin.generateLink({
      type: "recovery",
      email: customerEmail.trim().toLowerCase(),
    });
    if (error) throw error;
    await logEvent({
      actor: user.email ?? "admin",
      action: "customer.signed_up",
      targetKind: "customer",
      metadata: {
        event: "password_reset_link_generated",
        email: customerEmail,
      },
    });
    return { ok: true, link: data?.properties?.action_link ?? undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function refundLastStripeInvoice(
  stripeSubscriptionId: string,
): Promise<
  ActionResult & { refundId?: string; amount_pence?: number }
> {
  try {
    const { user } = await assertAdmin();
    const { stripe } = await import("@/lib/stripe");
    const s = stripe();
    const sub = await s.subscriptions.retrieve(stripeSubscriptionId);
    const latestInvoiceId =
      typeof sub.latest_invoice === "string"
        ? sub.latest_invoice
        : sub.latest_invoice?.id;
    if (!latestInvoiceId) {
      return { ok: false, error: "no invoice on this subscription" };
    }
    const invoice = await s.invoices.retrieve(latestInvoiceId);
    const chargeId =
      typeof (invoice as unknown as { charge?: string }).charge === "string"
        ? (invoice as unknown as { charge: string }).charge
        : null;
    if (!chargeId) {
      return { ok: false, error: "invoice has no charge to refund" };
    }
    const refund = await s.refunds.create({ charge: chargeId });
    await logEvent({
      actor: user.email ?? "admin",
      action: "subscription.cancelled",
      targetKind: "subscription",
      targetId: stripeSubscriptionId,
      metadata: {
        event: "invoice_refunded",
        refundId: refund.id,
        amount_pence: refund.amount,
      },
    });
    return { ok: true, refundId: refund.id, amount_pence: refund.amount };
  } catch (e) {
    return fail(e);
  }
}

// ─── Subscription actions ───────────────────────────────

export async function cancelSubscriptionImmediately(
  stripeSubscriptionId: string,
): Promise<ActionResult> {
  try {
    const { user } = await assertAdmin();
    // Cancel in Stripe via dynamic import so the module doesn't load
    // unless this code path runs.
    const { stripe } = await import("@/lib/stripe");
    const s = stripe();
    await s.subscriptions.cancel(stripeSubscriptionId);

    const sb = supabaseAdmin();
    await sb
      .from("subscriptions")
      .update({
        status: "canceled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: "admin-cancelled",
      })
      .eq("stripe_subscription_id", stripeSubscriptionId);

    await logEvent({
      actor: user.email ?? "admin",
      action: "subscription.cancelled",
      targetKind: "subscription",
      targetId: stripeSubscriptionId,
      metadata: { source: "admin" },
    });

    revalidatePath("/admin/subscriptions");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
