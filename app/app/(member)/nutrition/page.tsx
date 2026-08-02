import { assertMember } from "@/lib/member/auth";
import { NutritionScreen } from "@/components/member/screens/nutrition-screen";

/** NUTRITION — auth boundary only. */
export default async function MemberNutritionPage() {
  await assertMember("/app/nutrition");
  return <NutritionScreen />;
}
