import { AdminShell } from "@/components/control/admin-shell";
import { DataTable, type Column } from "@/components/control/data-table";
import { Num } from "@/components/control/num";
import { DUNNING_LADDER, evaluateDunning } from "@/lib/control/dunning";

const BASE = "/console";

type Row = {
  id: string;
  client: string;
  amount: number;
  daysOverdue: number;
  method: "card" | "cash" | "bank_transfer";
};

const ROWS: Row[] = [
  { id: "p1", client: "Marcus Bell", amount: 15000, daysOverdue: 7, method: "card" },
  { id: "p2", client: "Daniel Osei", amount: 1299, daysOverdue: 12, method: "card" },
  { id: "p3", client: "Amelia Fraser", amount: 8000, daysOverdue: -3, method: "card" },
  { id: "p4", client: "Tom Whitaker", amount: 25000, daysOverdue: -1, method: "bank_transfer" },
];

const money = (p: number) => `£${(p / 100).toFixed(2)}`;

/** Where each client sits on the ladder, straight from the state machine. */
function ladderLabel(daysOverdue: number) {
  const state = evaluateDunning({ daysOverdue });
  if (!state.currentStep) return "Not due yet";
  if (state.awaitingHuman) return "Needs a human";
  return `Step ${state.currentStep.step} · ${state.currentStep.tone}`;
}

const COLUMNS: Column<Row>[] = [
  { key: "client", label: "Client", render: (r) => r.client, csv: (r) => r.client },
  {
    key: "amount",
    label: "Amount",
    numeric: true,
    render: (r) => <Num>{money(r.amount)}</Num>,
    csv: (r) => money(r.amount),
  },
  {
    key: "state",
    label: "Status",
    render: (r) => (
      <span
        style={{
          color:
            r.daysOverdue >= 10
              ? "var(--danger)"
              : r.daysOverdue > 0
                ? "var(--warn)"
                : "var(--text-muted)",
        }}
      >
        {r.daysOverdue > 0 ? `${r.daysOverdue}d overdue` : "Upcoming"}
      </span>
    ),
    csv: (r) => (r.daysOverdue > 0 ? `${r.daysOverdue} days overdue` : "upcoming"),
  },
  {
    key: "ladder",
    label: "Chasing",
    render: (r) => ladderLabel(r.daysOverdue),
    csv: (r) => ladderLabel(r.daysOverdue),
  },
  {
    key: "method",
    label: "Method",
    render: (r) => r.method.replace("_", " "),
    csv: (r) => r.method,
  },
];

export default function AdminPayments() {
  return (
    <AdminShell base={BASE} title="Payments">
      <DataTable rows={ROWS} columns={COLUMNS} caption="payments" />

      <h2 className="eyebrow" style={{ margin: "var(--space-4) 0 var(--space-1)" }}>
        The chasing ladder
      </h2>
      <ul
        role="list"
        style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 2 }}
      >
        {DUNNING_LADDER.map((s) => (
          <li
            key={s.step}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "var(--space-2)",
              padding: "var(--space-1) var(--space-2)",
              background: "var(--surface)",
              borderLeft: `2px solid ${s.humanDecision ? "var(--danger)" : "var(--border-strong)"}`,
              fontSize: "var(--text-sm)",
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>
              <Num align="left">
                {s.dayOffset >= 0 ? `+${s.dayOffset}` : s.dayOffset}
              </Num>
              d · {s.channel}
            </span>
            <span style={{ textAlign: "right" }}>{s.tone}</span>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
        Nobody is ever auto-cancelled for non-payment. After day 10 it becomes
        a conversation.
      </p>
    </AdminShell>
  );
}
