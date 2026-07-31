import { Num } from "@/components/control/num";

/**
 * The core admin component — spec/14 §5.
 *
 * Sticky header, 40px rows, numerics right-aligned in mono, hover-revealed
 * actions rather than a permanent column eating width, and a CSV export on
 * every table with no exceptions.
 *
 * Below 768px it becomes cards, because spec/14 §6 forbids a horizontally
 * scrolling table on mobile outright.
 */

export type Column<T> = {
  key: string;
  label: string;
  numeric?: boolean;
  render: (row: T) => React.ReactNode;
  /** Plain value for the CSV, which must not contain markup. */
  csv: (row: T) => string;
};

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  caption,
}: {
  rows: T[];
  columns: Column<T>[];
  caption: string;
}) {
  const csv = [
    columns.map((c) => c.label).join(","),
    ...rows.map((r) =>
      columns.map((c) => `"${c.csv(r).replace(/"/g, '""')}"`).join(","),
    ),
  ].join("\n");
  const href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-2)",
          marginBottom: "var(--space-1)",
        }}
      >
        <span className="eyebrow">
          {rows.length} {caption}
        </span>
        <a
          href={href}
          download={`${caption.replace(/\s+/g, "-")}.csv`}
          style={{
            minHeight: 44,
            display: "inline-flex",
            alignItems: "center",
            padding: "0 var(--space-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-button)",
            color: "var(--text-muted)",
            fontSize: "var(--text-xs)",
            textDecoration: "none",
          }}
        >
          Export CSV
        </a>
      </div>

      {/* Desktop: a real table. */}
      <div className="dt-table" style={{ border: "1px solid var(--border)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
          <thead>
            <tr style={{ background: "var(--surface)" }}>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className="eyebrow"
                  style={{
                    position: "sticky",
                    top: 0,
                    background: "var(--surface)",
                    textAlign: c.numeric ? "right" : "left",
                    padding: "0 var(--space-2)",
                    height: "var(--row-h)",
                    borderBottom: "1px solid var(--border)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    style={{
                      textAlign: c.numeric ? "right" : "left",
                      padding: "0 var(--space-2)",
                      height: "var(--row-h)",
                      borderBottom: "1px solid var(--border)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards. Never a sideways-scrolling table. */}
      <ul
        className="dt-cards"
        role="list"
        style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--space-1)" }}
      >
        {rows.map((r) => (
          <li
            key={r.id}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)",
              padding: "var(--space-2)",
              display: "grid",
              gap: 4,
            }}
          >
            {columns.map((c) => (
              <div
                key={c.key}
                style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-2)" }}
              >
                <span className="eyebrow">{c.label}</span>
                <span style={{ fontSize: "var(--text-sm)", textAlign: "right" }}>
                  {c.render(r)}
                </span>
              </div>
            ))}
          </li>
        ))}
      </ul>

      <style>{`
        .dt-cards { display: none; }
        @media (max-width: 767px) {
          .dt-table { display: none; }
          .dt-cards { display: grid; }
        }
      `}</style>
    </>
  );
}

export { Num };
