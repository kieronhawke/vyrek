import { AdminShell } from "@/components/control/admin-shell";
import { DataTable, type Column } from "@/components/control/data-table";
import { Num } from "@/components/control/num";
import { KEYWORD_ROWS, type KeywordRow } from "@/lib/control/admin-fixtures";
import { ModuleNote, StatStrip } from "@/components/control/stat-strip";

const BASE = "/control-preview/admin";

/**
 * SEO — spec/09 §10. The buyer-type filter is on by default so nobody
 * accidentally builds for job-seeker keywords: only `Client` rows are
 * customers, and that is the most important column in the database.
 */
const COLUMNS: Column<KeywordRow>[] = [
  { key: "kw", label: "Keyword", render: (r) => r.keyword, csv: (r) => r.keyword },
  {
    key: "vol", label: "Volume", numeric: true,
    render: (r) => <Num>{r.volume.toLocaleString("en-GB")}</Num>,
    csv: (r) => String(r.volume),
  },
  {
    key: "kd", label: "Difficulty", numeric: true,
    render: (r) => <Num tone={r.kd >= 30 ? "warn" : "accent"}>{r.kd}</Num>,
    csv: (r) => String(r.kd),
  },
  {
    key: "buyer", label: "Buyer",
    render: (r) => (
      <span style={{ color: r.buyerType === "Client" ? "var(--text)" : "var(--text-muted)" }}>
        {r.buyerType}
      </span>
    ),
    csv: (r) => r.buyerType,
  },
  {
    key: "page", label: "Target page",
    render: (r) => r.page ?? <span style={{ color: "var(--warn)" }}>Unmapped</span>,
    csv: (r) => r.page ?? "unmapped",
  },
];

export default function AdminSeo() {
  const buyers = KEYWORD_ROWS.filter((k) => k.buyerType === "Client");
  const unmapped = buyers.filter((k) => !k.page).length;
  return (
    <AdminShell base={BASE} title="SEO">
      <StatStrip
        stats={[
          { label: "Tracked", value: String(KEYWORD_ROWS.length) },
          {
            label: "Buyer keywords",
            value: String(KEYWORD_ROWS.filter((k) => k.buyerType === "Client").length),
            note: "The rest are job seekers",
          },
          {
            label: "Published",
            value: String(KEYWORD_ROWS.filter((k) => k.status === "published").length),
          },
          {
            label: "Unmapped buyers",
            value: String(
              KEYWORD_ROWS.filter((k) => k.buyerType === "Client" && !k.page).length,
            ),
            tone: "warn",
          },
        ]}
      />
      <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        Buyer-type filter on. <Num align="left">{unmapped}</Num> buyer keywords
        have no page yet.
      </p>
      <DataTable rows={buyers} columns={COLUMNS} caption="buyer keywords" />
      <ModuleNote>
        Rank tracking, Search Console, cannibalisation warnings and the
        uniqueness-validator dashboard arrive with Phase G. The validator
        itself is already built and tested.
      </ModuleNote>
    </AdminShell>
  );
}
