import { assertFullMember } from "@/lib/member/auth";
import { ComingSoon } from "@/components/member/screens/coming-soon";
import { NutritionScreen } from "@/components/member/screens/nutrition-screen";
import { NutritionEmpty } from "@/components/member/screens/empty-screens";
import { factsFromContext, resolveFirstRun } from "@/lib/member/first-run";

/** NUTRITION — targets come with the block, so they wait for it. */
export default async function MemberNutritionPage() {
  const ctx = await assertFullMember("/app/nutrition");
  if (ctx.locked) return <ComingSoon section="fuel" />;
  const state = resolveFirstRun(factsFromContext(ctx));
  if (state.stage !== "ready") return <NutritionEmpty />;
  return <NutritionScreen />;
}
