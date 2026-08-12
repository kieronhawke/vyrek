import Link from "next/link";
import { format } from "date-fns";
import { PageHeader, Table, Badge, NoticeCard } from "@/components/admin/ui";
import { listCustomers } from "@/lib/admin/queries";
import { stripeDashboardUrl } from "@/lib/billing/stripe-dashboard";

function statusTone(status: string | null | undefined) {
  if (status === "active") return "good" as const;
  if (status === "trialing") return "accent" as const;
  if (status === "past_due") return "warn" as const;
  if (status === "canceled") return "bad" as const;
  return "neutral" as const;
}

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
              className="h-10 w-64 rounded-md border border-suth-border bg-suth-elevated px-3 text-sm text-suth-text outline-none focus:border-suth-accent"
            />
            <button
              type="submit"
              className="h-10 rounded-pill bg-suth-accent px-4 text-sm font-semibold text-[#0A0A0A]"
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
          headers={["Email", "Subscription", "Stripe", "Created"]}
          empty={search ? `No customers matching "${search}".` : "No customers yet."}
          rows={result.data.map((c) => [
            <Link
              key="email"
              href={`/admin/customers/${c.id}`}
              className="text-suth-accent hover:underline"
            >
              {c.email}
            </Link>,
            c.subscription_status ? (
              <Badge key="sub" tone={statusTone(c.subscription_status)}>
                {c.subscription_status}
              </Badge>
            ) : (
              <span key="sub" className="text-xs text-suth-text-tertiary">
                none
              </span>
            ),
            c.stripe_customer_id ? (
              <a
                key="stripe"
                href={stripeDashboardUrl("customer", c.stripe_customer_id)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-suth-text-secondary underline-offset-4 hover:text-suth-accent hover:underline"
              >
                Open ↗
              </a>
            ) : (
              <span key="stripe" className="font-mono text-xs text-suth-text-tertiary">
                -
              </span>
            ),
            c.created_at
              ? format(new Date(c.created_at), "dd MMM yyyy, HH:mm")
              : "-",
          ])}
        />
      )}
    </>
  );
}
