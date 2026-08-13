import Link from "next/link";
import { format } from "date-fns";
import { PageHeader, Badge, Card, Stat, Table } from "@/components/admin/ui";
import {
  recentPayments,
  paymentsForMonth,
  liveMrrPence,
  forecastThisMonthPence,
} from "@/lib/billing/payments";
import { stripeDashboardUrl } from "@/lib/billing/stripe-dashboard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Payments" };

function gbp(pence: number): string {
  // Whole pounds on tiles; the table keeps exact amounts via gbpExact.
  return `£${Math.round(pence / 100).toLocaleString("en-GB")}`;
}

function gbpExact(pence: number): string {
  return `£${(pence / 100).toLocaleString("en-GB", {
    minimumFractionDigits: pence % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusTone(row: { status: string; paid: boolean; attempted: boolean }) {
  if (row.paid) return "good" as const;
  if (row.status === "open" && row.attempted) return "bad" as const; // failed, retrying
  if (row.status === "open") return "warn" as const; // awaiting payment
  if (row.status === "uncollectible") return "bad" as const;
  return "neutral" as const;
}

function statusLabel(row: {
  status: string;
  paid: boolean;
  attempted: boolean;
  nextAttemptISO: string | null;
}) {
  if (row.paid) return "paid";
  if (row.status === "open" && row.attempted) {
    return row.nextAttemptISO
      ? `failed · retry ${format(new Date(row.nextAttemptISO), "dd MMM")}`
      : "failed";
  }
  return row.status;
}

/**
 * THE MONEY, FROM THE SOURCE.
 *
 * Every invoice Stripe has raised, newest first, with the failures and
 * the open ones counted at the top — the two numbers that decide whether
 * Ben needs to chase anyone today. Read live from Stripe, not a mirror.
 */
export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const monthKey = (y: number, mIdx: number) =>
    `${y}-${String(mIdx + 1).padStart(2, "0")}`;
  const currentKey = monthKey(now.getFullYear(), now.getMonth());
  // ?month=2026-07 browses a past month; anything malformed, in the
  // future, or absent lands on the live view of this month.
  const requested = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month ?? "")
    ? sp.month!
    : currentKey;
  const viewKey = requested > currentKey ? currentKey : requested;
  const isCurrent = viewKey === currentKey;
  const [viewYear, viewMonth1] = viewKey.split("-").map(Number);
  const viewStart = new Date(viewYear, viewMonth1 - 1, 1);
  const prevStart = new Date(viewYear, viewMonth1 - 2, 1);
  const nextStart = new Date(viewYear, viewMonth1, 1);
  const monthName = (d: Date) => format(d, "MMMM yyyy");

  const [payments, mrr] = await Promise.all([
    isCurrent
      ? recentPayments(60)
      : paymentsForMonth(viewYear, viewMonth1 - 1),
    isCurrent ? liveMrrPence() : Promise.resolve(null),
  ]);
  let forecast: number | null = null;

  if (payments === null) {
    return (
      <>
        <PageHeader
          eyebrow="Members"
          title="Payments"
          description="Every invoice, live from Stripe."
        />
        <Card>
          <p className="text-sm text-suth-text-secondary">
            Couldn&apos;t reach Stripe just now. Refresh in a moment. Nothing
            is wrong with the subscriptions themselves.
          </p>
        </Card>
      </>
    );
  }

  const failed = payments.filter((p) => !p.paid && p.attempted && p.status === "open");
  const openInvoices = payments.filter((p) => !p.paid && p.status === "open" && !p.attempted);
  // The current view mixes months (newest 60 invoices), so the month
  // filter matters there; a browsed month is already scoped.
  // Sum amount_paid (net of refunds), not amount_due — this is money actually
  // collected, and it keeps this tile in step with the Finance page, which
  // uses the same basis. The two disagreed whenever a proration or a refund
  // made due ≠ paid.
  const collectedThisMonth = payments
    .filter(
      (p) =>
        p.paid &&
        new Date(p.createdISO).getMonth() === viewStart.getMonth() &&
        new Date(p.createdISO).getFullYear() === viewStart.getFullYear(),
    )
    .reduce((sum, p) => sum + Math.max(0, p.amountPaidPence - p.refundedPence), 0);

  if (isCurrent) forecast = await forecastThisMonthPence(collectedThisMonth);

  return (
    <>
      <PageHeader
        eyebrow="Members"
        title="Payments"
        description="Every invoice, live from Stripe. Failures first, then everything else newest first."
        actions={
          <a
            href={stripeDashboardUrl("home")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center rounded-pill border border-suth-border bg-suth-elevated px-4 text-sm text-suth-text hover:border-suth-border-strong"
          >
            Open Stripe ↗
          </a>
        }
      />

      {/* Month switcher: back through history one month at a time, with a
          one-tap way home to the live view. */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/admin/payments?month=${monthKey(prevStart.getFullYear(), prevStart.getMonth())}`}
          className="inline-flex h-10 items-center rounded-pill border border-suth-border px-4 text-sm text-suth-text-secondary hover:border-suth-border-strong hover:text-suth-text"
        >
          ← {monthName(prevStart)}
        </Link>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text">
          {monthName(viewStart)}
          {isCurrent ? " · now" : ""}
        </span>
        {!isCurrent ? (
          <>
            <Link
              href={
                monthKey(nextStart.getFullYear(), nextStart.getMonth()) === currentKey
                  ? "/admin/payments"
                  : `/admin/payments?month=${monthKey(nextStart.getFullYear(), nextStart.getMonth())}`
              }
              className="inline-flex h-10 items-center rounded-pill border border-suth-border px-4 text-sm text-suth-text-secondary hover:border-suth-border-strong hover:text-suth-text"
            >
              {monthName(nextStart)} →
            </Link>
            <Link
              href="/admin/payments"
              className="text-sm text-suth-accent underline underline-offset-4"
            >
              Back to this month
            </Link>
          </>
        ) : null}
      </div>

      {isCurrent ? (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat
              label="Forecast this month"
              value={forecast !== null ? gbp(forecast) : "—"}
              hint="Collected plus renewals due before month end."
            />
            <Stat label="Collected this month" value={gbp(collectedThisMonth)} />
            <Stat
              label="Failed payments"
              value={String(failed.length)}
              hint={failed.length > 0 ? "Listed under Needs attention" : undefined}
            />
            <Stat label="Awaiting payment" value={String(openInvoices.length)} />
          </div>
          <p className="mb-8 -mt-4 text-xs text-suth-text-tertiary">
            MRR across every rate: {mrr !== null ? gbp(mrr) : "unavailable"}.
          </p>
        </>
      ) : (
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3">
          <Stat
            label={`Collected in ${format(viewStart, "MMMM")}`}
            value={gbp(collectedThisMonth)}
          />
          <Stat label="Invoices raised" value={String(payments.length)} />
          <Stat label="Failed payments" value={String(failed.length)} />
        </div>
      )}

      {failed.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-danger">
            Needs attention
          </h2>
          <Table
            headers={["Client", "Amount", "Status", "Attempts", "Invoice"]}
            empty=""
            rows={failed.map((p) => [
              <span key="c" className="text-suth-text">
                {p.customerName ?? p.customerEmail ?? p.stripeCustomerId ?? "—"}
              </span>,
              <span key="a" className="font-mono">{gbpExact(p.amountPence)}</span>,
              <Badge key="s" tone="bad">{statusLabel(p)}</Badge>,
              String(p.attemptCount),
              p.hostedInvoiceUrl ? (
                <a
                  key="l"
                  href={p.hostedInvoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-suth-accent underline underline-offset-4"
                >
                  Open ↗
                </a>
              ) : (
                "—"
              ),
            ])}
          />
          <p className="mt-2 text-xs text-suth-text-tertiary">
            Stripe retries these automatically and emails the client a link to
            pay. Chase personally after the second failed attempt.
          </p>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          All payments
        </h2>
        <Table
          headers={["Date", "Client", "For", "Amount", "Status", "Stripe"]}
          empty={
            isCurrent
              ? "No invoices yet. They appear the moment a subscription bills."
              : `No invoices in ${monthName(viewStart)}.`
          }
          rows={payments.map((p) => [
            format(new Date(p.createdISO), "dd MMM yyyy"),
            <span key="c" className="text-suth-text">
              {p.customerName ?? p.customerEmail ?? "—"}
            </span>,
            <span key="d" className="text-suth-text-secondary">
              {p.description ?? "—"}
            </span>,
            <span key="a" className="font-mono">{gbpExact(p.amountPence)}</span>,
            <Badge key="s" tone={statusTone(p)}>{statusLabel(p)}</Badge>,
            <a
              key="l"
              href={stripeDashboardUrl("invoice", p.id)}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-suth-text-secondary underline-offset-4 hover:text-suth-accent hover:underline"
            >
              Open ↗
            </a>,
          ])}
        />
      </section>
    </>
  );
}
