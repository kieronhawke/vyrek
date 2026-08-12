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
    const email = customerEmail.trim().toLowerCase();
    const { data, error } = await sb.auth.admin.generateLink({
      type: "recovery",
      email,
    });
    if (error) throw error;

    // SEND IT OURSELVES. The generated link used to depend on Supabase's
    // built-in mailer, which is rate-limited to a handful an hour and
    // unbranded, so "Send password reset" produced nothing in the inbox.
    // Resend on the verified domain, through our own callback route, is
    // the same delivery path every other email already uses.
    const hashed = data?.properties?.hashed_token;
    let sent = false;
    if (hashed) {
      const { siteUrl } = await import("@/lib/site-url");
      const { sendSignInLink } = await import("@/lib/email/send");
      const signInUrl = `${siteUrl()}/auth/callback?token_hash=${encodeURIComponent(
        hashed,
      )}&type=recovery&next=${encodeURIComponent("/app/account")}`;
      const full = data?.user?.user_metadata?.full_name;
      const firstName =
        (typeof full === "string" && full.trim().split(/\s+/)[0]) ||
        email.split("@")[0].split(/[\W_]+/)[0];
      const result = await sendSignInLink({
        to: email,
        firstName: firstName
          ? firstName[0].toUpperCase() + firstName.slice(1)
          : "there",
        signInUrl,
      });
      sent = result.ok;
    }

    await logEvent({
      actor: user.email ?? "admin",
      action: "customer.signed_up",
      targetKind: "customer",
      metadata: {
        event: "password_reset_link_sent",
        email,
        delivered: sent,
      },
    });
    return { ok: true, link: sent ? undefined : (data?.properties?.action_link ?? undefined) };
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
    // "payments" is where the paid charge lives on the current Stripe API;
    // the flat invoice.charge field is gone. The compat helpers read both
    // shapes, so this works whichever API version the account is on.
    const invoice = await s.invoices.retrieve(latestInvoiceId, {
      expand: ["payments"],
    });
    const { invoicePaymentIntentId, invoiceChargeId } = await import(
      "@/lib/billing/stripe-compat"
    );
    const paymentIntentId = invoicePaymentIntentId(invoice);
    const chargeId = paymentIntentId ? null : invoiceChargeId(invoice);
    if (!paymentIntentId && !chargeId) {
      return { ok: false, error: "invoice has no payment to refund" };
    }
    const refund = await s.refunds.create(
      paymentIntentId ? { payment_intent: paymentIntentId } : { charge: chargeId! },
    );
    await logEvent({
      actor: user.email ?? "admin",
      action: "subscription.cancelled",
      targetKind: "subscription",
      targetId: stripeSubscriptionId,
      metadata: {
        event: "invoice_refunded",
        refundId: refund.id,
        amount_pence: refund.amount,
        refund_status: refund.status,
      },
    });

    // Tell the client their money is coming back. A refund with no email
    // is a "did that actually go through?" message three days later.
    try {
      const sb = supabaseAdmin();
      const { data: subRow } = await sb
        .from("subscriptions")
        .select("customer_id")
        .eq("stripe_subscription_id", stripeSubscriptionId)
        .maybeSingle();
      if (subRow?.customer_id) {
        const { data: customer } = await sb
          .from("customers")
          .select("email, auth_user_id")
          .eq("id", subRow.customer_id)
          .maybeSingle();
        if (customer?.email) {
          let firstName: string | null = null;
          if (customer.auth_user_id) {
            const { data } = await sb.auth.admin.getUserById(
              customer.auth_user_id as string,
            );
            const full = data?.user?.user_metadata?.full_name;
            if (typeof full === "string" && full.trim()) {
              firstName = full.trim().split(/\s+/)[0];
            }
          }
          const { sendRefundEmail } = await import("@/lib/billing/comms");
          await sendRefundEmail({
            to: customer.email as string,
            firstName,
            amountPence: refund.amount,
          });
        }
      }
    } catch (e) {
      console.error("[actions] refund email failed", e);
    }

    return { ok: true, refundId: refund.id, amount_pence: refund.amount };
  } catch (e) {
    return fail(e);
  }
}

// ─── Member portal mode ─────────────────────────────────

/**
 * Flip a client between the billing-only portal (payment-link clients:
 * subscription management, nothing else) and the full training app. This
 * is the "switch their training space on" moment — reversible, logged.
 */
