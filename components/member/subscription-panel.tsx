import { format } from "date-fns";
import type { MemberContext } from "@/lib/member/auth";

function statusTone(status: string) {
  if (status === "active") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (status === "trialing") return "border-vyrek-accent/30 bg-vyrek-accent/10 text-vyrek-accent";
  if (status === "past_due") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-vyrek-border-subtle bg-vyrek-elevated text-vyrek-text-secondary";
}

export function MemberSubscriptionPanel({
  subscription,
}: {
  subscription: MemberContext["subscription"];
}) {
  if (!subscription) {
    return (
      <div className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5 text-center">
        <p className="text-sm text-vyrek-text-secondary">
          No active subscription. Start your free trial in three minutes.
        </p>
        <a
          href="/quiz"
          className="mt-4 inline-flex h-11 items-center justify-center rounded-pill bg-vyrek-accent px-5 text-sm font-semibold text-[#0A0A0A]"
        >
          Start trial →
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
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
            <dt className="text-vyrek-text-tertiary">Trial ends</dt>
            <dd className="text-vyrek-text">
              {format(new Date(subscription.trial_end), "dd MMM yyyy")}
            </dd>
          </div>
        ) : null}
        {subscription.current_period_end ? (
          <div className="flex justify-between gap-3">
            <dt className="text-vyrek-text-tertiary">Next bill</dt>
            <dd className="text-vyrek-text">
              {format(
                new Date(subscription.current_period_end),
                "dd MMM yyyy",
              )}{" "}
              · £8.99
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <dt className="text-vyrek-text-tertiary">Stripe subscription</dt>
          <dd className="font-mono text-xs text-vyrek-text">
            {subscription.stripe_subscription_id ?? "-"}
          </dd>
        </div>
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href="https://billing.stripe.com/p/login/test_28o5ms0vU3HhfTOaAA"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center rounded-pill border border-vyrek-border bg-vyrek-base px-4 text-sm text-vyrek-text"
        >
          Manage billing ↗
        </a>
        <a
          href="mailto:support@vyrek.com?subject=Subscription change"
          className="inline-flex h-10 items-center rounded-pill border border-vyrek-border bg-vyrek-base px-4 text-sm text-vyrek-text-secondary"
        >
          Email support
        </a>
      </div>
    </div>
  );
}
