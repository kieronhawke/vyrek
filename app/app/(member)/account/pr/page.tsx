import { assertMember } from "@/lib/member/auth";
import { PersonalRecordsScreen } from "@/components/member/screens/personal-records-screen";

export const dynamic = "force-dynamic";

export default async function PersonalRecordsPage() {
  await assertMember("/app/account/pr");
  return <PersonalRecordsScreen />;
}
