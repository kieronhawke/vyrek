import type { Metadata } from "next";
import "@/app/onboarding.css";
import { resolveInvite } from "@/lib/onboarding/resolve";
import { OnboardingFlow } from "@/components/onboarding/flow";
import { InviteProblem } from "@/components/onboarding/invite-problem";

export const metadata: Metadata = {
  title: "Set up your account · Suth Performance",
  // Never indexed: the URL is the invite.
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * The link Ben sends.
 *
 * The token is verified on the server before anything renders, so a tampered
 * or expired link never reaches the flow — and the three failures are told
 * apart, because "this expired, ask Ben for another" and "this link got
 * mangled by your text message" are different things to do about it.
 */
export default async function OnboardingPage({
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
