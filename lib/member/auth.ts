import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Member auth gate for /app/*. Reads the Supabase Auth session +
 * resolves the customers row. Redirects unsigned visitors to /login
 * with a `next=` param so they bounce back after auth.
 *
 * Returns the auth user + the customer row (with subscription joined)
 * so per-page server components can render personalised content
 * without re-querying.
 */

export type MemberContext = {
  /** fullName comes from auth metadata — the name Ben typed on the invite.
   *  Falling back to the email's local part greeted a client who paid via
   *  someone else's inbox (or a plus-address) with the wrong name. */
  user: { id: string; email: string; fullName: string | null };
  /**
   * What this account can see. "billing" is an existing client moved onto
   * Stripe via a payment-only link: they manage their subscription and
   * nothing else, because their training already happens with Ben outside
   * the app. The admin flips them to "full" when their training space is
   * ready. Absent metadata means "full" — every account that existed
   * before this field did.
   */
  memberMode: "billing" | "full";
  customer: {
    id: string;
    email: string;
    stripe_customer_id: string | null;
    referral_code: string | null;
    created_at: string | null;
  } | null;
  programme: string | null; // first-race | sub-90 | doubles | pro
  quizAnswers: Record<string, unknown> | null;
  subscription: {
    id: string;
    status: string;
    trial_end: string | null;
    current_period_end: string | null;
    stripe_subscription_id: string | null;
  } | null;
};

/**
 * The gate for TRAINING pages. Billing-only clients — existing clients
 * moved onto Stripe via a payment link — bounce to their subscription
 * page rather than seeing training screens the admin hasn't switched on.
 */
export async function assertFullMember(
  pagePath = "/app",
): Promise<MemberContext> {
  const ctx = await assertMember(pagePath);
  if (ctx.memberMode === "billing") redirect("/app/account");
  return ctx;
}

export async function assertMember(
  pagePath = "/app",
): Promise<MemberContext> {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user || !user.email) {
    redirect(`/login?next=${encodeURIComponent(pagePath)}`);
  }

  // Look up the customers row + most recent quiz response + most recent
  // subscription in one admin pass. Customer auth_user_id is the foreign
  // key from the Supabase Auth user.
  const admin = supabaseAdmin();
  let customer: MemberContext["customer"] = null;
  let programme: string | null = null;
  let quizAnswers: Record<string, unknown> | null = null;
  let subscription: MemberContext["subscription"] = null;

  try {
    const { data: c } = await admin
      .from("customers")
      .select(
        "id, email, stripe_customer_id, referral_code, created_at",
      )
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (c) customer = c as MemberContext["customer"];

    if (customer) {
      const { data: q } = await admin
        .from("quiz_responses")
        .select("program, answers")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (q) {
        programme = (q as { program?: string }).program ?? null;
        quizAnswers =
          (q as { answers?: Record<string, unknown> }).answers ?? null;
      }

      const { data: s } = await admin
        .from("subscriptions")
        .select(
          "id, status, trial_end, current_period_end, stripe_subscription_id",
        )
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (s) subscription = s as MemberContext["subscription"];
    }
  } catch (err) {
    // If Supabase queries fail (e.g. migrations not applied), we still
    // let the user into the shell with empty context. The pages render
    // demo content so they're not blocked.
    console.warn("[member/auth] context load failed", err);
  }

  const fullName =
    typeof user.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : null;
  const memberMode =
    user.user_metadata?.member_mode === "billing" ? "billing" : "full";

  return {
    user: { id: user.id, email: user.email, fullName },
    memberMode,
    customer,
    programme,
    quizAnswers,
    subscription,
  };
}
