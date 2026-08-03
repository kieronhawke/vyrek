import { AdminShell } from "@/components/control/admin-shell";
import { DataTable, type Column } from "@/components/control/data-table";
import { MESSAGE_ROWS, type MessageRow } from "@/lib/control/admin-fixtures";
import { Messaging } from "@/components/control/messaging";
import { SEED_TEMPLATES } from "@/lib/control/messaging";
import { ModuleNote, StatStrip } from "@/components/control/stat-strip";

const BASE = "/control-preview/admin";

/**
 * MESSAGES — spec/09 §8. One inbox; SMS and email look identical to Ben.
 *
 * The template table shows `classification` because it is legally
 * load-bearing (HARD-RULES §11): marketing is blocked after opt-out,
 * transactional continues, and the column is NOT NULL for that reason.
 */
const INBOX: Column<MessageRow>[] = [
  { key: "when", label: "When", render: (r) => r.when, csv: (r) => r.when },
  { key: "client", label: "Who", render: (r) => r.client, csv: (r) => r.client },
  { key: "channel", label: "Channel", render: (r) => r.channel, csv: (r) => r.channel },
  {
    // Labelled rather than blank: the table can carry an empty header, but
    // the mobile card view prints the label beside every value, and a naked
    // "In" with nothing next to it means nothing.
    key: "dir", label: "Direction",
    render: (r) => (
      <span style={{ color: r.direction === "In" ? "var(--accent)" : "var(--text-muted)" }}>
        {r.direction}
      </span>
    ),
    csv: (r) => r.direction,
  },
  { key: "preview", label: "Message", render: (r) => r.preview, csv: (r) => r.preview },
];

export default function AdminMessages() {
  return (
    <AdminShell base={BASE} title="Messages">
      <StatStrip
        stats={[
          {
            label: "Awaiting a reply",
            value: String(MESSAGE_ROWS.filter((m) => m.direction === "In").length),
            tone: "accent",
          },
          { label: "Threads today", value: String(MESSAGE_ROWS.length) },
          { label: "Templates", value: String(SEED_TEMPLATES.length) },
          {
            label: "Marketing class",
            value: String(
              SEED_TEMPLATES.filter((t) => t.classification === "marketing").length,
            ),
            tone: "warn",
            note: "Blocked after opt-out",
          },
        ]}
      />
      <DataTable rows={MESSAGE_ROWS} columns={INBOX} caption="messages" />

      <h2 className="eyebrow" style={{ margin: "var(--space-4) 0 var(--space-1)" }}>
        Everything the app sends
      </h2>
      <Messaging />

      <ModuleNote>
        Sending needs Twilio and a verified Resend domain. The wording, the
        switches and the per-client rules are real and saved; nothing leaves
        the building until those credentials exist.
      </ModuleNote>
    </AdminShell>
  );
}