export async function setMemberMode(
  customerId: string,
  mode: "billing" | "full",
): Promise<ActionResult> {
  try {
    const { user } = await assertAdmin();
    const sb = supabaseAdmin();
    const { data: customer } = await sb
      .from("customers")
      .select("auth_user_id, email")
      .eq("id", customerId)
      .maybeSingle();
    const authUserId = customer?.auth_user_id as string | null;
    if (!authUserId) {
      return { ok: false, error: "customer has no signed-in account yet" };
    }
    // Read-merge-write: updateUserById's metadata merge behaviour has
    // shifted across GoTrue versions, and losing full_name here would
    // un-name the client everywhere.
    const { data: existing } = await sb.auth.admin.getUserById(authUserId);
    const { error } = await sb.auth.admin.updateUserById(authUserId, {
      user_metadata: {
        ...(existing?.user?.user_metadata ?? {}),
        member_mode: mode,
      },
    });
    if (error) return { ok: false, error: error.message };

    await logEvent({
      actor: user.email ?? "admin",
      action: "subscription.activated",
      targetKind: "customer",
      targetId: customerId,
      metadata: { event: "member_mode_changed", mode },
    });

    revalidatePath(`/admin/customers/${customerId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ─── Subscription actions ───────────────────────────────

/**
 * Move a client onto a new monthly rate.
 *
 * Applies from the next invoice — no proration, no surprise mid-month
 * charge. The subscription item keeps its product; only the price changes,
 * created inline exactly like the checkout does, so nobody has to log
 * into Stripe to add a Price first.
 */
export async function changeSubscriptionRate(
  stripeSubscriptionId: string,
  newAmountPence: number,
): Promise<ActionResult & { amount_pence?: number }> {
  try {
    const { user } = await assertAdmin();
    if (
      !Number.isInteger(newAmountPence) ||
      newAmountPence < 100 ||
      newAmountPence > 100_000
    ) {
      return { ok: false, error: "rate must be between £1 and £1,000 a month" };
    }
    const { stripe } = await import("@/lib/stripe");
    const s = stripe();
    const sub = await s.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ["items.data.price.product"],
    });
    const item = sub.items.data[0];
    if (!item) return { ok: false, error: "subscription has no items" };

    // The item's own product is only reusable while it's active. Products
    // minted by old inline-product_data checkouts are archived by Stripe
    // the moment the session completes and refuse new prices — the exact
    // failure the first live rate-change test hit. Fall back to the
    // persistent per-plan product, resolved from the subscription's plan
    // metadata (defaulting to 1:1 coaching, which is what every custom
    // rate is).
    const rawProduct = item.price.product;
    let productId =
      typeof rawProduct === "string"
        ? rawProduct
        : "deleted" in rawProduct && rawProduct.deleted
          ? null
          : rawProduct.active
            ? rawProduct.id
            : null;
    if (!productId) {
      const { ensurePlanProduct } = await import("@/lib/billing/products");
      const { planByKey } = await import("@/lib/onboarding/model");
      const plan =
        planByKey(String(sub.metadata?.plan ?? "")) ?? planByKey("coaching-121")!;
      productId = await ensurePlanProduct(plan.key, plan.name, plan.summary);
    }

    await s.subscriptions.update(stripeSubscriptionId, {
      items: [
        {
          id: item.id,
          price_data: {
            currency: "gbp",
            unit_amount: newAmountPence,
            recurring: { interval: "month" },
            product: productId,
          },
        },
      ],
      proration_behavior: "none",
    });

    await logEvent({
      actor: user.email ?? "admin",
      action: "subscription.activated",
      targetKind: "subscription",
      targetId: stripeSubscriptionId,
      metadata: {
        event: "rate_changed",
        from_pence: item.price.unit_amount,
        to_pence: newAmountPence,
      },
    });

    // Tell the client. A rate that changes with no confirmation in their
    // inbox is a dispute waiting for the next bank statement.
    try {
      const sb2 = supabaseAdmin();
      const { data: subRow } = await sb2
        .from("subscriptions")
        .select("customer_id, current_period_end")
        .eq("stripe_subscription_id", stripeSubscriptionId)
        .maybeSingle();
      if (subRow?.customer_id) {
        const { data: customer } = await sb2
          .from("customers")
          .select("email, auth_user_id")
          .eq("id", subRow.customer_id)
          .maybeSingle();
        if (customer?.email) {
          let firstName: string | null = null;
          if (customer.auth_user_id) {
            const { data } = await sb2.auth.admin.getUserById(
              customer.auth_user_id as string,
            );
            const full = data?.user?.user_metadata?.full_name;
            if (typeof full === "string" && full.trim()) {
              firstName = full.trim().split(/\s+/)[0];
            }
          }
          const { sendRateChangeEmail } = await import("@/lib/billing/comms");
          await sendRateChangeEmail({
            to: customer.email as string,
            firstName,
            newAmountPence,
            oldAmountPence: item.price.unit_amount,
            nextInvoiceISO: subRow.current_period_end as string | null,
          });
        }
      }
    } catch (e) {
      console.error("[actions] rate-change email failed", e);
    }

    revalidatePath("/admin/subscriptions");
    return { ok: true, amount_pence: newAmountPence };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Pause collection — the "money is tight this month" option the dunning
 * rules prefer over cancelling. Access continues, invoices are parked as
 * uncollectible, and it resumes automatically if a date is given.
 */
export async function pauseSubscription(
  stripeSubscriptionId: string,
  resumeISO?: string,
  reason?: string,
): Promise<ActionResult> {
  try {
    const { user } = await assertAdmin();
    const { stripe } = await import("@/lib/stripe");
    const s = stripe();
    const resumesAt = resumeISO
      ? Math.floor(new Date(resumeISO).getTime() / 1000)
      : undefined;
    if (resumeISO && (!resumesAt || Number.isNaN(resumesAt) || resumesAt <= Date.now() / 1000)) {
      return { ok: false, error: "resume date must be in the future" };
    }
    await s.subscriptions.update(stripeSubscriptionId, {
      pause_collection: {
        behavior: "mark_uncollectible",
        ...(resumesAt ? { resumes_at: resumesAt } : {}),
      },
    });
    await logEvent({
      actor: user.email ?? "admin",
      action: "subscription.activated",
      targetKind: "subscription",
      targetId: stripeSubscriptionId,
      metadata: {
        event: "paused",
        resumes_at: resumeISO ?? null,
        reason: reason ?? null,
      },
    });
    revalidatePath("/admin/subscriptions");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/**
 * What a refund WOULD do, before anything is touched. The modal shows
 * this so the admin confirms a number, not a guess.
 */
export async function getRefundPreview(
  stripeSubscriptionId: string,
): Promise<
  ActionResult & {
    amount_pence?: number;
    description?: string | null;
    paidOnISO?: string | null;
    alreadyRefunded?: boolean;
  }
> {
  try {
    await assertAdmin();
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
    const invoice = await s.invoices.retrieve(latestInvoiceId, {
      expand: ["payments"],
    });
    const { invoicePaymentIntentId } = await import(
      "@/lib/billing/stripe-compat"
    );
    const pi = invoicePaymentIntentId(invoice);
    let alreadyRefunded = false;
    if (pi) {
      const refunds = await s.refunds.list({ payment_intent: pi, limit: 1 });
      alreadyRefunded = refunds.data.length > 0;
    }
    return {
      ok: true,
      amount_pence: invoice.amount_paid ?? 0,
      description: invoice.lines?.data?.[0]?.description ?? null,
      paidOnISO: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
        : null,
      alreadyRefunded,
    };
  } catch (e) {
    return fail(e);
  }
}

export async function resumeSubscription(
  stripeSubscriptionId: string,
): Promise<ActionResult> {
  try {
    const { user } = await assertAdmin();
    const { stripe } = await import("@/lib/stripe");
    const s = stripe();
    await s.subscriptions.update(stripeSubscriptionId, {
      // Empty string is Stripe's "unset this" — null is rejected.
      pause_collection: "" as unknown as undefined,
    });
    await logEvent({
      actor: user.email ?? "admin",
      action: "subscription.activated",
      targetKind: "subscription",
      targetId: stripeSubscriptionId,
      metadata: { event: "resumed" },
    });
    revalidatePath("/admin/subscriptions");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/**
 * The kind cancel: the client keeps what they paid for until the period
 * ends, then it stops. This is the default the UI offers; the immediate
 * cancel below is the escalation.
 */
export async function cancelSubscriptionAtPeriodEnd(
  stripeSubscriptionId: string,
): Promise<ActionResult> {
  try {
    const { user } = await assertAdmin();
    const { stripe } = await import("@/lib/stripe");
    const s = stripe();
    await s.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Status stays as-is until Stripe fires customer.subscription.deleted
    // at period end; record the intent so the admin list shows it now.
    const sb = supabaseAdmin();
    await sb
      .from("subscriptions")
      .update({ cancellation_reason: "admin-cancelled-at-period-end" })
      .eq("stripe_subscription_id", stripeSubscriptionId);

    await logEvent({
      actor: user.email ?? "admin",
      action: "subscription.cancelled",
      targetKind: "subscription",
      targetId: stripeSubscriptionId,
      metadata: { source: "admin", mode: "at_period_end" },
    });

    revalidatePath("/admin/subscriptions");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

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
