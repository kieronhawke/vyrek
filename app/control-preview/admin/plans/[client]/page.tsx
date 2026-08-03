import Link from "next/link";
import { AdminShell } from "@/components/control/admin-shell";
import { WeekBuilder } from "@/components/control/week-builder";
import { PLAN_ROWS } from "@/lib/control/admin-fixtures";

const BASE = "/control-preview/admin";

/**
 * Write a week for one client, in the shape of the spreadsheet Ben already
 * uses: seven day columns, AM and PM rows, free text, plus a block library he
 * can drag from. Autosaves; the athlete's Plan screen reads the same store.
 */
export default async function PlanBuilderPage({
  params,
}: {
  params: Promise<{ client: string }>;
}) {
  const { client } = await params;
  const row = PLAN_ROWS.find(
    (p) => p.client.toLowerCase().replace(/[^a-z0-9]+/g, "-") === client,
  );
  const name = row?.client ?? "Haseeb";

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
      <WeekBuilder client={name} />
    </AdminShell>
  );
}
