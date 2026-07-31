import { AdminShell } from "@/components/control/admin-shell";
import { Num } from "@/components/control/num";
import { SplitBar } from "@/components/control/split-bar";
import { listCoachClients, listLeads, todayCounts } from "@/lib/control/fixtures";

const BASE = "/control-preview/admin";

/**
 * Operator dashboard — "the state of the business" (spec/09 §0), as against
 * Coach Mode's "what needs me today".
 *
 * Unlike Coach Mode this one does show money, because Kieron is the operator
 * and the split is deliberate.
 */
export default function AdminDashboard() {
  const clients = listCoachClients();
  const counts = todayCounts();
  const leads = listLeads();

  const stats = [
    { label: "MRR", value: "£4,240", tone: undefined },
    { label: "Active clients", value: String(clients.length), tone: undefined },
    { label: "New leads", value: String(leads.length), tone: "accent" as const },
    { label: "Payments late", value: String(counts.paymentsLate), tone: "danger" as const },
  ];

  return (
    <AdminShell base={BASE} title="Dashboard">
      <ul
        role="list"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "var(--space-1)",
          listStyle: "none",
          margin: "0 0 var(--space-4)",
          padding: 0,
        }}
      >
        {stats.map((s) => (
          <li
            key={s.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)",
              padding: "var(--space-2)",
            }}
          >
            <Num align="left" size="metric" tone={s.tone}>
              {s.value}
            </Num>
            <p className="eyebrow" style={{ marginTop: 4 }}>
              {s.label}
            </p>
          </li>
        ))}
      </ul>

      <div
        style={{
          display: "grid",
          gap: "var(--space-4)",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        <SplitBar
          label="MRR vs target"
          value={4240}
          target={5000}
          max={6000}
          display="£4,240"
          targetLabel="target"
        />
        <SplitBar
          label="Collected this month"
          value={3820}
          target={4240}
          max={4240}
          display="£3,820"
          targetLabel="due"
        />
        <SplitBar
          label="Plans programmed"
          value={clients.length - counts.plansDue}
          target={clients.length}
          display={`${clients.length - counts.plansDue} / ${clients.length}`}
          targetLabel="clients"
        />
      </div>

      <p
        style={{
          marginTop: "var(--space-4)",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
        }}
      >
        Sample figures. This preview mounts at /admin behind auth once the
        database is connected.
      </p>
    </AdminShell>
  );
}
