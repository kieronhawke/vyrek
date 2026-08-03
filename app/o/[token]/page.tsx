import type { Metadata } from "next";
import "@/app/onboarding.css";
import { resolveInvite } from "@/lib/onboarding/resolve";
import { OnboardingFlow } from "@/components/onboarding/flow";
import { InviteProblem } from "@/components/onboarding/invite-problem";

export const metadata: Metadata = {
  title: "Set up your account · Suth Performance",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * The short path, because the link travels by text message.
 *
 * `/onboarding/` is eleven characters that Ben pays for on every invite, and
 * at three segments those characters were real money. This is the same screen
 * behind a shorter door; /onboarding/[token] stays so links already in
 * somebody's messages keep working.
 */
export default async function ShortOnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ step?: string; cancelled?: string }>;
}) {
  const { token } = await params;
  const { step, cancelled } = await searchParams;

  // Accepts a short id or a signed token — see lib/onboarding/resolve.ts.
  const read = await resolveInvite(token);
  if (!read.ok) return <InviteProblem reason={read.reason} />;

  return (
    <OnboardingFlow
      token={token}
      invite={read.invite}
      startStep={step}
      cancelled={cancelled === "1"}
    />
  );
}
