import { assertFullMember } from "@/lib/member/auth";
import { ComingSoon } from "@/components/member/screens/coming-soon";
import { ProgressScreen } from "@/components/member/screens/progress-screen";
import { ProgressEmpty } from "@/components/member/screens/empty-screens";
import { factsFromContext, resolveFirstRun } from "@/lib/member/first-run";

/** PROGRESS — nothing to chart until sessions are logged. */
export default async function MemberProgressPage() {
  const ctx = await assertFullMember("/app/progress");
  if (ctx.locked) return <ComingSoon section="progress" />;
  const state = resolveFirstRun(factsFromContext(ctx));
  if (state.facts.loggedSessions === 0) return <ProgressEmpty />;
  return <ProgressScreen />;
}
