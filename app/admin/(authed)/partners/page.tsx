import Link from "next/link";
import { format } from "date-fns";
import {
  PageHeader,
  Table,
  Badge,
  NoticeCard,
} from "@/components/admin/ui";
import { listApplications } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string; value?: string }[] = [
  { key: "pending", label: "Pending", value: "pending" },
  { key: "approved", label: "Approved", value: "approved" },
  { key: "rejected", label: "Rejected", value: "rejected" },
  { key: "needs_info", label: "Needs info", value: "needs_info" },
  { key: "all", label: "All" },
];

function statusTone(status: string) {
  if (status === "approved") return "good" as const;
  if (status === "rejected") return "bad" as const;
  if (status === "needs_info") return "warn" as const;
  return "accent" as const;
}

export default async function AdminPartnerApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status?.trim() ?? "pending";
  const res = await listApplications({
    status: status === "all" ? undefined : status,
    limit: 200,
  });

  return (
    <>
      <PageHeader
        eyebrow="Partners"
        title="Applications"
        description="People who applied to the Partner Programme via /partners/apply."
      />

      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Filter by status">
        {FILTERS.map((f) => {
          const active = (status ?? "pending") === f.key;
          return (
            <Link
              key={f.key}
              href={
                f.value
                  ? `/admin/partners?status=${f.value}`
                  : "/admin/partners?status=all"
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
          title="Could not load applications"
          body={<>Detail: {res.reason}</>}
        />
      ) : (
        <Table
          headers={[
            "Submitted",
            "Name",
            "Email",
            "Platform",
            "Reach",
            "Status",
          ]}
          empty="No applications in this state."
          rows={res.data.map((a) => [
            a.created_at
              ? format(new Date(a.created_at), "dd MMM HH:mm")
              : "-",
            <Link
              key="n"
              href={`/admin/partners/${a.id}`}
              className="text-vyrek-accent hover:underline"
            >
              {a.name}
            </Link>,
            <span key="e" className="text-vyrek-text-secondary">
              {a.email}
            </span>,
            a.platform,
            a.follower_count,
            <Badge key="s" tone={statusTone(a.status)}>{a.status}</Badge>,
          ])}
        />
      )}
    </>
  );
}
