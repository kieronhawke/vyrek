import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  generateWeek1,
  generateWeekN,
  type Plan,
} from "@/lib/plan-generator";
import {
  determineProgramme,
  determineStartDate,
  type QuizAnswers,
} from "@/lib/quiz-flow";

/**
 * Plan-by-week endpoint with server-side paywall.
 *
 * - Week 1: returns the plan as long as the caller has a Supabase session
 *   AND a saved quiz response. (Public via the share route, not this one.)
 * - Weeks 2-12: requires `trialing` or `active` subscription.
 *
 * Critical: this is the ONLY way client code ever sees Weeks 2-12 workouts.
 * Never bundle generateWeekN output into a client component.
 */

const ALLOWED_STATUSES = new Set(["trialing", "active", "past_due"]);

export async function GET(
  _req: Request,
  context: { params: Promise<{ week: string }> },
) {
  const { week: weekParam } = await context.params;
  const week = parseInt(weekParam, 10);
  if (!Number.isFinite(week) || week < 1 || week > 12) {
    return NextResponse.json(
      { error: "INVALID_WEEK" },
      { status: 400 },
    );
  }

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "AUTH_REQUIRED" },
      { status: 401 },
    );
  }

  const admin = supabaseAdmin();

  const { data: customer } = await admin
    .from("customers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!customer) {
    return NextResponse.json(
      { error: "CUSTOMER_NOT_FOUND" },
      { status: 404 },
    );
  }

  // Subscription gating for weeks 2-12.
  if (week > 1) {
    const { data: sub } = await admin
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub || !ALLOWED_STATUSES.has(sub.status)) {
      return NextResponse.json(
        { error: "SUBSCRIPTION_REQUIRED" },
        { status: 402 },
      );
    }
  }

  // Read the latest quiz response (answers) for plan generation.
  const { data: qr } = await admin
    .from("quiz_responses")
    .select("answers, program")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!qr) {
    return NextResponse.json(
      { error: "NO_QUIZ_RESPONSE" },
      { status: 404 },
    );
  }

  const answers = qr.answers as QuizAnswers & {
    raceDate?: string | null;
  };
  if (answers.raceDate && typeof answers.raceDate === "string") {
    (answers as QuizAnswers).raceDate = new Date(answers.raceDate);
  }

  const programme = determineProgramme(answers);
  const startDate = determineStartDate();

  const plan: Plan =
    week === 1
      ? generateWeek1(answers, programme, startDate)
      : generateWeekN(answers, programme, week, startDate);

  return NextResponse.json({ ok: true, plan });
}
