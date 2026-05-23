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
  user: { id: string; email: string };
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

  return { user: { id: user.id, email: user.email }, customer, programme, quizAnswers, subscription };
}
