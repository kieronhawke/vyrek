import { format } from "date-fns";
import { PageHeader, Table, NoticeCard } from "@/components/admin/ui";
import { listWaitlist } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminWaitlistPage() {
  const res = await listWaitlist({ limit: 500 });

  const csv = (v: string | null) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const csvHref = res.ok
    ? "data:text/csv;charset=utf-8," +
      encodeURIComponent(
        "name,email,phone,goal,source,created_at\n" +
          res.data
            .map(
              (r) =>
                `${csv(r.name)},${r.email},${csv(r.phone)},${csv(r.goal)},${r.source ?? ""},${r.created_at}`,
            )
            .join("\n"),
      )
    : "#";

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Waitlist"
        description="Emails captured by waitlist forms across the site."
        actions={
          res.ok && res.data.length > 0 ? (
            <a
              href={csvHref}
              download="suth-waitlist.csv"
              className="inline-flex h-10 items-center rounded-pill bg-suth-accent px-4 text-sm font-semibold text-[#0A0A0A] hover:bg-suth-accent-hover"
            >
              Export CSV ({res.data.length})
            </a>
          ) : null
        }
      />

      {!res.ok ? (
        <NoticeCard
          title="Could not load waitlist"
          body={<>Detail: {res.reason}</>}
        />
      ) : (
        <Table
          headers={["Who", "Contact", "What they want", "Source", "Joined"]}
          empty="Waitlist is empty."
          rows={res.data.map((r) => [
            <span key="n" className="text-suth-text">
              {r.name ?? "—"}
            </span>,
            <span key="e" className="text-suth-text-secondary">
              {r.email}
              {r.phone ? (
                <span className="block font-mono text-xs text-suth-text-tertiary">
                  {r.phone}
                </span>
              ) : null}
            </span>,
            <span key="g" className="block max-w-72 text-xs text-suth-text-secondary">
              {r.goal ?? "—"}
            </span>,
            <span key="s" className="font-mono text-xs text-suth-text-secondary">
              {r.source ?? "-"}
            </span>,
            format(new Date(r.created_at), "dd MMM yyyy, HH:mm"),
          ])}
        />
      )}
    </>
  );
}
