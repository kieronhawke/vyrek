import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { PageHeader, Stat, Card, Badge, NoticeCard } from "@/components/admin/ui";
import { overviewStats, recentSignups } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function gbp(pence: number): string {
  return `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
}

function statValue(
  r: { ok: true; data: number } | { ok: false; reason: string },
): string {
  return r.ok ? r.data.toLocaleString("en-GB") : "—";
}

export default async function AdminOverviewPage() {
  const s = await overviewStats();
  const recent = await recentSignups(8);

  const anyBlocked = !s.customers.ok || !s.trials.ok;

  return (
    <>
      <PageHeader
        eyebrow="Today"
        title="Overview"
        description="Live counts pulled from Supabase + Stripe."
      />

      {anyBlocked ? (
        <div className="mb-6">
          <NoticeCard
            title="Schema partially applied"
            body={
              <>
                One or more queries failed. Most common cause: migration 0002
                hasn&apos;t been run yet (see{" "}
                <code className="text-vyrek-text">
                  supabase/migrations/0002_quiz_v3.sql
                </code>
                ). Apply via the Supabase Dashboard SQL Editor.
              </>
            }
          />
        </div>
      ) : null}

      {/* Stats row */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Total customers"
          value={statValue(s.customers)}
          hint="All-time signups."
        />
        <Stat
          label="Signups today"
          value={statValue(s.signupsToday)}
          delta="vs UTC midnight"
        />
        <Stat
          label="Trialing"
          value={statValue(s.trials)}
          hint="Inside their 7-day window."
        />
        <Stat
          label="Paid subscribers"
          value={statValue(s.paid)}
          hint="status = active in Stripe."
        />
        <Stat
          label="Monthly recurring revenue"
          value={s.mrr_pence.ok ? gbp(s.mrr_pence.data) : "—"}
          hint="paid × £8.99"
        />
        <Stat label="Cancelled" value={statValue(s.cancelled)} hint="Lifetime." />
        <Stat
          label="Partner applications"
          value={statValue(s.partnerPending)}
          delta="pending review"
        />
        <Stat label="Waitlist" value={statValue(s.waitlist)} />
      </section>

      {/* Recent signups */}
      <section className="mt-10">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            Recent signups
          </h2>
          <Link
            href="/admin/customers"
            className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-accent hover:underline"
          >
            See all →
          </Link>
        </header>
        {recent.ok ? (
          recent.data.length === 0 ? (
            <Card>
              <p className="text-sm text-vyrek-text-tertiary">
                No signups yet.
              </p>
            </Card>
          ) : (
            <ul role="list" className="space-y-1">
              {recent.data.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/customers/${c.id}`}
                    className="flex items-center justify-between rounded-md border border-vyrek-border-subtle bg-vyrek-elevated/60 px-4 py-3 transition-colors hover:border-vyrek-border-strong"
                  >
                    <span className="truncate text-sm text-vyrek-text">
                      {c.email}
                    </span>
                    <span className="ml-3 shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                      {c.created_at
                        ? formatDistanceToNow(new Date(c.created_at), {
                            addSuffix: true,
                          })
                        : "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : (
          <Card>
            <p className="text-sm text-vyrek-text-tertiary">
              Could not load recent signups: {recent.reason}
            </p>
          </Card>
        )}
      </section>

      {/* Quick links */}
      <section className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Link
          href="/admin/partners"
          className="block rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5 transition-colors hover:border-vyrek-border-strong"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-accent">
            [ PARTNERS ]
          </p>
          <p className="mt-3 text-base font-bold text-vyrek-text">
            Review applications
          </p>
          <p className="mt-2 text-sm text-vyrek-text-secondary">
            {s.partnerPending.ok
              ? `${s.partnerPending.data} pending`
              : "Pending applications"}
          </p>
        </Link>
        <Link
          href="/admin/payouts"
          className="block rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5 transition-colors hover:border-vyrek-border-strong"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-accent">
            [ PAYOUTS ]
          </p>
          <p className="mt-3 text-base font-bold text-vyrek-text">
            Process BACS payouts
          </p>
          <p className="mt-2 text-sm text-vyrek-text-secondary">
            Mark pending payouts as paid once BACS clears.
          </p>
        </Link>
        <Link
          href="/admin/subscriptions"
          className="block rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5 transition-colors hover:border-vyrek-border-strong"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-accent">
            [ SUBSCRIPTIONS ]
          </p>
          <p className="mt-3 text-base font-bold text-vyrek-text">
            Subscription dashboard
          </p>
          <p className="mt-2 text-sm text-vyrek-text-secondary">
            All trial + paid + cancelled subscriptions.
          </p>
        </Link>
      </section>

      <p className="mt-10 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
        <Badge tone="accent">LIVE</Badge>
        Refreshes on every page load
      </p>
    </>
  );
}
