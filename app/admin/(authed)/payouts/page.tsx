import Link from "next/link";
import { format } from "date-fns";
import { PageHeader, Table, Badge, NoticeCard } from "@/components/admin/ui";
import { listPayouts } from "@/lib/admin/queries";
import { MarkPayoutPaidButton } from "@/components/admin/mark-payout-paid";

export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string; value?: string }[] = [
  { key: "pending", label: "Pending", value: "pending" },
  { key: "paid", label: "Paid", value: "paid" },
  { key: "failed", label: "Failed", value: "failed" },
  { key: "all", label: "All" },
];

function gbp(pence: number): string {
  return `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
}

function statusTone(status: string) {
  if (status === "paid") return "good" as const;
  if (status === "failed") return "bad" as const;
  return "warn" as const;
}

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status?.trim() ?? "pending";
  const res = await listPayouts({
    status: status === "all" ? undefined : status,
  });

  return (
    <>
      <PageHeader
        eyebrow="Partners"
        title="Payouts"
        description="Mark payouts paid here once the BACS payment clears in your bank."
      />

      <nav aria-label="Filter" className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (status ?? "pending") === f.key;
          return (
            <Link
              key={f.key}
              href={
                f.value
                  ? `/admin/payouts?status=${f.value}`
                  : "/admin/payouts?status=all"
              }
              className={
                active
                  ? "inline-flex h-9 items-center rounded-pill border border-vyrek-accent bg-vyrek-accent/10 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-accent"
                  : "inline-flex h-9 items-center rounded-pill border border-vyrek-border-subtle bg-vyrek-elevated px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-secondary"
              }
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {!res.ok ? (
        <NoticeCard
          title="Could not load payouts"
          body={<>Detail: {res.reason}</>}
        />
      ) : (
        <Table
          headers={[
            "Partner",
            "Amount",
            "Period",
            "Status",
            "BACS ref",
            "Action",
          ]}
          empty="No payouts in this state."
          rows={res.data.map((p) => [
            <div key="p">
              <p className="text-sm font-medium text-vyrek-text">
                {p.partner_name ?? "(unknown)"}
              </p>
              <p className="font-mono text-xs text-vyrek-text-secondary">
                {p.partner_email ?? p.partner_id}
              </p>
            </div>,
            <span key="a" className="tabular-nums font-semibold">
              {gbp(p.amount_pence)}
            </span>,
            <span key="per" className="font-mono text-xs">
              {p.period_start} → {p.period_end}
            </span>,
            <Badge key="s" tone={statusTone(p.status)}>{p.status}</Badge>,
            <span key="b" className="font-mono text-xs text-vyrek-text-secondary">
              {p.bacs_reference ?? "—"}
            </span>,
            p.status === "pending" ? (
              <MarkPayoutPaidButton key="m" payoutId={p.id} />
            ) : p.paid_at ? (
              <span key="d" className="font-mono text-xs text-vyrek-text-tertiary">
                {format(new Date(p.paid_at), "dd MMM")}
              </span>
            ) : (
              <span key="d" className="text-vyrek-text-tertiary">
                —
              </span>
            ),
          ])}
        />
      )}
    </>
  );
}
