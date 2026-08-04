import { assertMember } from "@/lib/member/auth";
import { StationsScreen } from "@/components/member/screens/stations-screen";

export const dynamic = "force-dynamic";

export default async function StationsLibraryPage() {
  await assertMember("/app/plan/stations");
  return <StationsScreen />;
}
