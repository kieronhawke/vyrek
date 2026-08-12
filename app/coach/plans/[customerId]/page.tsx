import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { plansForCustomer } from "@/lib/coach/data";
import { PlanEditor } from "@/components/coach/plan-editor";

export const dynamic = "force-dynamic";

/**
 * One client's programming: continue the open draft (or start the next
 * week pre-filled from the last sent plan), with the history underneath.
 */
export default async function CoachClientPlanPage({
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
      <p style={{ margin: "0 0 2px", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        <Link href="/coach/plans" style={{ color: "inherit" }}>
          ← All plans
        </Link>
      </p>
      <h1
        style={{
          fontSize: "var(--text-xl)",
          lineHeight: "var(--text-xl-lh)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          margin: "0 0 var(--space-1)",
        }}
      >
        {name}
      </h1>
      <p style={{ margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        {draft
          ? "Continuing a draft you haven't sent yet."
          : lastSent
            ? "Starting the next week from their last plan."
            : "Their first plan."}
      </p>

      <PlanEditor
        customerId={customerId}
        clientName={name}
        draft={draft}
        template={lastSent}
      />

      {plans.filter((p) => p.status === "sent").length > 0 ? (
        <section style={{ marginTop: "var(--space-4)" }}>
          <h2 style={{ fontSize: "var(--text-md)", fontWeight: 800, margin: "0 0 var(--space-2)" }}>
            Sent before
          </h2>
          <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {plans
              .filter((p) => p.status === "sent")
              .map((p) => (
                <li
                  key={p.id}
                  style={{
                    padding: "var(--space-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    background: "var(--surface)",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  <strong>{p.title}</strong>
                  <span style={{ color: "var(--text-muted)" }}>
                    {" "}
                    · week of{" "}
                    {new Date(`${p.weekStart}T12:00:00`).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                    {p.sentAtISO
                      ? ` · sent ${new Date(p.sentAtISO).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                      : ""}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
