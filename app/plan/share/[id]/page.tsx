import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  determineProgramme,
  determineStartDate,
  type QuizAnswers,
} from "@/lib/quiz-flow";
import { generateWeek1, type Plan } from "@/lib/plan-generator";
import { PlanReveal } from "@/components/plan/plan-reveal";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const metadata: Metadata = {
  title: "Vyrek plan",
  description:
    "A personalised Hyrox training plan from Vyrek. Want your own? Take the three-minute quiz.",
};

async function fetchSharedPlan(id: string): Promise<{
  answers: QuizAnswers;
  plan: Plan;
} | null> {
  if (!UUID_RE.test(id)) return null;
  try {
    const admin = supabaseAdmin();
    const { data: qr } = await admin
      .from("quiz_responses")
      .select("answers, program, customer_id")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!qr) return null;

    const answers = qr.answers as QuizAnswers & { raceDate?: string | null };
    if (answers.raceDate && typeof answers.raceDate === "string") {
      (answers as QuizAnswers).raceDate = new Date(answers.raceDate);
    }
    const programme = determineProgramme(answers);
    const startDate = determineStartDate();
    const plan = generateWeek1(answers, programme, startDate);
    return { answers: answers as QuizAnswers, plan };
  } catch {
    return null;
  }
}

export default async function PlanSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await fetchSharedPlan(id);
  if (!data) notFound();
  return (
    <PlanReveal
      variant="share"
      shareId={id}
      initialAnswers={data.answers}
      initialPlan={data.plan}
    />
  );
}
