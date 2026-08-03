import { assertMember } from "@/lib/member/auth";
import { CoachScreen } from "@/components/member/screens/coach-screen";
import { CoachEmpty } from "@/components/member/screens/empty-screens";
import { factsFromContext, resolveFirstRun } from "@/lib/member/first-run";

/** ASK BEN — an empty thread is an invitation, not a fault. */
export default async function MemberCoachPage() {
  const ctx = await assertMember("/app/coach");
  const state = resolveFirstRun(factsFromContext(ctx));
  if (state.stage !== "ready") {
    return <CoachEmpty firstName={state.facts.firstName} />;
  }
  return <CoachScreen />;
}
