import { assertFullMember } from "@/lib/member/auth";
import { ComingSoon } from "@/components/member/screens/coming-soon";
import { programmeLabel } from "@/lib/member/demo";
import { PlanScreen } from "@/components/member/screens/plan-screen";
import { PlanEmpty } from "@/components/member/screens/empty-screens";
import { CoachPlanCard } from "@/components/member/coach-plan";
import { factsFromContext, resolveFirstRun } from "@/lib/member/first-run";

/** PLAN — auth boundary and the same first-run fork as Today. */
export default async function MemberPlanPage() {
  const ctx = await assertFullMember("/app/plan");
  if (ctx.locked) return <ComingSoon section="plan" />;

  // A plan Ben wrote personally outranks the generated programme, so it
  // renders first — and it renders even before first-run finishes,
  // because a coached client's week must never hide behind quiz state.
  const coachPlan = ctx.customer ? (
    <CoachPlanCard customerId={ctx.customer.id} />
  ) : null;

  const state = resolveFirstRun(factsFromContext(ctx));
  if (state.stage !== "ready") {
    return (
      <>
        {coachPlan}
        <PlanEmpty state={state} />
      </>
    );
  }
  return (
    <>
      {coachPlan}
      <PlanScreen programme={programmeLabel(ctx.programme)} />
    </>
  );
}
