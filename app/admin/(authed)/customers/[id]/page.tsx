import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  PageHeader,
  Card,
  Badge,
  Table,
} from "@/components/admin/ui";
import { getCustomer } from "@/lib/admin/queries";
import { subscriptionBilling } from "@/lib/billing/subscription-info";
import { paymentsForCustomer } from "@/lib/billing/payments";
import { CancelSubscriptionButton } from "@/components/admin/cancel-subscription-button";
import { CustomerActions } from "@/components/admin/customer-actions";
import { SubscriptionManage } from "@/components/admin/subscription-manage";
import { MemberModeToggle } from "@/components/admin/member-mode-toggle";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripeDashboardUrl } from "@/lib/billing/stripe-dashboard";

function gbp(pence: number): string {
  return pence % 100 === 0
    ? `£${pence / 100}`
    : `£${(pence / 100).toFixed(2)}`;
}

export const dynamic = "force-dynamic";

function statusTone(status: string) {
  if (status === "active") return "good" as const;
  if (status === "trialing") return "accent" as const;
  if (status === "past_due") return "warn" as const;
  if (status === "canceled" || status === "incomplete_expired") return "bad" as const;
  return "neutral" as const;
}

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getCustomer(id);
  if (!res.ok) notFound();

  const { customer, subscriptions, quizResponses } = res.data;
  const latestSub = subscriptions[0];
  const latestQuiz = quizResponses[0];
  // Live from Stripe: the rate, the pause state and the card. Null when
  // Stripe is unreachable — the page still renders its DB fields.
  const billing =
    latestSub?.stripe_subscription_id && latestSub.status !== "canceled"
      ? await subscriptionBilling(latestSub.stripe_subscription_id)
      : null;
  const payments = customer.stripe_customer_id
    ? await paymentsForCustomer(customer.stripe_customer_id)
    : null;

  // Which portal this client sees. Lives on the auth user, not the
  // customer row — null when they've never signed in.
  let memberMode: "billing" | "full" | null = null;
  if (customer.auth_user_id) {
    try {
      const { data } = await supabaseAdmin().auth.admin.getUserById(
        customer.auth_user_id,
      );
      memberMode =
        data?.user?.user_metadata?.member_mode === "billing"
          ? "billing"
          : "full";
    } catch {
      /* Renders without the toggle. */
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Customer"
        title={customer.email}
        description={
          <>
            Created{" "}
            {customer.created_at
              ? format(new Date(customer.created_at), "dd MMM yyyy 'at' HH:mm")
              : "unknown"}
          </>
        }
        actions={
          <Link
            href="/admin/customers"
            className="inline-flex h-10 items-center rounded-pill border border-suth-border bg-suth-elevated px-4 text-sm text-suth-text"
          >
            ← Back to all
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
            Account
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-suth-text-tertiary">Customer ID</dt>
              <dd className="font-mono text-xs text-suth-text">{customer.id}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-suth-text-tertiary">Stripe customer</dt>
              <dd className="font-mono text-xs text-suth-text">
                {customer.stripe_customer_id ? (
                  <a
                    href={stripeDashboardUrl("customer", customer.stripe_customer_id)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-suth-accent underline-offset-4 hover:underline"
                  >
                    {customer.stripe_customer_id} ↗
                  </a>
                ) : (
                  "-"
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-suth-text-tertiary">Referral code</dt>
              <dd className="font-mono text-xs text-suth-text">
                {customer.referral_code ?? "-"}
              </dd>
            </div>
          </dl>
          {memberMode ? (
            <div className="mt-4 border-t border-suth-border-subtle pt-4">
              <MemberModeToggle customerId={customer.id} mode={memberMode} />
            </div>
          ) : null}
        </Card>

        <Card>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
            Latest subscription
          </p>
          {latestSub ? (
            <>
              <p className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={statusTone(latestSub.status)}>{latestSub.status}</Badge>
                {billing?.paused ? <Badge tone="warn">collection paused</Badge> : null}
                {billing?.cancelAtPeriodEnd ? (
                  <Badge tone="warn">cancels at period end</Badge>
                ) : null}
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                {billing?.amountPence ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-suth-text-tertiary">Monthly rate</dt>
                    <dd className="num text-suth-text">
                      {gbp(billing.amountPence)}/{billing.interval}
                    </dd>
                  </div>
                ) : null}
                {billing?.paymentMethod ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-suth-text-tertiary">Payment method</dt>
                    <dd className="text-suth-text">{billing.paymentMethod}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <dt className="text-suth-text-tertiary">Trial ends</dt>
                  <dd className="text-suth-text">
                    {latestSub.trial_end
                      ? format(new Date(latestSub.trial_end), "dd MMM yyyy")
                      : "-"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-suth-text-tertiary">Current period end</dt>
                  <dd className="text-suth-text">
                    {latestSub.current_period_end
                      ? format(new Date(latestSub.current_period_end), "dd MMM yyyy")
                      : "-"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-suth-text-tertiary">Stripe sub</dt>
                  <dd className="font-mono text-xs text-suth-text">
                    {latestSub.stripe_subscription_id ? (
                      <a
                        href={stripeDashboardUrl(
                          "subscription",
                          latestSub.stripe_subscription_id,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="text-suth-accent underline-offset-4 hover:underline"
                      >
                        {latestSub.stripe_subscription_id} ↗
                      </a>
                    ) : (
                      "-"
                    )}
                  </dd>
                </div>
              </dl>
              {latestSub.stripe_subscription_id &&
              latestSub.status !== "canceled" ? (
                <div className="mt-4 space-y-4 border-t border-suth-border-subtle pt-4">
                  <SubscriptionManage
                    stripeSubscriptionId={latestSub.stripe_subscription_id}
                    amountPence={billing?.amountPence ?? null}
                    paused={billing?.paused ?? false}
                    pauseResumesISO={billing?.pauseResumesISO ?? null}
                  />
                  <CancelSubscriptionButton
                    stripeSubscriptionId={latestSub.stripe_subscription_id}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-sm text-suth-text-tertiary">
              No subscription yet.
            </p>
          )}
        </Card>
      </div>

      {/* Subscription history */}
      <section className="mt-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Subscription history
        </h2>
        <Table
          headers={["Status", "Trial end", "Period end", "Stripe sub", "Created"]}
          empty="No subscriptions."
          rows={subscriptions.map((s) => [
            <Badge key="s" tone={statusTone(s.status)}>{s.status}</Badge>,
            s.trial_end ? format(new Date(s.trial_end), "dd MMM yyyy") : "-",
            s.current_period_end
              ? format(new Date(s.current_period_end), "dd MMM yyyy")
              : "-",
            <span key="ss" className="font-mono text-xs text-suth-text-secondary">
              {s.stripe_subscription_id ?? "-"}
            </span>,
            s.created_at
              ? format(new Date(s.created_at), "dd MMM yyyy, HH:mm")
              : "-",
          ])}
        />
      </section>

      {/* Payment history, live from Stripe */}
      <section className="mt-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Payment history
        </h2>
        {payments === null ? (
          <Card>
            <p className="text-sm text-suth-text-tertiary">
              {customer.stripe_customer_id
                ? "Couldn't reach Stripe just now — refresh in a moment."
                : "No Stripe customer yet, so no payments to show."}
            </p>
          </Card>
        ) : (
          <Table
            headers={["Date", "For", "Amount", "Status"]}
            empty="No invoices yet."
            rows={payments.map((p) => [
              format(new Date(p.createdISO), "dd MMM yyyy"),
              <span key="d" className="text-suth-text-secondary">
                {p.description ?? "—"}
              </span>,
              <span key="a" className="font-mono">{gbp(p.amountPence)}</span>,
              <Badge
                key="s"
                tone={
                  p.paid
                    ? "good"
                    : p.status === "open" && p.attempted
                      ? "bad"
                      : p.status === "open"
                        ? "warn"
                        : "neutral"
                }
              >
                {p.paid ? "paid" : p.status}
              </Badge>,
            ])}
          />
        )}
      </section>

      {/* Customer actions */}
      <section className="mt-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Account actions
        </h2>
        <CustomerActions
          email={customer.email}
          stripeSubscriptionId={latestSub?.stripe_subscription_id ?? null}
        />
      </section>

      {/* Latest quiz response */}
      <section className="mt-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Latest quiz response
        </h2>
        {latestQuiz ? (
          <Card>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-suth-text">
                Programme: {latestQuiz.program ?? "-"}
              </p>
              <span className="font-mono text-xs text-suth-text-tertiary">
                {latestQuiz.created_at
                  ? format(new Date(latestQuiz.created_at), "dd MMM yyyy, HH:mm")
                  : "-"}
              </span>
            </div>
            <pre className="mt-4 max-h-96 overflow-auto rounded-md border border-suth-border-subtle bg-suth-base/40 p-4 text-xs leading-relaxed text-suth-text-secondary">
              {JSON.stringify(latestQuiz.answers, null, 2)}
            </pre>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-suth-text-tertiary">
              No quiz response on file.
            </p>
          </Card>
        )}
      </section>
    </>
  );
}
