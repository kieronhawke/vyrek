import Link from "next/link";
import { AdminShell } from "@/components/control/admin-shell";
import { PlanBuilder } from "@/components/control/plan-builder";
import { PLAN_ROWS } from "@/lib/control/admin-fixtures";

const BASE = "/control-preview/admin";

/**
 * Write a week for one client.
 *
 * The Plans table lists who is due; this is where the plan actually gets
 * written. It closes the loop the member area opened: the athlete's verdict on
 * last week sits on the same screen as the week being written.
 */
export default async function PlanBuilderPage({
  params,
}: {
  params: Promise<{ client: string }>;
}) {
  const { client } = await params;
  const row = PLAN_ROWS.find((p) => slugify(p.client) === client);
  const name = row?.client ?? "Client";

  return (
    <AdminShell base={BASE} title={`Plan · ${name}`}>
      <p style={{ marginTop: 0, marginBottom: "var(--space-2)" }}>
        <Link
          href={`${BASE}/plans`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: 44,
            color: "var(--accent-text)",
            textDecoration: "none",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
          }}
        >
          ← All plans
        </Link>
      </p>
      <PlanBuilder client={name} />
    </AdminShell>
  );
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
