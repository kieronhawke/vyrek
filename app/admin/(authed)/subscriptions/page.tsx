import Link from "next/link";
import { format } from "date-fns";
import { PageHeader, Table, Badge, NoticeCard } from "@/components/admin/ui";
import { listSubscriptions } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string; value?: string }[] = [
  { key: "all", label: "All" },
  { key: "trialing", label: "Trialing", value: "trialing" },
  { key: "active", label: "Active", value: "active" },
  { key: "past_due", label: "Past due", value: "past_due" },
  { key: "canceled", label: "Canceled", value: "canceled" },
];

function statusTone(status: string) {
  if (status === "active") return "good" as const;
  if (status === "trialing") return "accent" as const;
  if (status === "past_due") return "warn" as const;
  if (status === "canceled" || status === "incomplete_expired")
    return "bad" as const;
  return "neutral" as const;
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status?.trim();
  const res = await listSubscriptions({ status, limit: 200 });

  return (
    <>
      <PageHeader
        eyebrow="Members"
        title="Subscriptions"
        description="Mirrored from Stripe via the /api/stripe/webhook handler."
      />

      <nav
        aria-label="Filter by status"
        className="mb-5 flex flex-wrap gap-2"
      >
        {FILTERS.map((f) => {
          const active = (status ?? "all") === f.key;
          return (
            <Link
              key={f.key}
              href={
                f.value
                  ? `/admin/subscriptions?status=${f.value}`
                  : "/admin/subscriptions"
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
          title="Could not load subscriptions"
          body={<>Detail: {res.reason}</>}
        />
      ) : (
        <Table
          headers={[
            "Customer",
            "Status",
            "Trial end",
            "Period end",
            "Created",
          ]}
          empty="No subscriptions match this filter."
          rows={res.data.map((s) => [
            s.customer_id ? (
              <Link
                key="c"
                href={`/admin/customers/${s.customer_id}`}
                className="text-vyrek-accent hover:underline"
              >
                {s.customer_email ?? s.customer_id.slice(0, 8)}
              </Link>
            ) : (
              <span key="c" className="text-vyrek-text-tertiary">
                —
              </span>
            ),
            <Badge key="s" tone={statusTone(s.status)}>{s.status}</Badge>,
            s.trial_end ? format(new Date(s.trial_end), "dd MMM yyyy") : "—",
            s.current_period_end
              ? format(new Date(s.current_period_end), "dd MMM yyyy")
              : "—",
            s.created_at
              ? format(new Date(s.created_at), "dd MMM yyyy")
              : "—",
          ])}
        />
      )}
    </>
  );
}
