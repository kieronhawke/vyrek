import Link from "next/link";
import { PageHeader, Badge, Stat } from "@/components/admin/ui";
import { leadsWithStage, STAGE_META, type LeadStage } from "@/lib/admin/leads-lifecycle";
import { leadStoreReady } from "@/lib/leads/store";

export const dynamic = "force-dynamic";

export const metadata = { title: "Leads & enquiries" };

function when(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

/**
 * LEADS, THE WHOLE JOURNEY IN ONE PLACE.
 *
 * Each enquiry carries how far the person has got: brand new and needing a
 * call, booked in, sent their onboarding link, or already a paying client.
 * Tap a lead to read everything they told us and move them to the next
 * step. Newest and least-progressed first, so the callbacks Ben owes are
 * at the top.
 */
export default async function AdminLeadsPage() {
  const rows = await leadsWithStage(150);
  const durable = leadStoreReady();

  // Sort: the ones needing action first (new, then booked), progressed last.
  const order: Record<LeadStage, number> = {
    new: 0,
    booked: 1,
    link_sent: 2,
    call_done: 3,
    client: 4,
  };
  const sorted = [...rows].sort((a, b) => {
    const s = order[a.stage] - order[b.stage];
    return s !== 0 ? s : b.lead.createdISO.localeCompare(a.lead.createdISO);
  });

  const count = (stage: LeadStage) => rows.filter((r) => r.stage === stage).length;

  return (
    <>
      <PageHeader
        eyebrow="Today"
        title="Leads & enquiries"
        description="Everyone who has asked for a consultation, and how far along they are. Callbacks are at the top."
      />

      {!durable ? (
        <p className="mb-6 rounded-lg border border-suth-warning/40 bg-suth-warning/10 px-4 py-3 text-sm text-suth-text">
          Enquiries are not being stored durably. New leads may not survive a
          restart until the database is configured.
        </p>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="New" value={String(count("new"))} hint={count("new") ? "Needs a callback" : undefined} />
        <Stat label="Call booked" value={String(count("booked"))} />
        <Stat label="Link sent" value={String(count("link_sent"))} />
        <Stat label="Clients" value={String(count("client"))} />
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-suth-text-secondary">
          No enquiries yet. They appear here the moment someone asks for a
          consultation, and you get an email and a text too.
        </p>
      ) : (
        <ul role="list" className="space-y-2">
          {sorted.map(({ lead, stage, detail }) => {
            const meta = STAGE_META[stage];
            return (
              <li key={lead.id}>
                <Link
                  href={`/admin/leads/${lead.id}`}
                  className="block rounded-xl border border-suth-border bg-suth-elevated p-4 transition-colors hover:border-suth-border-strong"
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-suth-text">
                        {lead.name}
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
                          {when(lead.createdISO)}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-suth-text-secondary">
                        {lead.wants || lead.goal || lead.brief.slice(0, 80) || lead.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {detail ? (
                        <p className="mt-1 text-xs text-suth-text-tertiary">{detail}</p>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
