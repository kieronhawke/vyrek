import { AdminShell } from "@/components/control/admin-shell";
import { DataTable, type Column } from "@/components/control/data-table";
import { APPT_ROWS, type ApptRow } from "@/lib/control/admin-fixtures";
import { ModuleNote, StatStrip } from "@/components/control/stat-strip";

const BASE = "/control-preview/admin";

/** DIARY — spec/09 §7. Two-way Google Calendar sync arrives in Phase F. */
const COLUMNS: Column<ApptRow>[] = [
  { key: "when", label: "When", render: (r) => r.when, csv: (r) => r.when },
  { key: "client", label: "Who", render: (r) => r.client, csv: (r) => r.client },
  { key: "type", label: "Type", render: (r) => r.type, csv: (r) => r.type },
  {
    key: "status", label: "Status",
    render: (r) => (
      <span style={{ color: r.status === "No show" ? "var(--danger)" : "var(--text-muted)" }}>
        {r.status}
      </span>
    ),
    csv: (r) => r.status,
  },
];

export default function AdminDiary() {
  return (
    <AdminShell base={BASE} title="Diary">
      <StatStrip
        stats={[
          { label: "Booked", value: String(APPT_ROWS.length) },
          {
            label: "Confirmed",
            value: String(APPT_ROWS.filter((a) => a.status === "Confirmed").length),
          },
          {
            label: "Awaiting confirmation",
            value: String(APPT_ROWS.filter((a) => a.status === "Scheduled").length),
            tone: "accent",
          },
          {
            label: "No shows",
            value: String(APPT_ROWS.filter((a) => a.status === "No show").length),
            tone: "danger",
          },
        ]}
      />
      <DataTable rows={APPT_ROWS} columns={COLUMNS} caption="appointments" />
      <ModuleNote>
        Google Calendar sync, booking links and reminders arrive with Phase F.
        Whether Ben actually uses Google Calendar is an open question
        (QUESTIONS §14) and changes the integration route if not.
      </ModuleNote>
    </AdminShell>
  );
}
