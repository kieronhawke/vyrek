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
import { customerJourney } from "@/lib/admin/journey";
import { subscriptionBilling } from "@/lib/billing/subscription-info";
import { paymentsForCustomer } from "@/lib/billing/payments";
import { plansForCustomer } from "@/lib/coach/data";
import { FitnessProfile } from "@/components/admin/fitness-profile";
import { CustomerActions } from "@/components/admin/customer-actions";
import { SubscriptionActions } from "@/components/admin/subscription-actions";
import { ExportPaymentsCsv } from "@/components/admin/export-payments";
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
  // These four reads only depend on the customer/subscription already
  // loaded, not on each other — so they run together rather than as a
  // waterfall of awaits.
  const [billing, payments, journey, memberMode, plans] = await Promise.all([
    // Live from Stripe: the rate, the pause state and the card. Null when
    // Stripe is unreachable — the page still renders its DB fields.
    latestSub?.stripe_subscription_id && latestSub.status !== "canceled"
      ? subscriptionBilling(latestSub.stripe_subscription_id)
      : Promise.resolve(null),
    customer.stripe_customer_id
      ? paymentsForCustomer(customer.stripe_customer_id)
      : Promise.resolve(null),
    // The rest of this person's story, joined by email: enquiries, calls,
    // links sent. One admin, one page per person.
    customerJourney(customer.email),
    // Which portal this client sees. Lives on the auth user, not the
    // customer row — null when they've never signed in.
    (async (): Promise<"billing" | "full" | null> => {
      if (!customer.auth_user_id) return null;
      try {
        const { data } = await supabaseAdmin().auth.admin.getUserById(
          customer.auth_user_id,
        );
        return data?.user?.user_metadata?.member_mode === "billing"
          ? "billing"
          : "full";
      } catch {
        /* Renders without the toggle. */
        return null;
      }
    })(),
    // This person's training plans, so the billing page doubles as a full
    // client view: what Ben has written and how long it runs.
    plansForCustomer(customer.id),
  ]);
  const lastPaid = payments?.find((p) => p.paid) ?? null;

  // Programme state. The latest SENT plan drives "how long are they
  // programmed for"; drafts are noted but never count as coverage.
  const sentPlans = plans.filter((p) => p.status === "sent");
  const currentPlan = sentPlans[0] ?? null;
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const daysLeft = currentPlan
    ? Math.floor(
        (new Date(`${currentPlan.weekStart}T00:00:00`).getTime() +
          currentPlan.days * 86_400_000 -
          todayMs) /
          86_400_000,
      )
    : null;
  const daysLeftLabel =
    daysLeft === null
      ? null
      : daysLeft < 0
        ? `Ran out ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} ago`
        : daysLeft === 0
          ? "Runs out today"
          : `${daysLeft} day${daysLeft === 1 ? "" : "s"} of programming left`;
  const daysLeftTone: "good" | "warn" | "bad" =
    daysLeft === null || daysLeft < 0
      ? "bad"
      : daysLeft <= 2
        ? "warn"
        : "good";
  const draftWaiting = plans.find((p) => p.status === "draft") ?? null;

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
              {/* All actions live in one place at the foot of the page —
                  this card stays purely informational. */}
            </>
          ) : (
            <p className="mt-3 text-sm text-suth-text-tertiary">
              No subscription yet.
            </p>
          )}
        </Card>
      </div>

      {/* Programme — what Ben has written for them, and how long it runs. */}
      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
            Programme
          </h2>
          <Link
            href={`/admin/plans/${customer.id}`}
            className="inline-flex h-10 items-center rounded-pill bg-suth-accent px-4 text-sm font-semibold text-[#0A0A0A] hover:bg-suth-accent-hover"
          >
            Open plan builder →
          </Link>
        </div>
        <Card>
          {currentPlan ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-suth-text">{currentPlan.title}</p>
                  <p className="mt-0.5 text-sm text-suth-text-tertiary">
                    Week of{" "}
                    {format(
                      new Date(`${currentPlan.weekStart}T00:00:00`),
                      "dd MMM yyyy",
                    )}{" "}
                    · {currentPlan.days} day{currentPlan.days === 1 ? "" : "s"}
                    {currentPlan.sentAtISO
                      ? ` · sent ${format(new Date(currentPlan.sentAtISO), "dd MMM yyyy")}`
                      : ""}
                  </p>
                </div>
                {daysLeftLabel ? (
                  <Badge tone={daysLeftTone}>{daysLeftLabel}</Badge>
                ) : null}
              </div>
              {draftWaiting ? (
                <p className="mt-3 text-sm text-amber-300">
                  A draft for &ldquo;{draftWaiting.title}&rdquo; is waiting to be sent.
                </p>
              ) : null}
            </>
          ) : draftWaiting ? (
            <p className="text-sm text-suth-text-secondary">
              No plan sent yet. A draft for &ldquo;{draftWaiting.title}&rdquo; is
              waiting in the builder.
            </p>
          ) : (
            <p className="text-sm text-suth-text-tertiary">
              No plan written yet. Open the plan builder to write their first week.
            </p>
          )}
        </Card>

        {sentPlans.length > 0 ? (
          <div className="mt-4">
            <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
              Recent sent plans
            </h3>
            <Table
              headers={["Plan", "Week", "Days", "Sent"]}
              empty="No plans sent yet."
              rows={sentPlans.slice(0, 8).map((p) => [
                <span key="t" className="text-suth-text">{p.title}</span>,
                format(new Date(`${p.weekStart}T00:00:00`), "dd MMM yyyy"),
                <span key="d" className="num">{p.days}</span>,
                p.sentAtISO
                  ? format(new Date(p.sentAtISO), "dd MMM yyyy")
                  : "-",
              ])}
            />
          </div>
        ) : null}
      </section>

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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
            Payment history
          </h2>
          {payments && payments.length > 0 ? (
            <ExportPaymentsCsv
              rows={payments}
              filename={`payments-${customer.email.split("@")[0]}.csv`}
            />
          ) : null}
        </div>
        {payments === null ? (
          <Card>
            <p className="text-sm text-suth-text-tertiary">
              {customer.stripe_customer_id
                ? "Couldn't reach Stripe just now. Refresh in a moment."
                : "No Stripe customer yet, so no payments to show."}
            </p>
          </Card>
        ) : (
          <Table
            headers={["Date", "For", "Amount", "Status", "Receipt"]}
            empty="No invoices yet."
            rows={payments.map((p) => [
              format(new Date(p.createdISO), "dd MMM yyyy"),
              <span key="d" className="text-suth-text-secondary">
                {p.description ?? "—"}
              </span>,
              <span key="a" className="font-mono">{gbp(p.amountPence)}</span>,
              <span key="s" className="inline-flex items-center gap-1.5">
                <Badge
                  tone={
                    p.refundedPence > 0
                      ? p.refundPending
                        ? "warn"
                        : "neutral"
                      : p.paid
                        ? "good"
                        : p.status === "open" && p.attempted
                          ? "bad"
                          : p.status === "open"
                            ? "warn"
                            : "neutral"
                  }
                >
                  {p.refundPending
                    ? `refund in progress · ${gbp(p.refundedPence)}`
                    : p.refundedPence >= p.amountPence && p.amountPence > 0
                      ? "refunded"
                      : p.refundedPence > 0
                        ? `refunded ${gbp(p.refundedPence)}`
                        : p.paid
                          ? "paid"
                          : p.status}
                </Badge>
              </span>,
              p.invoicePdf ? (
                <a
                  key="r"
                  href={p.invoicePdf}
                  className="text-xs text-suth-text-secondary underline-offset-4 hover:text-suth-accent hover:underline"
                >
                  Download ↓
                </a>
              ) : (
                <span key="r" className="text-xs text-suth-text-tertiary">
                  —
                </span>
              ),
            ])}
          />
        )}
      </section>

      {/* The whole story: enquiry → call → link → account, one page. */}
      {journey.enquiries.length > 0 ||
      journey.calls.length > 0 ||
      journey.invites.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
            How they got here
          </h2>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                Enquiries
              </p>
              {journey.enquiries.length === 0 ? (
                <p className="text-sm text-suth-text-tertiary">None on file.</p>
              ) : (
                <ul role="list" className="space-y-2">
                  {journey.enquiries.map((e) => (
                    <li key={e.id}>
                      <a
                        href={`/l/${e.id}`}
                        className="block rounded-lg border border-suth-border-subtle p-3 transition-colors hover:border-suth-border-strong"
                      >
                        <p className="text-sm text-suth-text">
                          {e.wants ?? e.goal ?? "Enquiry"}
                        </p>
                        <p className="mt-0.5 text-xs text-suth-text-tertiary">
                          {format(new Date(e.createdISO), "d MMM yyyy")}
                          {e.place ? ` · ${e.place}` : ""} · open →
                        </p>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                Calls with Ben
              </p>
              {journey.calls.length === 0 ? (
                <p className="text-sm text-suth-text-tertiary">None booked.</p>
              ) : (
                <ul role="list" className="space-y-2">
                  {journey.calls.map((c) => (
                    <li
                      key={c.ref}
                      className="rounded-lg border border-suth-border-subtle p-3"
                    >
                      <p className="text-sm text-suth-text">
                        {format(new Date(c.startsISO), "EEE d MMM yyyy, h:mmaaa")}
                      </p>
                      <p className="mt-0.5 text-xs text-suth-text-tertiary">
                        {c.minutes} min ·{" "}
                        {c.status === "cancelled" ? (
                          <span className="text-suth-danger">cancelled</span>
                        ) : new Date(c.startsISO) > new Date() ? (
                          "coming up"
                        ) : (
                          "happened"
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                Links sent
              </p>
              {journey.invites.length === 0 ? (
                <p className="text-sm text-suth-text-tertiary">None sent.</p>
              ) : (
                <ul role="list" className="space-y-2">
                  {journey.invites.map((inv) => (
                    <li
                      key={inv.id}
                      className="rounded-lg border border-suth-border-subtle p-3"
                    >
                      <p className="text-sm text-suth-text">
                        {inv.kind}
                        {inv.amountPence ? ` · ${gbp(inv.amountPence)}/mo` : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-suth-text-tertiary">
                        sent {format(new Date(inv.createdISO), "d MMM")} ·{" "}
                        {inv.openedISO
                          ? `opened ${format(new Date(inv.openedISO), "d MMM, h:mmaaa")}`
                          : "not opened"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </section>
      ) : null}

      {/* What Ben knows about them — the quiz answers, read back in plain
          English. The raw JSON stays underneath for completeness. */}
      <section className="mt-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          What Ben knows about them
        </h2>
        {latestQuiz ? (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-suth-text">
                Programme: {latestQuiz.program ?? "-"}
              </p>
              <span className="font-mono text-xs text-suth-text-tertiary">
                {latestQuiz.created_at
                  ? format(new Date(latestQuiz.created_at), "dd MMM yyyy, HH:mm")
                  : "-"}
              </span>
            </div>
            <div className="mt-4">
              <FitnessProfile answers={latestQuiz.answers} />
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary hover:text-suth-text-secondary">
                Raw answers
              </summary>
              <pre className="mt-3 max-h-96 overflow-auto rounded-md border border-suth-border-subtle bg-suth-base/40 p-4 text-xs leading-relaxed text-suth-text-secondary">
                {JSON.stringify(latestQuiz.answers, null, 2)}
              </pre>
            </details>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-suth-text-tertiary">
              No quiz response on file.
            </p>
          </Card>
        )}
      </section>
      {/* ── Every action on this customer, in one clear block ─────────
          The details above are for reading; this is for doing. On a phone
          each button is full width, so the thing to tap is unmissable. */}
      <section className="mt-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Actions for this customer
        </h2>

        {latestSub?.stripe_subscription_id && latestSub.status !== "canceled" ? (
          <Card>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
              Their subscription
            </p>
            <SubscriptionActions
              stripeSubscriptionId={latestSub.stripe_subscription_id}
              amountPence={billing?.amountPence ?? null}
              paused={billing?.paused ?? false}
              pauseResumesISO={billing?.pauseResumesISO ?? null}
              periodEndISO={
                billing?.currentPeriodEndISO ?? latestSub.current_period_end
              }
              lastPaymentPence={lastPaid?.amountPence ?? null}
              lastPaymentISO={lastPaid?.createdISO ?? null}
              clientLabel={customer.email.split("@")[0]}
            />
          </Card>
        ) : null}

        {latestSub?.status === "canceled" ? (
          <Card>
            <p className="text-sm text-suth-text-secondary">
              Their membership has ended. Want them back? Send a fresh
              payment link with their details already filled in.
            </p>
            <Link
              href={`/admin/clients?name=${encodeURIComponent(customer.email.split("@")[0])}&email=${encodeURIComponent(customer.email)}`}
              className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-pill bg-suth-accent px-5 text-sm font-semibold text-[#0A0A0A] hover:bg-suth-accent-hover sm:h-11 sm:w-auto"
            >
              Restart this client →
            </Link>
          </Card>
        ) : null}

        <div className="mt-4">
          <CustomerActions
            email={customer.email}
            stripeSubscriptionId={latestSub?.stripe_subscription_id ?? null}
          />
        </div>
      </section>

    </>
  );
}
