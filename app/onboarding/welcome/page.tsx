import type { Metadata } from "next";
import "@/app/onboarding.css";
import { stripe } from "@/lib/stripe";
import { OnboardingWelcome } from "@/components/onboarding/welcome";

export const metadata: Metadata = {
  title: "You're in · Suth Performance",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * After the card.
 *
 * Verified against Stripe rather than trusting the redirect: anybody can type
 * this URL, and telling somebody their subscription is live when it is not is
 * the worst possible thing this page could do. If Stripe cannot be reached the
 * page still welcomes them — they did just pay — but says the confirmation is
 * still coming rather than inventing one.
 */
export default async function OnboardingWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  let name = "";
  let planName = "";
  let confirmed = false;
  let trialing = false;
  let billingOnly = false;
  let amountPence: number | null = null;
  let dueTodayPence: number | null = null;
  let startsOn: string | null = null;

  if (sessionId) {
    try {
      const session = await stripe().checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
      });
      /* `payment_status` is "no_payment_required" — NOT "paid" — whenever the
         first charge is deferred to a start date, because the session total is £0.
         `status === "complete"` is what actually means "they finished and the
         card is on file", and it is true in both cases. */
      confirmed =
        session.payment_status === "paid" ||
        session.payment_status === "no_payment_required" ||
        session.status === "complete";
      name = String(session.metadata?.client_name ?? "");
      planName = String(session.metadata?.plan ?? "");
      billingOnly = session.metadata?.onboarding === "payment";
      /* Both are stamped on the SESSION by the checkout route, not only on the
         subscription, precisely so this page can say what will be charged and
         when without a second round trip to Stripe. */
      const pence = Number(session.metadata?.amount_pence);
      amountPence = Number.isFinite(pence) && pence > 0 ? pence : null;
      const due = Number(session.metadata?.due_today_pence);
      dueTodayPence = Number.isFinite(due) && due > 0 ? due : null;
      startsOn = session.metadata?.starts_on ?? null;
      const sub = session.subscription;
      trialing = typeof sub === "object" && sub !== null && sub.status === "trialing";
    } catch {
      // Stripe unreachable. They still paid; the page says the confirmation
      // is on its way rather than claiming one it cannot see.
      confirmed = false;
    }
  }

  return (
    <OnboardingWelcome
      sessionId={sessionId}
      name={name}
      planKey={planName}
      confirmed={confirmed}
      trialing={trialing}
      hadSession={Boolean(sessionId)}
      billingOnly={billingOnly}
      amountPence={amountPence}
      dueTodayPence={dueTodayPence}
      startsOn={startsOn}
    />
  );
}
