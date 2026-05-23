import { format } from "date-fns";
import { PageHeader, Table, NoticeCard } from "@/components/admin/ui";
import { listWaitlist } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminWaitlistPage() {
  const res = await listWaitlist({ limit: 500 });

  const csvHref = res.ok
    ? "data:text/csv;charset=utf-8," +
      encodeURIComponent(
        "email,source,created_at\n" +
          res.data
            .map(
              (r) =>
                `${r.email},${r.source ?? ""},${r.created_at}`,
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
              download="vyrek-waitlist.csv"
              className="inline-flex h-10 items-center rounded-pill bg-vyrek-accent px-4 text-sm font-semibold text-[#0A0A0A] hover:bg-vyrek-accent-hover"
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
          headers={["Email", "Source", "Joined"]}
          empty="Waitlist is empty."
          rows={res.data.map((r) => [
            <span key="e" className="text-vyrek-text">
              {r.email}
            </span>,
            <span key="s" className="font-mono text-xs text-vyrek-text-secondary">
              {r.source ?? "—"}
            </span>,
            format(new Date(r.created_at), "dd MMM yyyy, HH:mm"),
          ])}
        />
      )}
    </>
  );
}
