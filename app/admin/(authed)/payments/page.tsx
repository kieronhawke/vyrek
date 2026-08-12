import { format } from "date-fns";
import { PageHeader, Badge, Card, Stat, Table } from "@/components/admin/ui";
import { recentPayments, liveMrrPence } from "@/lib/billing/payments";
import { stripeDashboardUrl } from "@/lib/billing/stripe-dashboard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Payments" };

function gbp(pence: number): string {
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
export default async function AdminPaymentsPage() {
  const [payments, mrr] = await Promise.all([
    recentPayments(60),
    liveMrrPence(),
  ]);

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
  const collectedThisMonth = payments
    .filter(
      (p) =>
        p.paid &&
        new Date(p.createdISO).getMonth() === new Date().getMonth() &&
        new Date(p.createdISO).getFullYear() === new Date().getFullYear(),
    )
    .reduce((sum, p) => sum + p.amountPence, 0);

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

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="MRR" value={mrr !== null ? gbp(mrr) : "—"} />
        <Stat label="Collected this month" value={gbp(collectedThisMonth)} />
        <Stat
          label="Failed payments"
          value={String(failed.length)}
          hint={failed.length > 0 ? "Listed under Needs attention" : undefined}
        />
        <Stat label="Awaiting payment" value={String(openInvoices.length)} />
      </div>

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
              <span key="a" className="font-mono">{gbp(p.amountPence)}</span>,
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
          empty="No invoices yet. They appear the moment a subscription bills."
          rows={payments.map((p) => [
            format(new Date(p.createdISO), "dd MMM yyyy"),
            <span key="c" className="text-suth-text">
              {p.customerName ?? p.customerEmail ?? "—"}
            </span>,
            <span key="d" className="text-suth-text-secondary">
              {p.description ?? "—"}
            </span>,
            <span key="a" className="font-mono">{gbp(p.amountPence)}</span>,
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
