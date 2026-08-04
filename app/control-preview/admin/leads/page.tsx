import { AdminShell } from "@/components/control/admin-shell";
import { DataTable, type Column } from "@/components/control/data-table";
import { Num } from "@/components/control/num";
import { ModuleNote, StatStrip } from "@/components/control/stat-strip";
import { LEAD_ROWS, type LeadRow } from "@/lib/control/admin-fixtures";
import { LeadPipeline } from "@/components/control/lead-pipeline";

const BASE = "/control-preview/admin";

/**
 * LEADS — spec/09 §2. Pipeline New → Contacted → Qualified → Trial → Client.
 * Anything untouched past 24h is escalated, past 72h flagged at-risk.
 */
const COLUMNS: Column<LeadRow>[] = [
  { key: "name", label: "Client", render: (r) => r.name, csv: (r) => r.name },
  { key: "segment", label: "Segment", render: (r) => r.segment, csv: (r) => r.segment },
  { key: "status", label: "Stage", render: (r) => r.status, csv: (r) => r.status },
  { key: "source", label: "Source", render: (r) => r.source, csv: (r) => r.source },
  {
    key: "age", label: "Waiting", numeric: true,
    render: (r) => (
      <Num tone={r.ageHours >= 72 ? "danger" : r.ageHours >= 24 ? "warn" : undefined}>
        {r.ageHours}h
      </Num>
    ),
    csv: (r) => `${r.ageHours}`,
  },
];

export default function AdminLeads() {
  const stale = LEAD_ROWS.filter((l) => l.ageHours >= 24 && l.status === "New");
  const untouched = LEAD_ROWS.filter((l) => l.status === "New");
  const slowest = Math.max(...LEAD_ROWS.map((l) => l.ageHours));
  return (
    <AdminShell base={BASE} title="Leads">
      <StatStrip
        stats={[
          { label: "In pipeline", value: String(LEAD_ROWS.length) },
          {
            label: "Not yet contacted",
            value: String(untouched.length),
            tone: untouched.length > 0 ? "accent" : undefined,
          },
          {
            label: "Waiting over 24h",
            value: String(stale.length),
            tone: stale.length > 0 ? "warn" : undefined,
          },
          {
            label: "Longest wait",
            value: `${slowest}h`,
            tone: slowest >= 72 ? "danger" : undefined,
          },
        ]}
      />
      {stale.length > 0 ? (
        <p style={{
          background: "var(--surface)", border: "1px solid var(--warn)",
          borderRadius: "var(--radius-card)", padding: "var(--space-2)",
          margin: "0 0 var(--space-3)", fontSize: "var(--text-sm)",
        }}>
          <Num align="left" tone="warn">{stale.length}</Num>{" "}
          {stale.length === 1 ? "new lead has" : "new leads have"} been waiting
          over 24 hours. Speed to first contact is the single biggest lever on
          whether they answer.
        </p>
      ) : null}
      {/* The pipeline is the working surface: one card per lead, one
          question each. The table below it stays, because sorting and CSV
          are still the right tool when you want the whole list at once. */}
      <LeadPipeline
        leads={LEAD_ROWS.map((r) => ({
          id: r.id,
          name: r.name,
          email: "kieronhawke@gmail.com",
          phone: "07398790378",
          segment: r.segment,
          source: r.source,
          ageHours: r.ageHours,
        }))}
      />

      <DataTable rows={LEAD_ROWS} columns={COLUMNS} caption="leads" />
      <ModuleNote>
        Kanban view, lead detail with the full timeline, and the automatic SMS
        acknowledgement arrive with Phase B. The SMS needs Twilio.
      </ModuleNote>
    </AdminShell>
  );
}
