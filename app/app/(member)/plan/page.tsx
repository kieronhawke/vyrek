import { assertMember } from "@/lib/member/auth";
import { programmeLabel } from "@/lib/member/demo";
import { PlanScreen } from "@/components/member/screens/plan-screen";
import { PlanEmpty } from "@/components/member/screens/empty-screens";
import { factsFromContext, resolveFirstRun } from "@/lib/member/first-run";

/** PLAN — auth boundary and the same first-run fork as Today. */
export default async function MemberPlanPage() {
  const ctx = await assertMember("/app/plan");
  const state = resolveFirstRun(factsFromContext(ctx));
  if (state.stage !== "ready") return <PlanEmpty state={state} />;
  return <PlanScreen programme={programmeLabel(ctx.programme)} />;
}
