import { assertFullMember } from "@/lib/member/auth";
import { StationsScreen } from "@/components/member/screens/stations-screen";

export const dynamic = "force-dynamic";

/**
 * THE STATION TECHNIQUE LIBRARY.
 *
 * Markup lives in StationsScreen after the member-area rebuild; the page is
 * the gate. assertFullMember rather than assertMember because this hangs off
 * Plan — a billing-only client has no training tabs, so they go to their
 * subscription page instead of a library they were never given.
 */
export default async function StationsLibraryPage() {
  await assertFullMember("/app/plan/stations");
  return <StationsScreen />;
}
