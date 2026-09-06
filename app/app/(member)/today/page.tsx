import { assertFullMember } from "@/lib/member/auth";
import { ComingSoon } from "@/components/member/screens/coming-soon";
import { programmeLabel } from "@/lib/member/demo";
import { TodayScreen } from "@/components/member/screens/today-screen";
import { FirstRunScreen } from "@/components/member/screens/first-run-screen";
import { factsFromContext, resolveFirstRun } from "@/lib/member/first-run";

/**
 * TODAY — the tab the app opens on.
 *
 * The page is the auth boundary and the fork: a member with no published
 * week gets the first-run screen rather than TodayScreen, which renders
 * DEMO_* constants. Before this, somebody who paid an hour ago opened the
 * app and read a stranger's Tuesday threshold session as though it were
 * their own.
 */
export default async function TodayPage() {
  const ctx = await assertFullMember("/app/today");
  if (ctx.locked) return <ComingSoon section="today" />;
  const state = resolveFirstRun(factsFromContext(ctx));

  if (state.stage !== "ready") {
    return <FirstRunScreen state={state} />;
  }

  const firstName = state.facts.firstName ?? "athlete";
  return (
    <TodayScreen firstName={firstName} programme={programmeLabel(ctx.programme)} />
  );
}
