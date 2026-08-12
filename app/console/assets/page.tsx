import { AdminShell } from "@/components/control/admin-shell";
import { DataTable, type Column } from "@/components/control/data-table";
import { ASSET_ROWS, type AssetRow } from "@/lib/control/admin-fixtures";
import { ModuleNote, StatStrip } from "@/components/control/stat-strip";

const BASE = "/console";

/**
 * MARKETING ASSETS — spec/09 §11. Usage rights recorded on every asset, and
 * AI-generated material excluded, which is why `rights` is a column rather
 * than a note somewhere.
 */
const COLUMNS: Column<AssetRow>[] = [
  { key: "name", label: "Asset", render: (r) => r.name, csv: (r) => r.name },
  { key: "kind", label: "Type", render: (r) => r.kind, csv: (r) => r.kind },
  { key: "rights", label: "Rights", render: (r) => r.rights, csv: (r) => r.rights },
  {
    key: "approved", label: "External use",
    render: (r) => (
      <span style={{ color: r.approved ? "var(--accent)" : "var(--text-muted)" }}>
        {r.approved ? "Approved" : "Internal only"}
      </span>
    ),
    csv: (r) => (r.approved ? "approved" : "internal"),
  },
];

export default function AdminAssets() {
  return (
    <AdminShell base={BASE} title="Assets">
      <StatStrip
        stats={[
          { label: "Assets", value: String(ASSET_ROWS.length) },
          {
            label: "Cleared for external use",
            value: String(ASSET_ROWS.filter((a) => a.approved).length),
          },
          {
            label: "Rights recorded",
            value: `${ASSET_ROWS.filter((a) => a.rights).length}/${ASSET_ROWS.length}`,
            note: "Required on every asset",
          },
          { label: "AI-generated", value: "0", note: "Excluded by policy" },
        ]}
      />
      <DataTable rows={ASSET_ROWS} columns={COLUMNS} caption="assets" />
      <ModuleNote>
        Brand tokens with copy-to-clipboard hex values, email signatures and
        social templates arrive with Phase H. AI-generated images are excluded
        from this library by policy.
      </ModuleNote>
    </AdminShell>
  );
}
