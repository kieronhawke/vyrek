import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Answers } from "./model";

/**
 * NOTHING IS ASKED THAT THE BUSINESS ALREADY KNOWS.
 *
 * Somebody who has done the quiz already told us their goal, their days,
 * and exactly what is wrong with their knee, layer by layer. Making them
 * type it all again in onboarding says nobody read it the first time.
 *
 * So the onboarding pages look up the latest quiz response for the
 * invite's email and seed the answers. Everything stays editable; the
 * screens are confirmations rather than blank forms.
 *
 * Degrades to {} on anything unexpected: a prefill must never be the
 * reason an invite link fails to open.
 */

const GOAL_TEXT: Record<string, string> = {
  "lose-weight": "Lose weight and feel better for it",
  "get-stronger": "Get stronger",
  "more-energy": "More energy day to day",
  confidence: "Feel confident in myself again",
  "family-health": "Be fit and healthy for my family",
};

export async function quizPrefill(email: string): Promise<Partial<Answers>> {
  const key = email.trim().toLowerCase();
  if (!key) return {};

  try {
    const { data } = await supabaseAdmin()
      .from("quiz_responses")
      .select("answers, created_at")
      .ilike("email", key)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const a = (data as { answers?: Record<string, unknown> } | null)?.answers;
    if (!a) return {};

    const out: Partial<Answers> = {};

    // Goal: the quiz stores an enum; onboarding wants their own words, so
    // the enum becomes a sentence they can edit.
    const goal = typeof a.goal === "string" ? GOAL_TEXT[a.goal] : undefined;
    if (goal) out.goal = goal;

    // Days a week, if they told the quiz.
    const days = typeof a.days === "number" ? a.days : Number(a.days);
    if (Number.isFinite(days) && days >= 1 && days <= 7) {
      out.trainingDays = days;
    }

    // Experience: quiz values map onto the onboarding's three bands.
    const exp = typeof a.experience === "string" ? a.experience : "";
    if (exp === "never" || exp === "signed-up") out.experience = "first";
    else if (exp === "raced-few") out.experience = "some";
    else if (exp) out.experience = "experienced";

    // The layered injury answer, carried over intact.
    const injury = typeof a.injuries === "string" ? a.injuries : "";
    if (injury && injury !== "none") {
      out.injuryAreas = [injury];
      out.injuryDetails = {
        [injury]: {
          recency: typeof a.injuryRecency === "string" ? a.injuryRecency : "",
          care: typeof a.injuryCare === "string" ? a.injuryCare : "",
          triggers: Array.isArray(a.injuryTriggers)
            ? (a.injuryTriggers as string[]).map(String)
            : [],
          note: "",
        },
      };
    } else if (injury === "none") {
      out.injuryAreas = ["none"];
    }

    return out;
  } catch {
    return {};
  }
}
