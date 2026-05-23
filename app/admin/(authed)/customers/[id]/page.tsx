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
import { CancelSubscriptionButton } from "@/components/admin/cancel-subscription-button";
import { CustomerActions } from "@/components/admin/customer-actions";

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
            className="inline-flex h-10 items-center rounded-pill border border-vyrek-border bg-vyrek-elevated px-4 text-sm text-vyrek-text"
          >
            ← Back to all
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            Account
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-vyrek-text-tertiary">Customer ID</dt>
              <dd className="font-mono text-xs text-vyrek-text">{customer.id}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-vyrek-text-tertiary">Stripe customer</dt>
              <dd className="font-mono text-xs text-vyrek-text">
                {customer.stripe_customer_id ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-vyrek-text-tertiary">Referral code</dt>
              <dd className="font-mono text-xs text-vyrek-text">
                {customer.referral_code ?? "—"}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            Latest subscription
          </p>
          {latestSub ? (
            <>
              <p className="mt-3">
                <Badge tone={statusTone(latestSub.status)}>{latestSub.status}</Badge>
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-vyrek-text-tertiary">Trial ends</dt>
                  <dd className="text-vyrek-text">
                    {latestSub.trial_end
                      ? format(new Date(latestSub.trial_end), "dd MMM yyyy")
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-vyrek-text-tertiary">Current period end</dt>
                  <dd className="text-vyrek-text">
                    {latestSub.current_period_end
                      ? format(new Date(latestSub.current_period_end), "dd MMM yyyy")
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-vyrek-text-tertiary">Stripe sub</dt>
                  <dd className="font-mono text-xs text-vyrek-text">
                    {latestSub.stripe_subscription_id ?? "—"}
                  </dd>
                </div>
              </dl>
              {latestSub.stripe_subscription_id &&
              latestSub.status !== "canceled" ? (
                <div className="mt-4 border-t border-vyrek-border-subtle pt-4">
                  <CancelSubscriptionButton
                    stripeSubscriptionId={latestSub.stripe_subscription_id}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-sm text-vyrek-text-tertiary">
              No subscription yet.
            </p>
          )}
        </Card>
      </div>

      {/* Subscription history */}
      <section className="mt-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          Subscription history
        </h2>
        <Table
          headers={["Status", "Trial end", "Period end", "Stripe sub", "Created"]}
          empty="No subscriptions."
          rows={subscriptions.map((s) => [
            <Badge key="s" tone={statusTone(s.status)}>{s.status}</Badge>,
            s.trial_end ? format(new Date(s.trial_end), "dd MMM yyyy") : "—",
            s.current_period_end
              ? format(new Date(s.current_period_end), "dd MMM yyyy")
              : "—",
            <span key="ss" className="font-mono text-xs text-vyrek-text-secondary">
              {s.stripe_subscription_id ?? "—"}
            </span>,
            s.created_at
              ? format(new Date(s.created_at), "dd MMM yyyy, HH:mm")
              : "—",
          ])}
        />
      </section>

      {/* Customer actions */}
      <section className="mt-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          Account actions
        </h2>
        <CustomerActions
          email={customer.email}
          stripeSubscriptionId={latestSub?.stripe_subscription_id ?? null}
        />
      </section>

      {/* Latest quiz response */}
      <section className="mt-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          Latest quiz response
        </h2>
        {latestQuiz ? (
          <Card>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-vyrek-text">
                Programme: {latestQuiz.program ?? "—"}
              </p>
              <span className="font-mono text-xs text-vyrek-text-tertiary">
                {latestQuiz.created_at
                  ? format(new Date(latestQuiz.created_at), "dd MMM yyyy, HH:mm")
                  : "—"}
              </span>
            </div>
            <pre className="mt-4 max-h-96 overflow-auto rounded-md border border-vyrek-border-subtle bg-vyrek-base/40 p-4 text-xs leading-relaxed text-vyrek-text-secondary">
              {JSON.stringify(latestQuiz.answers, null, 2)}
            </pre>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-vyrek-text-tertiary">
              No quiz response on file.
            </p>
          </Card>
        )}
      </section>
    </>
  );
}
