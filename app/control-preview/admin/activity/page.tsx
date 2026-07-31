import { AdminShell } from "@/components/control/admin-shell";
import { DataTable, type Column } from "@/components/control/data-table";
import { Num } from "@/components/control/num";
import { SplitBar } from "@/components/control/split-bar";

const BASE = "/control-preview/admin";

/**
 * ACTIVITY & ANALYTICS — spec/09 §9.
 *
 * One of the three Known Blockers: specced from a description of Green Buggy
 * Hire, whose codebase was not provided (QUESTIONS §1). Built to the spec as
 * written, and flagged as likely to need rework.
 *
 * Also not yet fed by anything: the session store is Phase G and PostHog's
 * EU host is unconfirmed (STACK §3.6). These are shapes, not readings.
 */

type Session = {
  id: string;
  entry: string;
  pages: number;
  durationS: number;
  source: string;
  country: string;
  converted: boolean;
};

const SESSIONS: Session[] = [
  { id: "s1", entry: "/hyrox-training/leeds", pages: 6, durationS: 412, source: "google / organic", country: "GB", converted: true },
  { id: "s2", entry: "/", pages: 2, durationS: 48, source: "direct", country: "GB", converted: false },
  { id: "s3", entry: "/blog/first-hyrox", pages: 9, durationS: 733, source: "google / organic", country: "US", converted: true },
  { id: "s4", entry: "/club", pages: 3, durationS: 155, source: "instagram", country: "AE", converted: false },
  { id: "s5", entry: "/personal-trainer/leeds", pages: 4, durationS: 262, source: "google / organic", country: "GB", converted: false },
];

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const COLUMNS: Column<Session>[] = [
  { key: "entry", label: "Landed on", render: (s) => s.entry, csv: (s) => s.entry },
  { key: "source", label: "Source", render: (s) => s.source, csv: (s) => s.source },
  { key: "country", label: "Country", render: (s) => s.country, csv: (s) => s.country },
  {
    key: "pages",
    label: "Pages",
    numeric: true,
    render: (s) => <Num>{s.pages}</Num>,
    csv: (s) => String(s.pages),
  },
  {
    key: "time",
    label: "Time on site",
    numeric: true,
    render: (s) => <Num>{mmss(s.durationS)}</Num>,
    csv: (s) => mmss(s.durationS),
  },
  {
    key: "converted",
    label: "Outcome",
    render: (s) =>
      s.converted ? (
        <span style={{ color: "var(--accent)" }}>Quiz completed</span>
      ) : (
        <span style={{ color: "var(--text-muted)" }}>—</span>
      ),
    csv: (s) => (s.converted ? "converted" : ""),
  },
];

export default function AdminActivity() {
  const totals = {
    sessions: SESSIONS.length,
    pages: SESSIONS.reduce((n, s) => n + s.pages, 0),
    converted: SESSIONS.filter((s) => s.converted).length,
  };

  return (
    <AdminShell base={BASE} title="Activity">
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
        {[
          { label: "Sessions today", value: totals.sessions },
          { label: "Page views", value: totals.pages },
          { label: "Quiz completions", value: totals.converted },
        ].map((s) => (
          <li
            key={s.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)",
              padding: "var(--space-2)",
            }}
          >
            <Num align="left" size="metric">
              {s.value}
            </Num>
            <p className="eyebrow" style={{ marginTop: 4 }}>
              {s.label}
            </p>
          </li>
        ))}
      </ul>

      <div style={{ marginBottom: "var(--space-4)", maxWidth: 420 }}>
        <SplitBar
          label="Visitor to quiz"
          value={totals.converted}
          target={totals.sessions}
          display={`${Math.round((totals.converted / totals.sessions) * 100)}%`}
          targetLabel="sessions"
        />
      </div>

      <DataTable rows={SESSIONS} columns={COLUMNS} caption="sessions" />

      <p
        style={{
          marginTop: "var(--space-3)",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
        }}
      >
        Sample sessions. Real data needs the session store (Phase G) and
        PostHog on its EU host. This module is also one of the three Known
        Blockers: it was specced from a description of an existing system
        whose code has not been shared, so it may need rework.
      </p>
    </AdminShell>
  );
}
