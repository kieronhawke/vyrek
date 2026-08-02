import { assertMember } from "@/lib/member/auth";
import { programmeLabel } from "@/lib/member/demo";
import { PlanScreen } from "@/components/member/screens/plan-screen";

/** PLAN — auth boundary only; the screen renders in both mounts. */
export default async function MemberPlanPage() {
  const ctx = await assertMember("/app/plan");
  return <PlanScreen programme={programmeLabel(ctx.programme)} />;
}
