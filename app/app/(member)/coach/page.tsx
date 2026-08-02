import { assertMember } from "@/lib/member/auth";
import { CoachScreen } from "@/components/member/screens/coach-screen";

/** ASK BEN — auth boundary only. */
export default async function MemberCoachPage() {
  await assertMember("/app/coach");
  return <CoachScreen />;
}
