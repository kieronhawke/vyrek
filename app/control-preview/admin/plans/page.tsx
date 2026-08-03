import { AdminShell } from "@/components/control/admin-shell";
import { DataTable, type Column } from "@/components/control/data-table";
import { Num } from "@/components/control/num";
import { PLAN_ROWS, type PlanRow } from "@/lib/control/admin-fixtures";
import { ModuleNote, StatStrip } from "@/components/control/stat-strip";

const BASE = "/control-preview/admin";

/**
 * PLANS — spec/09 §4. The Coach's Note column is the important one: a plan
 * with an empty note cannot be sent (HARD-RULES §3), so it is surfaced here
 * rather than discovered at the send button.
 */
const COLUMNS: Column<PlanRow>[] = [
  {
    key: "client",
    label: "Client",
    // The table said who was due a plan and gave you nowhere to write it.
    render: (r) => (
      <a
        href={`${BASE}/plans/${r.client.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          minHeight: 44,
          color: "var(--accent-text)",
          fontWeight: 600,
        }}
      >
        {r.client}
      </a>
    ),
    csv: (r) => r.client,
  },
  { key: "block", label: "Block", render: (r) => r.block, csv: (r) => r.block },
  {
    key: "status", label: "Status",
    render: (r) => (
      <span style={{ color: r.status === "Overdue" ? "var(--danger)" : r.status === "Draft" ? "var(--warn)" : "var(--text)" }}>
        {r.status}
      </span>
    ),
    csv: (r) => r.status,
  },
  {
    key: "note", label: "Coach's note",
    render: (r) =>
      r.coachNote ? (
        <span style={{ color: "var(--accent-text)" }}>Written</span>
      ) : (
        <span style={{ color: "var(--danger)" }}>Missing, blocks send</span>
      ),
    csv: (r) => (r.coachNote ? "written" : "missing"),
  },
  { key: "opened", label: "Opened", render: (r) => r.opened, csv: (r) => r.opened },
];

export default function AdminPlans() {
  return (
    <AdminShell
      base={BASE}
      title="Plans"
      /* Ben also writes plans that belong to nobody yet — a template, a
         one-off for an enquiry, a block drafted before the person has an
         account. It needed a way in that was not "pick a client first". */
      action={
        <a
          href={`${BASE}/plans/new`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: 44,
            padding: "0 18px",
            borderRadius: 999,
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontSize: "var(--text-sm)",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          + New plan
        </a>
      }
    >
      <StatStrip
        stats={[
          { label: "Plans", value: String(PLAN_ROWS.length) },
          {
            label: "Missing coach's note",
            value: String(PLAN_ROWS.filter((p) => !p.coachNote).length),
            tone: "danger",
            note: "Cannot be sent until written",
          },
          {
            label: "Overdue",
            value: String(PLAN_ROWS.filter((p) => p.status === "Overdue").length),
            tone: "warn",
          },
          {
            label: "Active",
            value: String(PLAN_ROWS.filter((p) => p.status === "Active").length),
          },
        ]}
      />
      <DataTable rows={PLAN_ROWS} columns={COLUMNS} caption="plans" />
      <ModuleNote>
        The builder, version history and PDF generation arrive with Phase D.
        The Coach&apos;s Note has no AI-assist and never will: the moment that
        button exists it gets used every time.
      </ModuleNote>
    </AdminShell>
  );
}
