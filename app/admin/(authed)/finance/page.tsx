import { PageHeader, Card, Stat, Table, NoticeCard } from "@/components/admin/ui";
import { monthlyRevenue12m } from "@/lib/billing/payments";
import { stripeDashboardUrl } from "@/lib/billing/stripe-dashboard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Finance" };

function gbp(pence: number): string {
  return `£${Math.round(pence / 100).toLocaleString("en-GB")}`;
}

/**
 * THE YEAR AT A GLANCE.
 *
 * Twelve months of collected revenue, read straight from Stripe's paid
 * invoices, so the owner can see the shape of the business without opening
 * the dashboard. The bars are plain divs — no chart library — sized against
 * the best month so the tallest one fills the frame.
 */
export default async function AdminFinancePage() {
  const months = await monthlyRevenue12m();

  if (months === null) {
    return (
      <>
        <PageHeader
          eyebrow="Members"
          title="Finance"
          description="Twelve months of collected revenue, live from Stripe."
        />
        <NoticeCard
          title="Finance unavailable"
          body={
            <>
              Couldn&apos;t reach Stripe just now. Refresh in a moment. Nothing
              is wrong with the money itself.
            </>
          }
        />
      </>
    );
  }

  const totalPence = months.reduce((sum, m) => sum + m.collectedPence, 0);
  const thisMonth = months[months.length - 1];
  const maxPence = Math.max(1, ...months.map((m) => m.collectedPence));

  return (
    <>
      <PageHeader
        eyebrow="Members"
        title="Finance"
        description="Twelve months of collected revenue, live from Stripe's paid invoices."
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

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-2">
        <Stat
          label="Collected · 12 months"
          value={gbp(totalPence)}
          hint="Every paid invoice raised in the last 12 calendar months."
        />
        <Stat
          label={`Collected · ${thisMonth.label}`}
          value={gbp(thisMonth.collectedPence)}
        />
      </div>

      <section className="mb-10">
        <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Month by month
        </h2>
        <Card>
          <div className="flex items-end gap-2 md:gap-3" style={{ height: 220 }}>
            {months.map((m) => {
              const heightPct = (m.collectedPence / maxPence) * 100;
              return (
                <div
                  key={m.ym}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="font-mono text-[10px] tabular-nums text-suth-text-secondary">
                    {gbp(m.collectedPence)}
                  </span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-sm bg-suth-accent"
                      style={{
                        height: `${Math.max(heightPct, m.collectedPence > 0 ? 2 : 0)}%`,
                      }}
                      title={`${m.label}: ${gbp(m.collectedPence)}`}
                    />
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-suth-text-tertiary">
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          The 12 months
        </h2>
        <Table
          headers={["Month", "Collected"]}
          empty="No collected invoices in the last 12 months yet."
          rows={months
            .slice()
            .reverse()
            .map((m) => [
              <span key="m" className="text-suth-text">
                {m.label}
              </span>,
              <span key="c" className="font-mono tabular-nums">
                {gbp(m.collectedPence)}
              </span>,
            ])}
        />
      </section>
    </>
  );
}
