import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  PageHeader,
  Card,
  Badge,
  Table,
  Stat,
  NoticeCard,
} from "@/components/admin/ui";
import { getPartner } from "@/lib/admin/queries";
import { listEventsForTarget, eventLabel } from "@/lib/admin/events";
import { PartnerControls } from "@/components/admin/partner-controls";

export const dynamic = "force-dynamic";

function gbp(pence: number): string {
  return `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
}

function tierTone(tier: string) {
  if (tier === "elite") return "accent" as const;
  if (tier === "growth") return "good" as const;
  return "neutral" as const;
}

function refStatusTone(status: string) {
  if (status === "paid") return "good" as const;
  if (status === "trial") return "accent" as const;
  if (status === "cancelled") return "bad" as const;
  if (status === "clawed_back") return "warn" as const;
  return "neutral" as const;
}

function payoutStatusTone(status: string) {
  if (status === "paid") return "good" as const;
  if (status === "failed") return "bad" as const;
  return "warn" as const;
}

export default async function AdminPartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getPartner(id);
  if (!res.ok) notFound();
  const { partner, referrals, payouts, clicks30d, clickThroughRate } = res.data;
  const events = await listEventsForTarget("partner", id, 12);

  return (
    <>
      <PageHeader
        eyebrow="Partner"
        title={partner.name}
        description={
          <>
            <span className="font-mono text-xs text-vyrek-text">
              vyrek.com/p/{partner.partner_code}
            </span>
            {" · "}
            <Badge tone={tierTone(partner.tier)}>{partner.tier}</Badge>
            {partner.suspended_at ? (
              <>
                {" · "}
                <Badge tone="bad">SUSPENDED</Badge>
              </>
            ) : null}
          </>
        }
        actions={
          <Link
            href="/admin/partners/list"
            className="inline-flex h-10 items-center rounded-pill border border-vyrek-border bg-vyrek-elevated px-4 text-sm text-vyrek-text"
          >
            ← All partners
          </Link>
        }
      />

      {partner.suspended_at ? (
        <div className="mb-6">
          <NoticeCard
            title="Account suspended"
            body={
              <>
                Suspended{" "}
                {format(new Date(partner.suspended_at), "dd MMM yyyy, HH:mm")}
                {partner.suspension_reason
                  ? ` · "${partner.suspension_reason}"`
                  : ""}
                . Their /p/{partner.partner_code} link redirects without
                attribution, and their dashboard is locked.
              </>
            }
          />
        </div>
      ) : null}

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Total referrals"
          value={(partner.total_referrals ?? 0).toString()}
        />
        <Stat
          label="Active now"
          value={(partner.active_subscribers ?? 0).toString()}
        />
        <Stat
          label="Clicks · 30d"
          value={clicks30d.toString()}
          hint={
            clickThroughRate !== null
              ? `${(clickThroughRate * 100).toFixed(1)}% click → signup`
              : undefined
          }
        />
        <Stat
          label="Lifetime"
          value={gbp(partner.lifetime_earnings_pence ?? 0)}
          hint={`Pending: ${gbp(partner.pending_payout_pence ?? 0)}`}
        />
      </section>

      {/* Profile + admin controls side-by-side */}
      <section className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            Profile
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <Row k="Name" v={partner.name} />
            <Row k="Email" v={partner.email} mono />
            <Row
              k="Address"
              v={partner.address ?? "-"}
            />
            <Row
              k="VAT number"
              v={partner.vat_number ?? "-"}
              mono
            />
            <Row
              k="Joined"
              v={
                partner.created_at
                  ? format(new Date(partner.created_at), "dd MMM yyyy")
                  : "-"
              }
            />
            {partner.application_id ? (
              <div className="flex justify-between gap-3">
                <dt className="text-vyrek-text-tertiary">From application</dt>
                <dd>
                  <Link
                    href={`/admin/partners/${partner.application_id}`}
                    className="text-vyrek-accent underline underline-offset-4"
                  >
                    Open ↗
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>
        </Card>

        <PartnerControls
          partnerId={partner.id}
          tier={partner.tier as "starter" | "growth" | "elite"}
          suspended={!!partner.suspended_at}
          pendingPayoutPence={partner.pending_payout_pence ?? 0}
        />
      </section>

      {/* Recent referrals */}
      <section className="mt-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          Referrals ({referrals.length})
        </h2>
        <Table
          headers={[
            "Status",
            "Sub-ID",
            "Signed up",
            "First paid",
            "Earned",
          ]}
          empty="No referrals yet. Their /p/ link has been live since onboarding."
          rows={referrals.map((r) => [
            <Badge key="s" tone={refStatusTone(r.status)}>{r.status}</Badge>,
            <span key="sub" className="font-mono text-xs text-vyrek-text-secondary">
              {r.sub_id ?? "-"}
            </span>,
            r.signed_up_at
              ? format(new Date(r.signed_up_at), "dd MMM yyyy")
              : "-",
            r.first_paid_at
              ? format(new Date(r.first_paid_at), "dd MMM yyyy")
              : "-",
            <span key="e" className="tabular-nums">
              {gbp(r.recurring_earnings_pence ?? 0)}
            </span>,
          ])}
        />
      </section>

      {/* Payouts */}
      <section className="mt-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          Payouts ({payouts.length})
        </h2>
        <Table
          headers={["Period", "Amount", "Status", "BACS reference"]}
          empty="No payouts yet. A payout queues automatically once pending balance hits £50."
          rows={payouts.map((p) => [
            <span key="per" className="font-mono text-xs">
              {p.period_start} → {p.period_end}
            </span>,
            <span key="a" className="tabular-nums font-semibold">
              {gbp(p.amount_pence)}
            </span>,
            <Badge key="s" tone={payoutStatusTone(p.status)}>{p.status}</Badge>,
            <span key="ref" className="font-mono text-xs text-vyrek-text-secondary">
              {p.bacs_reference ?? "-"}
            </span>,
          ])}
        />
      </section>

      {/* Audit log */}
      <section className="mt-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          Audit log
        </h2>
        {events.ok && events.data.length > 0 ? (
          <ol role="list" className="space-y-2">
            {events.data.map((e) => (
              <li
                key={e.id}
                className="rounded-md border border-vyrek-border-subtle bg-vyrek-elevated/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-vyrek-text">
                      {eventLabel(e.action)}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                      {e.actor === "system" ? "[ SYSTEM ]" : `[ ${e.actor} ]`}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                    {format(new Date(e.created_at), "dd MMM HH:mm")}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <Card>
            <p className="text-sm text-vyrek-text-tertiary">
              No events yet for this partner.
            </p>
          </Card>
        )}
      </section>
    </>
  );
}

function Row({
  k,
  v,
  mono,
}: {
  k: string;
  v: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-vyrek-text-tertiary">{k}</dt>
      <dd
        className={
          mono
            ? "font-mono text-xs text-vyrek-text"
            : "text-right text-vyrek-text"
        }
      >
        {v}
      </dd>
    </div>
  );
}
