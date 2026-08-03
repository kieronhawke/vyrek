import { assertMember } from "@/lib/member/auth";
import { programmeLabel } from "@/lib/member/demo";
import { AccountScreen } from "@/components/member/screens/account-screen";
import { factsFromContext, resolveFirstRun } from "@/lib/member/first-run";

/**
 * ACCOUNT — the auth boundary. The screen itself is in
 * components/member/screens so the ungated preview can render it too.
 */
export default async function MemberAccountPage() {
  const ctx = await assertMember("/app/account");
  const email = ctx.user.email;
  const firstName =
    email
      .replace(/@.*/, "")
      .split(/[\W_]+/)[0]
      ?.replace(/^./, (c) => c.toUpperCase()) ?? "Athlete";

  const state = resolveFirstRun(factsFromContext(ctx));
  const joined = state.facts.joinedAt;

  return (
    <AccountScreen
      sessionsLogged={state.facts.loggedSessions}
      blockWeek={state.facts.publishedWeeks}
      memberSince={
        joined
          ? joined.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
          : null
      }
      firstName={firstName}
      email={email}
      programme={programmeLabel(ctx.programme)}
      subscription={
        ctx.subscription
          ? {
              status: ctx.subscription.status,
              current_period_end: ctx.subscription.current_period_end,
            }
          : null
      }
    />
  );
}
