import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Append-only admin event log. Insert from every server action + key
 * webhook handler. Renders as the activity feed on /admin and on detail
 * pages as a per-target history.
 *
 * Schema (0004):
 *   admin_events(id, actor, action, target_kind, target_id, metadata, created_at)
 *
 * Action naming: dot-separated namespace.verb pairs, e.g.
 *   partner.application.approved
 *   partner.application.rejected
 *   partner.suspended
 *   partner.payout.queued
 *   partner.payout.paid
 *   subscription.cancelled
 *   subscription.trial_started
 *   subscription.activated
 *   customer.signed_up
 *
 * Failures are swallowed, the event log must never break the originating
 * action.
 */

export type AdminEventAction =
  | "partner.application.approved"
  | "partner.application.rejected"
  | "partner.application.needs_info"
  | "partner.application.submitted"
  | "partner.onboarded"
  | "partner.suspended"
  | "partner.unsuspended"
  | "partner.tier.set"
  | "partner.payout.queued"
  | "partner.payout.paid"
  | "partner.payout.failed"
  | "partner.referral.attributed"
  | "partner.referral.activated"
  | "partner.referral.cancelled"
  | "subscription.trial_started"
  | "subscription.activated"
  | "subscription.cancelled"
  | "subscription.early_payment_failure"
  | "customer.signed_up";

export type LogEventInput = {
  actor: string;
  action: AdminEventAction;
  targetKind?:
    | "partner_application"
    | "partner"
    | "partner_referral"
    | "partner_payout"
    | "subscription"
    | "customer";
  targetId?: string;
  metadata?: Record<string, unknown>;
};

export async function logEvent(input: LogEventInput): Promise<void> {
  try {
    const sb = supabaseAdmin();
    await sb.from("admin_events").insert({
      actor: input.actor,
      action: input.action,
      target_kind: input.targetKind ?? null,
      target_id: input.targetId ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (err) {
    console.warn("[admin/events] insert failed", err);
  }
}

export type AdminEvent = {
  id: string;
  actor: string;
  action: AdminEventAction;
  target_kind: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function listRecentEvents(
  limit = 40,
): Promise<{ ok: true; data: AdminEvent[] } | { ok: false; reason: string }> {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("admin_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { ok: false, reason: error.message };
    return { ok: true, data: (data ?? []) as AdminEvent[] };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "unknown error",
    };
  }
}

export async function listEventsForTarget(
  targetKind: string,
  targetId: string,
  limit = 20,
): Promise<{ ok: true; data: AdminEvent[] } | { ok: false; reason: string }> {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("admin_events")
      .select("*")
      .eq("target_kind", targetKind)
      .eq("target_id", targetId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { ok: false, reason: error.message };
    return { ok: true, data: (data ?? []) as AdminEvent[] };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "unknown error",
    };
  }
}

/** Human-readable label for an event action. */
export function eventLabel(action: AdminEventAction): string {
  const labels: Record<AdminEventAction, string> = {
    "partner.application.submitted": "Partner application submitted",
    "partner.application.approved": "Partner application approved",
    "partner.application.rejected": "Partner application rejected",
    "partner.application.needs_info": "More info requested",
    "partner.onboarded": "Partner finished onboarding",
    "partner.suspended": "Partner suspended",
    "partner.unsuspended": "Partner unsuspended",
    "partner.tier.set": "Partner tier changed",
    "partner.payout.queued": "Payout queued",
    "partner.payout.paid": "Payout marked paid",
    "partner.payout.failed": "Payout marked failed",
    "partner.referral.attributed": "Referral attributed",
    "partner.referral.activated": "Referral started paying",
    "partner.referral.cancelled": "Referral cancelled",
    "subscription.trial_started": "Trial started",
    "subscription.activated": "Subscription activated",
    "subscription.cancelled": "Subscription cancelled",
    "subscription.early_payment_failure": "Early payment failure (review)",
    "customer.signed_up": "Customer signed up",
  };
  return labels[action] ?? action;
}
