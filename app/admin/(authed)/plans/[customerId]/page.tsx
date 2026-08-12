import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { PageHeader, Card } from "@/components/admin/ui";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { plansForCustomer } from "@/lib/coach/data";
import { PlanEditor } from "@/components/coach/plan-editor";

export const dynamic = "force-dynamic";

export const metadata = { title: "Plan" };

/**
 * One client's programming, on the desktop: continue the open draft (or
 * start next week pre-filled from the last one), with the history under it.
 * Same real editor as the phone view — plans save to training_plans and
 * appear in the client's own account.
 */
export default async function AdminClientPlanPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const { data: customer } = await supabaseAdmin()
    .from("customers")
    .select("id, email, full_name")
    .eq("id", customerId)
    .maybeSingle();
  if (!customer) notFound();

  const plans = await plansForCustomer(customerId);
  const draft = plans.find((p) => p.status === "draft") ?? null;
  const lastSent = plans.find((p) => p.status === "sent") ?? null;
  const name =
    (customer.full_name as string | null)?.trim() ||
    (customer.email as string).split("@")[0];

  return (
    <>
      <PageHeader
        eyebrow="Plan"
        title={name}
        description={
          draft
            ? "Continuing a draft you haven't sent yet."
            : lastSent
              ? "Starting the next week from their last plan."
              : "Their first plan."
        }
        actions={
          <Link
            href="/admin/plans"
            className="inline-flex h-10 items-center rounded-pill border border-suth-border bg-suth-elevated px-4 text-sm text-suth-text"
          >
            ← All plans
          </Link>
        }
      />

      <div className="mc-coach-embed max-w-3xl">
        <PlanEditor
          customerId={customerId}
          clientName={name}
          draft={draft}
          template={lastSent}
        />

        {plans.filter((p) => p.status === "sent").length > 0 ? (
          <section className="mt-8">
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
              Sent before
            </h2>
            <div className="space-y-2">
              {plans
                .filter((p) => p.status === "sent")
                .map((p) => (
                  <Card key={p.id}>
                    <p className="text-sm text-suth-text">
                      <strong>{p.title}</strong>
                      <span className="text-suth-text-tertiary">
                        {" "}
                        · week of{" "}
                        {format(new Date(`${p.weekStart}T12:00:00`), "d MMM")}
                        {p.sentAtISO
                          ? ` · sent ${format(new Date(p.sentAtISO), "d MMM")}`
                          : ""}
                      </span>
                    </p>
                  </Card>
                ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
