import { format } from "date-fns";
import Link from "next/link";
import type { MemberContext } from "@/lib/member/auth";
import { ManageBillingButton } from "@/components/member/manage-billing-button";

function statusTone(status: string) {
  if (status === "active") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (status === "trialing") return "border-suth-accent/30 bg-suth-accent/10 text-suth-accent";
  if (status === "past_due") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-suth-border-subtle bg-suth-elevated text-suth-text-secondary";
}

export function MemberSubscriptionPanel({
  subscription,
}: {
  subscription: MemberContext["subscription"];
}) {
  if (!subscription) {
    return (
      <div className="rounded-lg border border-suth-border-subtle bg-suth-elevated p-5 text-center">
        <p className="text-sm text-suth-text-secondary">
          No active subscription. Start your free trial in three minutes.
        </p>
        <Link
          href="/quiz"
          className="mt-4 inline-flex h-11 items-center justify-center rounded-pill bg-suth-accent px-5 text-sm font-semibold text-[#0A0A0A]"
        >
          Start trial →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-suth-border-subtle bg-suth-elevated p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Status
        </p>
        <span
          className={`inline-flex items-center rounded-pill border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${statusTone(subscription.status)}`}
        >
          {subscription.status}
        </span>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        {subscription.trial_end ? (
          <div className="flex justify-between gap-3">
            <dt className="text-suth-text-tertiary">Trial ends</dt>
            <dd className="text-suth-text">
              {format(new Date(subscription.trial_end), "dd MMM yyyy")}
            </dd>
          </div>
        ) : null}
        {subscription.current_period_end ? (
          <div className="flex justify-between gap-3">
            <dt className="text-suth-text-tertiary">Next bill</dt>
            <dd className="text-suth-text">
              {format(
                new Date(subscription.current_period_end),
                "dd MMM yyyy",
              )}{" "}
              · £8.99
            </dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        <ManageBillingButton />
        <a
          href="mailto:support@suthperformance.com?subject=Subscription change"
          className="inline-flex h-10 items-center rounded-pill border border-suth-border bg-suth-base px-4 text-sm text-suth-text-secondary"
        >
          Email support
        </a>
      </div>
    </div>
  );
}
