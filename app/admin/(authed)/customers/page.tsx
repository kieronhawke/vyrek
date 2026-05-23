import Link from "next/link";
import { format } from "date-fns";
import { PageHeader, Table, NoticeCard } from "@/components/admin/ui";
import { listCustomers } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const search = (sp.q ?? "").trim();
  const result = await listCustomers({ search, limit: 100 });

  return (
    <>
      <PageHeader
        eyebrow="Members"
        title="Customers"
        description="All quiz signups and account holders."
        actions={
          <form className="flex gap-2" action="/admin/customers" method="GET">
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="Search email..."
              className="h-10 w-64 rounded-md border border-vyrek-border bg-vyrek-elevated px-3 text-sm text-vyrek-text outline-none focus:border-vyrek-accent"
            />
            <button
              type="submit"
              className="h-10 rounded-pill bg-vyrek-accent px-4 text-sm font-semibold text-[#0A0A0A]"
            >
              Search
            </button>
          </form>
        }
      />

      {!result.ok ? (
        <NoticeCard
          title="Could not load customers"
          body={<>Detail: {result.reason}</>}
        />
      ) : (
        <Table
          headers={["Email", "Stripe", "Referral code", "Created"]}
          empty={search ? `No customers matching "${search}".` : "No customers yet."}
          rows={result.data.map((c) => [
            <Link
              key="email"
              href={`/admin/customers/${c.id}`}
              className="text-vyrek-accent hover:underline"
            >
              {c.email}
            </Link>,
            <span key="stripe" className="font-mono text-xs text-vyrek-text-secondary">
              {c.stripe_customer_id ?? "—"}
            </span>,
            <span key="ref" className="font-mono text-xs">
              {c.referral_code ?? "—"}
            </span>,
            c.created_at
              ? format(new Date(c.created_at), "dd MMM yyyy, HH:mm")
              : "—",
          ])}
        />
      )}
    </>
  );
}
