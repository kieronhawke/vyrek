import { format } from "date-fns";
import { PageHeader, Table, Badge, NoticeCard } from "@/components/admin/ui";
import { listPartners } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

function tierTone(tier: string) {
  if (tier === "elite") return "accent" as const;
  if (tier === "growth") return "good" as const;
  return "neutral" as const;
}

function gbp(pence: number): string {
  return `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
}

export default async function AdminPartnersListPage() {
  const res = await listPartners({ limit: 200 });

  return (
    <>
      <PageHeader
        eyebrow="Partners"
        title="All partners"
        description="Approved + onboarded partners. Tier auto-promotes at 10 and 50 active referrals."
      />

      {!res.ok ? (
        <NoticeCard
          title="Could not load partners"
          body={<>Detail: {res.reason}</>}
        />
      ) : (
        <Table
          headers={[
            "Name",
            "Code",
            "Tier",
            "Active",
            "Lifetime",
            "Pending payout",
            "Joined",
          ]}
          empty="No partners yet. Approve an application to create one."
          rows={res.data.map((p) => [
            <span key="n" className="text-vyrek-text">
              {p.name}
            </span>,
            <span key="c" className="font-mono text-xs text-vyrek-text-secondary">
              vyrek.com/p/{p.partner_code}
            </span>,
            <Badge key="t" tone={tierTone(p.tier)}>{p.tier}</Badge>,
            <span key="a" className="tabular-nums">
              {p.active_subscribers ?? 0}
            </span>,
            <span key="l" className="tabular-nums">
              {gbp(p.lifetime_earnings_pence ?? 0)}
            </span>,
            <span key="pp" className="tabular-nums">
              {gbp(p.pending_payout_pence ?? 0)}
            </span>,
            p.created_at
              ? format(new Date(p.created_at), "dd MMM yyyy")
              : "—",
          ])}
        />
      )}
    </>
  );
}
