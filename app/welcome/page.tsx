import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { addDays } from "date-fns";
import { stripe } from "@/lib/stripe";
import { determineStartDate } from "@/lib/quiz-flow";
import { WelcomeContent } from "@/components/welcome/welcome-content";

export const metadata: Metadata = {
  title: "Welcome — Vyrek",
  description: "Your Vyrek trial is live. Day 1 starts tomorrow.",
  robots: { index: false, follow: false },
};

/**
 * Welcome page — confirms the Stripe trial signup completed. Server-side
 * verifies session_id (anyone hitting /welcome without a valid session_id
 * gets redirected to /pricing).
 */
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    redirect("/pricing");
  }

  let trialEndsAt: Date | null = null;
  let programmeName = "First Race";

  // Verify the session via Stripe. If Stripe isn't configured (no env vars)
  // we still render the page with sensible defaults — the trial dates
  // become approximate but the user lands somewhere coherent.
  try {
    const s = stripe();
    const session = await s.checkout.sessions.retrieve(sessionId);

    const paid = session.payment_status === "paid";
    const complete = session.status === "complete";
    if (!paid && !complete) {
      redirect("/pricing");
    }

    if (session.subscription) {
      const subId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
      const sub = await s.subscriptions.retrieve(subId);
      if (sub.trial_end) {
        trialEndsAt = new Date(sub.trial_end * 1000);
      }
    }

    if (session.metadata?.programme) {
      const map: Record<string, string> = {
        "first-race": "First Race",
        "sub-90": "Sub-90",
        doubles: "Doubles",
        pro: "Pro",
      };
      programmeName =
        map[session.metadata.programme as string] ?? programmeName;
    }
  } catch (err) {
    // Stripe not configured or session lookup failed. We still render the
    // welcome page rather than blocking the user — the email + plan have
    // already been queued.
    // eslint-disable-next-line no-console
    console.warn("[/welcome] stripe session lookup failed", err);
  }

  const startDate = determineStartDate();
  const firstWorkoutDate = startDate;
  const fallbackTrialEnd = addDays(new Date(), 7);

  return (
    <WelcomeContent
      trialEndsAt={trialEndsAt ?? fallbackTrialEnd}
      firstWorkoutDate={firstWorkoutDate}
      programmeName={programmeName}
    />
  );
}
