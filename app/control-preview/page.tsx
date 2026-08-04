import { Num } from "@/components/control/num";
import { SplitBar } from "@/components/control/split-bar";

/**
 * PHASE 0 PROOF SURFACE
 *
 * PLAN.md closes Phase 0 when "a page rendering nothing but a split bar and
 * a numeric table passes the device matrix, the scroll gate, axe, and the
 * visual-regression baseline". This is that page.
 *
 * It stays in the repo afterwards as the reference for every later phase:
 * the tokens, the type scale, the signature element and the table
 * conventions in one place, so a component built in Phase D can be checked
 * against it without re-reading spec/14.
 *
 * Deliberately not behind admin auth: it contains no data. Deliberately
 * noindex: it is internal.
 */

const SWATCHES = [
  ["--bg", "Base background"],
  ["--surface", "Cards, panels"],
  ["--surface-raised", "Modals, active rows"],
  ["--border", "Hairlines"],
  ["--border-strong", "Input borders"],
  ["--accent", "Primary action"],
  ["--accent-hover", "Hover"],
  ["--accent-glow", "Focus glow"],
  ["--accent-faint", "Accent-tinted bg"],
  ["--text", "Primary"],
  ["--text-muted", "Secondary"],
  ["--text-faint", "Tertiary"],
  ["--warn", "Due soon"],
  ["--danger", "Overdue, failed"],
  ["--info", "Neutral info"],
] as const;

/** Stand-in rows. No real client data, and none of it is presented as real. */
const ROWS = [
  { client: "Amelia Fraser", until: 2, paid: "12 Aug", race: 42, rate: 8000 },
  { client: "Marcus Bell", until: 18, paid: "3 days late", race: 96, rate: 15000 },
  { client: "Priya Raman", until: -3, paid: "3 Aug", race: 7, rate: 1299 },
  { client: "Tom Whitaker", until: 26, paid: "28 Aug", race: 180, rate: 25000 },
];

const cell: React.CSSProperties = {
  padding: "0 var(--space-2)",
  height: "var(--row-h)",
  borderBottom: "1px solid var(--border)",
  whiteSpace: "nowrap",
};

