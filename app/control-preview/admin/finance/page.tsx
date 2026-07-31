import { AdminShell } from "@/components/control/admin-shell";
import { DataTable, type Column } from "@/components/control/data-table";
import { SplitBar } from "@/components/control/split-bar";
import { ModuleNote, StatStrip, type Stat } from "@/components/control/stat-strip";

const BASE = "/control-preview/admin";

/** FINANCE — spec/09 §6. Live metrics, receivables, and an audit trail. */
const METRICS: Stat[] = [
  { label: "MRR", value: "£4,240" },
  { label: "ARR", value: "£50,880" },
  { label: "ARPU", value: "£707" },
  { label: "Churn", value: "2.1%" },
  { label: "Outstanding", value: "£420" },
  { label: "Overdue", value: "£163", tone: "danger" },
];

export default function AdminFinance() {
  return (
    <AdminShell base={BASE} title="Finance">
      <StatStrip stats={METRICS} />

      <div style={{ display: "grid", gap: "var(--space-4)", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" }}>
        <SplitBar label="MRR vs target" value={4240} target={5000} max={6000} display="£4,240" targetLabel="target" />
        <SplitBar label="Collected" value={3820} target={4240} max={4240} display="£3,820" targetLabel="due" />
      </div>

      <ModuleNote>
        Sample figures. Cohort retention, the chase log, forecasting and the
        VAT-ready export arrive with Phase C, once Stripe is connected. Every
        financial action is written to an append-only audit log.
      </ModuleNote>
    </AdminShell>
  );
}
