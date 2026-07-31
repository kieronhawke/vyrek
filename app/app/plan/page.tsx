import { SessionCard } from "@/components/client-app/session-card";
import { MEMBER, WEEK } from "@/lib/client-app/member-fixtures";

/**
 * PLAN — spec/11 §4. Week view by default, every session tappable, and the
 * download menu the spec asks for (interactive, Excel, PDF, .ics).
 */
export default function MemberPlan() {
  return (
    <>
      <p className="eyebrow">{MEMBER.programme}</p>
      <h1
        style={{
          fontSize: "var(--text-2xl)",
          lineHeight: "var(--text-2xl-lh)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          margin: "var(--space-1) 0 var(--space-3)",
        }}
      >
        Week {MEMBER.weekNumber}
      </h1>

      <ul
        role="list"
        style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--space-2)" }}
      >
        {WEEK.map((s) => (
          <li key={s.id}>
            <SessionCard session={s} />
          </li>
        ))}
      </ul>

      <h2 className="eyebrow" style={{ margin: "var(--space-4) 0 var(--space-1)" }}>
        Take it with you
      </h2>
      <div style={{ display: "grid", gap: "var(--space-1)" }}>
        {[
          ["Spreadsheet", "Editable, opens in Excel or Sheets"],
          ["PDF", "Print it, stick it on the fridge"],
          ["Calendar", "Sessions into your phone calendar"],
        ].map(([label, detail]) => (
          <button
            key={label}
            type="button"
            disabled
            style={{
              minHeight: 56,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
              gap: 2,
              padding: "0 var(--space-2)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-button)",
              color: "var(--text-faint)",
              textAlign: "left",
              cursor: "not-allowed",
            }}
          >
            <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
              {label}
            </span>
            <span style={{ fontSize: "var(--text-xs)" }}>{detail} · Phase D</span>
          </button>
        ))}
      </div>
    </>
  );
}
