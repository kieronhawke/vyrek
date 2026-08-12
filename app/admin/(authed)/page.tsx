import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { PageHeader, Stat, Card, Badge, NoticeCard } from "@/components/admin/ui";
import { Sparkline } from "@/components/admin/sparkline";
import {
  overviewStats,
  recentSignups,
  dailySignups30d,
  dailyTrialStarts30d,
  dailyPartnerClicks30d,
} from "@/lib/admin/queries";
import { listRecentEvents, eventLabel } from "@/lib/admin/events";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function gbp(pence: number): string {
  return `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
}

function statValue(
  r: { ok: true; data: number } | { ok: false; reason: string },
): string {
  return r.ok ? r.data.toLocaleString("en-GB") : "-";
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

export default async function AdminOverviewPage() {
  const [s, recent, signups30, trials30, clicks30, events] = await Promise.all([
    overviewStats(),
    recentSignups(8),
    dailySignups30d(),
    dailyTrialStarts30d(),
    dailyPartnerClicks30d(),
    listRecentEvents(15),
  ]);

  const anyBlocked = !s.customers.ok || !s.trials.ok;
  const last7Signups = signups30.slice(-7);
  const prev7Signups = signups30.slice(-14, -7);
  const signupsDelta =
    sum(prev7Signups) === 0
      ? null
      : Math.round(
          ((sum(last7Signups) - sum(prev7Signups)) / sum(prev7Signups)) * 100,
        );

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
            title="Some figures unavailable"
            body={
              <>
                One or more queries failed, usually because Stripe or Supabase was
                briefly unreachable. Refresh in a minute; if it persists,
                check the pending files in{" "}
                <code className="text-suth-text">supabase/migrations/</code>.
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
          sparkline={<Sparkline values={signups30} />}
        />
        <Stat
          label="Signups · 7d"
          value={sum(last7Signups).toLocaleString("en-GB")}
          delta={
            signupsDelta === null
              ? "-"
              : `${signupsDelta >= 0 ? "+" : ""}${signupsDelta}% vs prior 7d`
          }
          sparkline={<Sparkline values={last7Signups} />}
        />
        <Stat
          label="Trialing"
          value={statValue(s.trials)}
          hint="Inside their 7-day window."
          sparkline={<Sparkline values={trials30} />}
        />
        <Stat
          label="Paid subscribers"
          value={statValue(s.paid)}
          hint="status = active in Stripe."
        />
        <Stat
          label="Monthly recurring revenue"
          value={s.mrr_pence.ok ? gbp(s.mrr_pence.data) : "-"}
          hint="Live from Stripe, summed across every rate."
        />
        <Stat label="Cancelled" value={statValue(s.cancelled)} hint="Lifetime." />
        <Stat
          label="Partner applications"
          value={statValue(s.partnerPending)}
          delta="pending review"
        />
        <Stat
          label="Partner clicks · 30d"
          value={sum(clicks30).toLocaleString("en-GB")}
          sparkline={<Sparkline values={clicks30} />}
        />
      </section>

      {/* Activity feed + recent signups */}
      <section className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
              Activity feed
            </h2>
            <Badge tone="accent">LIVE</Badge>
          </header>
          {events.ok ? (
            events.data.length === 0 ? (
              <Card>
                <p className="text-sm text-suth-text-tertiary">
                  Nothing yet. Submit an application, sign up a customer, or
                  trigger a Stripe webhook to populate the feed.
                </p>
              </Card>
            ) : (
              <ol role="list" className="space-y-2">
                {events.data.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-md border border-suth-border-subtle bg-suth-elevated/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-suth-text">
                          {eventLabel(e.action)}
                        </p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                          {e.actor === "system" ? "[ SYSTEM ]" : `[ ${e.actor} ]`}
                          {e.target_kind ? ` · ${e.target_kind}` : ""}
                          {e.target_id ? ` · ${e.target_id.slice(0, 8)}` : ""}
                        </p>
                        {e.metadata ? (
                          <p className="mt-2 font-mono text-[11px] text-suth-text-secondary">
                            {summariseMetadata(e.metadata)}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                        {formatDistanceToNow(new Date(e.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )
          ) : (
            <Card>
              <p className="text-sm text-suth-text-tertiary">
                Activity feed unavailable: {events.reason}
              </p>
            </Card>
          )}
        </div>

        <div>
          <header className="mb-3 flex items-center justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
              Recent signups
            </h2>
            <Link
              href="/admin/customers"
              className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent hover:underline"
            >
              See all →
            </Link>
          </header>
          {recent.ok ? (
            recent.data.length === 0 ? (
              <Card>
                <p className="text-sm text-suth-text-tertiary">
                  No signups yet. Share the quiz to start filling this list.
                </p>
              </Card>
            ) : (
              <ul role="list" className="space-y-1">
                {recent.data.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="flex items-center justify-between rounded-md border border-suth-border-subtle bg-suth-elevated/60 px-4 py-3 transition-colors hover:border-suth-border-strong"
                    >
                      <span className="truncate text-sm text-suth-text">
                        {c.email}
                      </span>
                      <span className="ml-3 shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                        {c.created_at
                          ? formatDistanceToNow(new Date(c.created_at), {
                              addSuffix: true,
                            })
                          : "-"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <Card>
              <p className="text-sm text-suth-text-tertiary">
                Could not load recent signups: {recent.reason}
              </p>
            </Card>
          )}
        </div>
      </section>

      {/* Quick links */}
      <section className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Link
          href="/admin/partners"
          className="block rounded-lg border border-suth-border-subtle bg-suth-elevated p-5 transition-colors hover:border-suth-border-strong"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
            [ PARTNERS ]
          </p>
          <p className="mt-3 text-base font-bold text-suth-text">
            Review applications
          </p>
          <p className="mt-2 text-sm text-suth-text-secondary">
            {s.partnerPending.ok
              ? `${s.partnerPending.data} pending`
              : "Pending applications"}
          </p>
        </Link>
        <Link
          href="/admin/payouts"
          className="block rounded-lg border border-suth-border-subtle bg-suth-elevated p-5 transition-colors hover:border-suth-border-strong"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
            [ PAYOUTS ]
          </p>
          <p className="mt-3 text-base font-bold text-suth-text">
            Process BACS payouts
          </p>
          <p className="mt-2 text-sm text-suth-text-secondary">
            Mark pending payouts as paid once BACS clears.
          </p>
        </Link>
        <Link
          href="/admin/subscriptions?status=past_due"
          className="block rounded-lg border border-suth-border-subtle bg-suth-elevated p-5 transition-colors hover:border-suth-border-strong"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
            [ DUNNING ]
          </p>
          <p className="mt-3 text-base font-bold text-suth-text">
            Failed-payment queue
          </p>
          <p className="mt-2 text-sm text-suth-text-secondary">
            Subscriptions where the last invoice failed.
          </p>
        </Link>
      </section>

      <p className="mt-10 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
        <Badge tone="accent">LIVE</Badge>
        Refreshes on every page load
      </p>
    </>
  );
}

function summariseMetadata(meta: Record<string, unknown>): string {
  const bits: string[] = [];
  if (typeof meta.programme === "string") bits.push(`programme=${meta.programme}`);
  if (typeof meta.email === "string") bits.push(meta.email);
  if (typeof meta.platform === "string") bits.push(`platform=${meta.platform}`);
  if (typeof meta.followerCount === "string") bits.push(meta.followerCount);
  if (typeof meta.tier === "string") bits.push(`tier=${meta.tier}`);
  if (typeof meta.amount_pence === "number") {
    bits.push(`£${(meta.amount_pence / 100).toFixed(2)}`);
  }
  if (typeof meta.commission_pence === "number") {
    bits.push(`commission=£${(meta.commission_pence / 100).toFixed(2)}`);
  }
  if (typeof meta.bacsReference === "string") bits.push(`ref=${meta.bacsReference}`);
  if (typeof meta.reason === "string" && meta.reason)
    bits.push(`"${meta.reason.slice(0, 80)}"`);
  if (typeof meta.partnerCode === "string") bits.push(`/p/${meta.partnerCode}`);
  if (typeof meta.partnerId === "string")
    bits.push(`partner=${meta.partnerId.slice(0, 8)}`);
  return bits.join(" · ");
}
