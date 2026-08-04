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
  /* The booking sheet posts to the same endpoint the public consultation
     form does, and that endpoint requires a name, an email and a number. The
     email is the one they signed in with; the phone is not stored yet, so the
     sheet asks for it rather than the booking failing on submit. */
  return (
    <CoachScreen
      firstName={state.facts.firstName ?? "there"}
      email={ctx.user.email}
    />
  );
}
