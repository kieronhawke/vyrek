import Link from "next/link";
import { assertMember } from "@/lib/member/auth";
import { ChangeRequestForm } from "@/components/member/change-request-form";

export const metadata = { title: "Request a change" };

/**
 * The conversation half of managing a subscription. Card, plan and
 * cancellation are self-serve in the Stripe portal; this is for the
 * requests that need Ben's judgement.
 */
export default async function RequestChangePage() {
  await assertMember("/app/account/change");

  return (
    <>
      <p className="eyebrow">Your account</p>
      <h1
        style={{
          fontSize: "var(--text-2xl)",
          lineHeight: 1.1,
          fontWeight: 800,
          letterSpacing: "-0.025em",
          margin: "var(--space-1) 0",
        }}
      >
        Request a change
      </h1>
      <p
        style={{
          margin: "0 0 var(--space-3)",
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
          lineHeight: 1.55,
        }}
      >
        Anything about your plan, your rate, pausing, or how you train — tell
        Ben in your own words and he&apos;ll sort it with you. For card
        changes or cancelling, use Manage billing on your{" "}
        <Link
          href="/app/account"
          style={{ color: "var(--accent-text)", textDecoration: "underline" }}
        >
          account page
        </Link>
        .
      </p>
      <ChangeRequestForm />
    </>
  );
}
