import { AdminShell } from "@/components/control/admin-shell";
import { DataTable, type Column } from "@/components/control/data-table";
import { MESSAGE_ROWS, TEMPLATE_ROWS, type MessageRow, type TemplateRow } from "@/lib/control/admin-fixtures";
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

const TEMPLATES: Column<TemplateRow>[] = [
  { key: "name", label: "Template", render: (r) => r.name, csv: (r) => r.name },
  { key: "cat", label: "Category", render: (r) => r.category, csv: (r) => r.category },
  { key: "channel", label: "Channel", render: (r) => r.channel, csv: (r) => r.channel },
  {
    key: "class", label: "Class",
    render: (r) => (
      <span style={{ color: r.classification === "marketing" ? "var(--warn)" : "var(--text-muted)" }}>
        {r.classification}
      </span>
    ),
    csv: (r) => r.classification,
  },
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
          { label: "Templates", value: String(TEMPLATE_ROWS.length) },
          {
            label: "Marketing class",
            value: String(TEMPLATE_ROWS.filter((t) => t.classification === "marketing").length),
            tone: "warn",
            note: "Blocked after opt-out",
          },
        ]}
      />
      <DataTable rows={MESSAGE_ROWS} columns={INBOX} caption="messages" />

      <h2 className="eyebrow" style={{ margin: "var(--space-4) 0 var(--space-1)" }}>
        Template library
      </h2>
      <DataTable rows={TEMPLATE_ROWS} columns={TEMPLATES} caption="templates" />

      <ModuleNote>
        Sending needs Twilio and a verified Resend domain. 33 branded email
        templates and 15 SMS messages are already written and tested; the
        library above is where they become editable without a deploy.
      </ModuleNote>
    </AdminShell>
  );
}
