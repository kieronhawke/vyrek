import { assertMember } from "@/lib/member/auth";
import { ProgressScreen } from "@/components/member/screens/progress-screen";

/** PROGRESS — auth boundary only. */
export default async function MemberProgressPage() {
  await assertMember("/app/progress");
  return <ProgressScreen />;
}
