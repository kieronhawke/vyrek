import { assertFullMember } from "@/lib/member/auth";
import { NutritionScreen } from "@/components/member/screens/nutrition-screen";
import { NutritionEmpty } from "@/components/member/screens/empty-screens";
import { factsFromContext, resolveFirstRun } from "@/lib/member/first-run";

/** NUTRITION — targets come with the block, so they wait for it. */
export default async function MemberNutritionPage() {
  const ctx = await assertFullMember("/app/nutrition");
  const state = resolveFirstRun(factsFromContext(ctx));
  if (state.stage !== "ready") return <NutritionEmpty />;
  return <NutritionScreen />;
}
