import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { PageHeader, Card, Badge } from "@/components/admin/ui";
import { getApplication } from "@/lib/admin/queries";
import { ApplicationActions } from "@/components/admin/application-actions";

export const dynamic = "force-dynamic";

function statusTone(status: string) {
  if (status === "approved") return "good" as const;
  if (status === "rejected") return "bad" as const;
  if (status === "needs_info") return "warn" as const;
  return "accent" as const;
}

export default async function AdminApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getApplication(id);
  if (!res.ok) notFound();
  const a = res.data;

  return (
    <>
      <PageHeader
        eyebrow="Application"
        title={a.name}
        description={
          <>
            Submitted{" "}
            {a.created_at
              ? format(new Date(a.created_at), "dd MMM yyyy 'at' HH:mm")
              : "unknown"}{" "}
            · <Badge tone={statusTone(a.status)}>{a.status}</Badge>
          </>
        }
        actions={
          <Link
            href="/admin/partners"
            className="inline-flex h-10 items-center rounded-pill border border-vyrek-border bg-vyrek-elevated px-4 text-sm text-vyrek-text"
          >
            ← Back to applications
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            Contact
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <Row k="Email" v={a.email} mono />
            <Row k="Country" v={a.country} />
            <Row k="Primary link" v={a.primary_url} mono />
          </dl>
        </Card>

        <Card>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            Audience
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <Row k="Platform" v={a.platform} />
            <Row k="Follower count" v={a.follower_count} />
            <Row
              k="Promotion methods"
              v={(a.promotion_methods ?? []).join(", ") || "-"}
            />
          </dl>
        </Card>

        <Card className="md:col-span-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            Their content
          </p>
          <p className="mt-3 text-sm text-vyrek-text">
            {a.content_description}
          </p>
        </Card>

        <Card className="md:col-span-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            Why Vyrek fits their audience
          </p>
          <p className="mt-3 text-sm text-vyrek-text">{a.why_vyrek}</p>
        </Card>

        {a.past_affiliate ? (
          <Card className="md:col-span-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
              Past affiliate experience
            </p>
            <p className="mt-3 text-sm text-vyrek-text">{a.past_affiliate}</p>
          </Card>
        ) : null}

        {a.rejection_reason ? (
          <Card className="md:col-span-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
              Admin note
            </p>
            <p className="mt-3 text-sm text-vyrek-text">{a.rejection_reason}</p>
            {a.reviewed_at ? (
              <p className="mt-2 font-mono text-xs text-vyrek-text-tertiary">
                Reviewed {format(new Date(a.reviewed_at), "dd MMM yyyy, HH:mm")}
              </p>
            ) : null}
          </Card>
        ) : null}
      </div>

      {a.status === "pending" ? (
        <section className="mt-10">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            Actions
          </h2>
          <ApplicationActions applicationId={a.id} />
        </section>
      ) : (
        <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          [ NO ACTIONS · APPLICATION ALREADY {a.status.toUpperCase()} ]
        </p>
      )}
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