export default function ControlPreviewPage() {
  return (
    <main
      style={{
        maxWidth: "var(--content-max)",
        margin: "0 auto",
        padding: "var(--space-4) var(--space-2)",
      }}
    >
      <p className="eyebrow">Phase 0 · design system</p>
      <h1
        style={{
          fontSize: "var(--text-2xl)",
          lineHeight: "var(--text-2xl-lh)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          margin: "var(--space-1) 0 var(--space-4)",
        }}
      >
        Tokens, numerics and the split bar
      </h1>

      {/* ── The signature element ──────────────────────────────────── */}
      <section style={{ marginBottom: "var(--space-6)" }}>
        <h2
          className="eyebrow"
          style={{ marginBottom: "var(--space-3)" }}
        >
          Split bar · every state
        </h2>

        <div
          style={{
            display: "grid",
            gap: "var(--space-4)",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          }}
        >
          <SplitBar
            label="Programmed until"
            value={12}
            target={9}
            max={30}
            direction="down"
            display="12 DAYS"
            targetLabel="renewal"
          />
          <SplitBar
            label="Programmed until"
            value={2}
            target={9}
            max={30}
            direction="down"
            display="2 DAYS"
            targetLabel="renewal"
          />
          <SplitBar
            label="Sessions completed"
            value={11}
            target={12}
            display="11 / 12"
            targetLabel="planned"
          />
          <SplitBar
            label="Collected this month"
            value={4200}
            target={3800}
            max={5000}
            display="£4,200"
            targetLabel="due"
          />
        </div>
      </section>

      {/* ── Numerics ───────────────────────────────────────────────── */}
      <section style={{ marginBottom: "var(--space-6)" }}>
        <h2 className="eyebrow" style={{ marginBottom: "var(--space-3)" }}>
          Numerics · Geist Mono, tabular
        </h2>
        <div
          style={{
            display: "flex",
            gap: "var(--space-5)",
            flexWrap: "wrap",
            alignItems: "baseline",
          }}
        >
          <div>
            <p className="eyebrow">Hero metric</p>
            <Num size="metric-lg" align="left">
              01:12:44
            </Num>
          </div>
          <div>
            <p className="eyebrow">Metric</p>
            <Num size="metric" align="left" tone="accent">
              +4.2%
            </Num>
          </div>
          <div>
            <p className="eyebrow">Inline</p>
            <br />
            <Num align="left">1,111.11</Num>
            <br />
            <Num align="left">8,888.88</Num>
          </div>
        </div>
      </section>

      {/* ── Table ──────────────────────────────────────────────────── */}
      <section style={{ marginBottom: "var(--space-6)" }}>
        <h2 className="eyebrow" style={{ marginBottom: "var(--space-3)" }}>
          Table · numerics right-aligned, 40px rows
        </h2>

        {/* The wrapper scrolls, never the page. spec/14 §6 and HARD-RULES
            §13: zero horizontal scroll at any breakpoint.

            tabIndex + role + label because a scrollable region that only
            responds to a trackpad is unreachable by keyboard. axe flags it
            as scrollable-region-focusable and it is a real barrier, not a
            technicality: on a narrow screen this table is the only way to
            see the right-hand columns. */}
        <div
          tabIndex={0}
          role="group"
          aria-label="Client table, scrolls horizontally"
          style={{ overflowX: "auto", border: "1px solid var(--border)" }}
        >
          <table
            style={{
              width: "100%",
              minWidth: 480,
              borderCollapse: "collapse",
              fontSize: "var(--text-sm)",
            }}
          >
            <thead>
              <tr style={{ background: "var(--surface)" }}>
                <th scope="col" className="eyebrow" style={{ ...cell, textAlign: "left" }}>
                  Client
                </th>
                <th scope="col" className="eyebrow" style={{ ...cell, textAlign: "right" }}>
                  Days left
                </th>
                <th scope="col" className="eyebrow" style={{ ...cell, textAlign: "left" }}>
                  Paid
                </th>
                <th scope="col" className="eyebrow" style={{ ...cell, textAlign: "right" }}>
                  Race in
                </th>
                <th scope="col" className="eyebrow" style={{ ...cell, textAlign: "right" }}>
                  Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.client}>
                  <td style={{ ...cell, textAlign: "left" }}>{r.client}</td>
                  <td style={{ ...cell, textAlign: "right" }}>
                    <Num tone={r.until < 0 ? "danger" : r.until <= 3 ? "warn" : undefined}>
                      {r.until}
                    </Num>
                  </td>
                  <td style={{ ...cell, textAlign: "left" }}>{r.paid}</td>
                  <td style={{ ...cell, textAlign: "right" }}>
                    <Num tone="muted">{r.race}</Num>
                  </td>
                  <td style={{ ...cell, textAlign: "right" }}>
                    <Num>£{(r.rate / 100).toFixed(2)}</Num>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Palette ────────────────────────────────────────────────── */}
      <section>
        <h2 className="eyebrow" style={{ marginBottom: "var(--space-3)" }}>
          Palette · spec/14 §2, all fifteen
        </h2>
        <ul
          role="list"
          style={{
            display: "grid",
            gap: "var(--space-1)",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            listStyle: "none",
            margin: 0,
            padding: 0,
          }}
        >
          {SWATCHES.map(([token, use]) => (
            <li
              key={token}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-card)",
                padding: "var(--space-1)",
                display: "flex",
                gap: "var(--space-1)",
                alignItems: "center",
                minWidth: 0,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 28,
                  height: 28,
                  flexShrink: 0,
                  background: `var(${token})`,
                  border: "1px solid var(--border-strong)",
                }}
              />
              <span style={{ minWidth: 0 }}>
                <Num align="left" tone="muted" className="block">
                  {token}
                </Num>
                <span
                  style={{
                    display: "block",
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {use}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
