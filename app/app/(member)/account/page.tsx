import { assertMember } from "@/lib/member/auth";
import { programmeLabel } from "@/lib/member/demo";
import { AccountScreen } from "@/components/member/screens/account-screen";
import { factsFromContext, resolveFirstRun } from "@/lib/member/first-run";
import { subscriptionBilling } from "@/lib/billing/subscription-info";

/**
 * ACCOUNT — the auth boundary. The screen itself is in
 * components/member/screens so the ungated preview can render it too.
 */
export default async function MemberAccountPage() {
  const ctx = await assertMember("/app/account");
  const email = ctx.user.email;
  const firstName =
    ctx.user.fullName?.split(/\s+/)[0] ||
    (email
      .replace(/@.*/, "")
      .split(/[\W_]+/)[0]
      ?.replace(/^./, (c) => c.toUpperCase()) ??
      "Athlete");

  const state = resolveFirstRun(factsFromContext(ctx));
  const joined = state.facts.joinedAt;

  // The rate and plan name live in Stripe alone; the DB mirror only has
  // status and period end. Null (Stripe down, no sub) degrades the screen
  // to its DB fields rather than failing it.
  const billing =
    ctx.subscription?.stripe_subscription_id &&
    ctx.subscription.status !== "canceled"
      ? await subscriptionBilling(ctx.subscription.stripe_subscription_id)
      : null;

  return (
    <AccountScreen
      mode={ctx.memberMode}
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
              current_period_end:
                billing?.currentPeriodEndISO ??
                ctx.subscription.current_period_end,
              planName: billing?.productName ?? null,
              amountPence: billing?.amountPence ?? null,
              paused: billing?.paused ?? false,
              cancelAtPeriodEnd: billing?.cancelAtPeriodEnd ?? false,
            }
          : null
      }
    />
  );
}
