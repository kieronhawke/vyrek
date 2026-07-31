import { Num } from "@/components/control/num";

/**
 * STAT STRIP — the row of headline numbers above a module's table.
 *
 * spec/14 §5 asks for the operator surface to answer "what is the state of
 * this?" before it answers "what are the rows?". Every module therefore opens
 * with the two to four numbers that would make Kieron act, then the table.
 *
 * Extracted from the dashboard so the thinner modules get the same treatment
 * rather than dropping the reader straight into a bare grid.
 */

export type Stat = {
  label: string;
  value: string;
  /** Mirrors Num's tones. There is no separate "success": accent is it. */
  tone?: "accent" | "danger" | "warn";
  /** Optional one-line explanation of what the number means. */
  note?: string;
};

export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <ul
      role="list"
      style={{
        display: "grid",
        // `min(100%, …)` rather than a bare minmax: on a 375px phone a bare
        // 190px track still resolves to 190px inside a narrower container and
        // the grid pushes the page sideways. The gate caught exactly that on
        // Finance, Settings and Accounts. 190px is set by content, not taste:
        // --metric is 48px, so a seven-character figure like £50,880 needs
        // roughly 200px of mono before it will fit.
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
        gap: "var(--space-1)",
        listStyle: "none",
        margin: "0 0 var(--space-3)",
        padding: 0,
      }}
    >
      {stats.map((s) => (
        <li
          key={s.label}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            padding: "var(--space-2)",
            minWidth: 0,
            // Belt and braces: whatever ends up in `value`, it wraps rather
            // than escaping the card. The strip is for figures, but a wrong
            // value should look wrong, not break the page.
            overflowWrap: "anywhere",
          }}
        >
          <Num align="left" size="metric" tone={s.tone}>
            {s.value}
          </Num>
          <p className="eyebrow" style={{ marginTop: 4 }}>
            {s.label}
          </p>
          {s.note ? (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "var(--text-xs)",
                lineHeight: "var(--text-xs-lh)",
                color: "var(--text-muted)",
              }}
            >
              {s.note}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * The footnote every module carries. Being explicit about what is not yet
 * wired is worth more than a page that looks finished and is not — these
 * screens are read by the person who has to decide what to unblock.
 */
export function ModuleNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        marginTop: "var(--space-3)",
        maxWidth: "68ch",
        fontSize: "var(--text-xs)",
        lineHeight: "var(--text-xs-lh)",
        color: "var(--text-muted)",
      }}
    >
      {children}
    </p>
  );
}
