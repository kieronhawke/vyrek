import { assertFullMember } from "@/lib/member/auth";
import { PersonalRecordsScreen } from "@/components/member/screens/personal-records-screen";

export const dynamic = "force-dynamic";

/**
 * PERSONAL RECORDS.
 *
 * The markup lives in PersonalRecordsScreen — the member area was rebuilt
 * around screen components, so the page is just the gate. And the gate is
 * assertFullMember, not assertMember: PRs are training data, and a
 * billing-only client (moved onto Stripe by payment link, training features
 * not yet switched on) bounces back to their subscription page rather than
 * landing on an empty numbers screen.
 */
export default async function PersonalRecordsPage() {
  await assertFullMember("/app/account/pr");
  return <PersonalRecordsScreen />;
}
