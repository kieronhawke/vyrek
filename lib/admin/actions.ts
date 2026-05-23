"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin/auth";

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

function generatePartnerCode(name: string, email: string): string {
  // Slug from name with email-prefix fallback, plus a short random suffix
  // to avoid collisions.
  const base = (name || email.split("@")[0])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "partner"}-${suffix}`;
}

// ─── Partner application actions ────────────────────────

export async function approvePartnerApplication(
  applicationId: string,
): Promise<ActionResult & { partnerId?: string; partnerCode?: string }> {
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

    const partnerCode = generatePartnerCode(app.name, app.email);

    const { data: partner, error: insErr } = await sb
      .from("partners")
      .insert({
        application_id: applicationId,
        email: app.email,
        name: app.name,
        partner_code: partnerCode,
        tier: "starter",
        terms_accepted_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    await sb
      .from("partner_applications")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    revalidatePath("/admin/partners");
    revalidatePath(`/admin/partners/${applicationId}`);
    revalidatePath("/admin/partners/list");

    return { ok: true, partnerId: partner.id, partnerCode };
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
    await assertAdmin();
    const sb = supabaseAdmin();
    const { error } = await sb
      .from("partners")
      .update({
        suspended_at: new Date().toISOString(),
        suspension_reason: reason || null,
      })
      .eq("id", partnerId);
    if (error) throw error;
    revalidatePath("/admin/partners/list");
    revalidatePath(`/admin/partners/${partnerId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function unsuspendPartner(
  partnerId: string,
): Promise<ActionResult> {
  try {
    await assertAdmin();
    const sb = supabaseAdmin();
    const { error } = await sb
      .from("partners")
      .update({ suspended_at: null, suspension_reason: null })
      .eq("id", partnerId);
    if (error) throw error;
    revalidatePath("/admin/partners/list");
    revalidatePath(`/admin/partners/${partnerId}`);
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
    await assertAdmin();
    const sb = supabaseAdmin();
    const { error } = await sb
      .from("partners")
      .update({ tier })
      .eq("id", partnerId);
    if (error) throw error;
    revalidatePath("/admin/partners/list");
    revalidatePath(`/admin/partners/${partnerId}`);
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
    await assertAdmin();
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

    revalidatePath("/admin/payouts");
    revalidatePath(`/admin/partners/${partnerId}`);
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
    await assertAdmin();
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
    await assertAdmin();
    const sb = supabaseAdmin();
    const { error } = await sb
      .from("partner_payouts")
      .update({
        status: "failed",
        bacs_reference: reason || null,
      })
      .eq("id", payoutId);
    if (error) throw error;
    revalidatePath("/admin/payouts");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ─── Subscription actions ───────────────────────────────

export async function cancelSubscriptionImmediately(
  stripeSubscriptionId: string,
): Promise<ActionResult> {
  try {
    await assertAdmin();
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

    revalidatePath("/admin/subscriptions");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
