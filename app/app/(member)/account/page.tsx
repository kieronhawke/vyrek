import { assertMember } from "@/lib/member/auth";
import { programmeLabel } from "@/lib/member/demo";
import { AccountScreen } from "@/components/member/screens/account-screen";

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

  return (
    <AccountScreen
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
