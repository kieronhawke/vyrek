import { AdminShell } from "@/components/control/admin-shell";
import { DataTable, type Column } from "@/components/control/data-table";
import { ModuleNote, StatStrip } from "@/components/control/stat-strip";
const BASE = "/control-preview/admin";

/**
 * WEBSITE SETTINGS — spec/09 §12. Everything on the public site that should
 * be changeable without a deploy, plus Ben's short safe subset.
 */
const GROUPS = [
  { title: "Homepage", items: ["Hero headline", "Subhead", "CTA text", "Background image"] },
  { title: "Ben", items: ["Bio", "Credentials", "Race record", "Profile photo"] },
  { title: "Pricing", items: ["Tier names", "Prices per currency", "Feature lists", "What is highlighted"] },
  { title: "Coaching", items: ["Spots available", "Applications open"] },
  { title: "Content", items: ["Testimonials (real only, source required)", "FAQ", "Announcement banner"] },
  { title: "Flags", items: ["Quiz on/off", "Results Hub public", "Trial length", "Maintenance mode"] },
];

export default function AdminSettings() {
  return (
    <AdminShell base={BASE} title="Settings">
      <StatStrip
        stats={[
          { label: "Editable groups", value: String(GROUPS.length) },
          {
            label: "Fields",
            value: String(GROUPS.reduce((n, g) => n + g.items.length, 0)),
          },
          { label: "Needs a deploy", value: "0", note: "Once the database is live" },
          {
            label: "Ben can edit",
            value: "2",
            note: "Coaching and Content only",
          },
        ]}
      />
      <div style={{ display: "grid", gap: "var(--space-2)", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))" }}>
        {GROUPS.map((g) => (
          <section key={g.title} style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)", padding: "var(--space-2)",
          }}>
            <p className="eyebrow">{g.title}</p>
            <ul role="list" style={{ listStyle: "none", margin: "var(--space-1) 0 0", padding: 0, display: "grid", gap: 4 }}>
              {g.items.map((i) => (
                <li key={i} style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{i}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <ModuleNote>
        Editing needs the database. Testimonials carry a source field that
        cannot be left blank: no fabricated proof, ever, not even as a
        placeholder.
      </ModuleNote>
    </AdminShell>
  );
}
