import { AdminShell } from "@/components/control/admin-shell";
import { DataTable, type Column } from "@/components/control/data-table";
import { Num } from "@/components/control/num";
import { listCoachClients, type CoachClient } from "@/lib/control/fixtures";

const BASE = "/control-preview/admin";

const TIER_LABEL: Record<CoachClient["tier"], string> = {
  hub: "Hub",
  programming: "Programming",
  coaching: "Coaching",
  elite: "Elite",
};

const COLUMNS: Column<CoachClient>[] = [
  {
    key: "name",
    label: "Client",
    render: (c) => c.name,
    csv: (c) => c.name,
  },
  {
    key: "tier",
    label: "Tier",
    render: (c) => TIER_LABEL[c.tier],
    csv: (c) => TIER_LABEL[c.tier],
  },
  {
    key: "programmed",
    label: "Programmed",
    numeric: true,
    render: (c) => (
      <Num tone={c.programmedUntilDays <= 0 ? "danger" : c.programmedUntilDays <= 7 ? "warn" : undefined}>
        {c.programmedUntilDays}d
      </Num>
    ),
    csv: (c) => `${c.programmedUntilDays}`,
  },
  {
    key: "billing",
    label: "Bills in",
    numeric: true,
    render: (c) => <Num tone="muted">{c.billingInDays}d</Num>,
    csv: (c) => `${c.billingInDays}`,
  },
  {
    key: "payment",
    label: "Payment",
    render: (c) => (
      <span
        style={{
          color:
            c.payment === "late" || c.payment === "failed"
              ? "var(--danger)"
              : "var(--text-muted)",
        }}
      >
        {c.paymentLabel}
      </span>
    ),
    csv: (c) => c.paymentLabel,
  },
  {
    key: "race",
    label: "Next race",
    render: (c) => c.nextRace?.name ?? "—",
    csv: (c) => c.nextRace?.name ?? "",
  },
];

export default function AdminClients() {
  return (
    <AdminShell base={BASE} title="Clients">
      <DataTable rows={listCoachClients()} columns={COLUMNS} caption="clients" />
      <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
        Inline editing, saved segments, bulk actions and the client detail view
        arrive with Phase B, once records are real rather than fixtures.
      </p>
    </AdminShell>
  );
}
