import { render } from "@react-email/components";
import { CommsEditor } from "@/components/control/comms-editor";
import { CommsHub } from "@/components/control/comms-hub";
import { EMAIL_SAMPLES } from "@/lib/email/catalogue";
import { SMS_SAMPLES, isGsm7, segments } from "@/lib/sms/messages";
import { AdminShell } from "@/components/control/admin-shell";
import { DataTable, type Column } from "@/components/control/data-table";
import { MESSAGE_ROWS, type MessageRow } from "@/lib/control/admin-fixtures";
import { Messaging } from "@/components/control/messaging";
import { SEED_TEMPLATES } from "@/lib/control/messaging";
import { TEMPLATES } from "@/lib/comms/templates";
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

/* The emails are rendered per request rather than at build time. They are
   React components, so a wording change would otherwise be invisible here
   until the next deploy — which is the one place it must not be. */
export const dynamic = "force-dynamic";

export default async function AdminMessages() {
  /* Rendered on the server, from the same templates the sender uses. A
     preview built from a second copy of the markup is a preview that drifts,
     and the whole point of this screen is to approve what actually goes out. */
  const emails = await Promise.all(
    EMAIL_SAMPLES.map(async (s) => ({
      id: s.id,
      audience: s.audience,
      when: s.when,
      subject: s.subject,
      html: await render(s.element, { pretty: false }),
    })),
  );

  const texts = SMS_SAMPLES.map((s) => ({
    id: s.id,
    audience: s.audience,
    when: s.when,
    text: s.text,
    segments: segments(s.text),
    gsm7: isGsm7(s.text),
  }));

  return (
    <AdminShell base={BASE} title="Messages">
      {/* Everything the business says, in the form it will be read in. The
          email preview is the real email, not a description of one. */}
      <CommsHub emails={emails} texts={texts} />

      <h2 className="eyebrow" style={{ margin: "var(--space-4) 0 var(--space-1)" }}>
        Change the wording
      </h2>
      {/* Editing the words, for somebody who does not write code. Tokens are
          buttons, the preview is always on, and a text says what it costs
          before it is sent. */}
      <CommsEditor />

      <StatStrip
        stats={[
          {
            label: "Awaiting a reply",
            value: String(MESSAGE_ROWS.filter((m) => m.direction === "In").length),
            tone: "accent",
          },
          { label: "Threads today", value: String(MESSAGE_ROWS.length) },
          /* Counted across everything above, not just the per-client rules
             below. "Templates 9" against a page listing forty-eight messages
             is a number that makes the reader distrust the other three. */
          {
            label: "Messages in total",
            value: String(EMAIL_SAMPLES.length + SMS_SAMPLES.length),
            note: `${TEMPLATES.length} with editable wording`,
          },
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
