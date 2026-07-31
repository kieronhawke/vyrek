/**
 * Honest placeholder for a Coach Mode screen whose phase has not been built.
 *
 * spec/14 §9: "Empty states are invitations." An empty state that says
 * "No data available" teaches nothing; one that says which phase owns the
 * screen and what will be here is useful to the only two people who will
 * ever see it before launch.
 */
export function CoachStub({
  title,
  phase,
  willDo,
}: {
  title: string;
  phase: string;
  willDo: string[];
}) {
  return (
    <>
      <h1
        style={{
          fontSize: "var(--text-xl)",
          lineHeight: "var(--text-xl-lh)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          margin: "0 0 var(--space-2)",
        }}
      >
        {title}
      </h1>
      <p className="eyebrow" style={{ marginBottom: "var(--space-3)" }}>
        Arrives in {phase}
      </p>
      <ul
        role="list"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gap: "var(--space-1)",
        }}
      >
        {willDo.map((line) => (
          <li
            key={line}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)",
              padding: "var(--space-2)",
              color: "var(--text-muted)",
              fontSize: "var(--text-sm)",
            }}
          >
            {line}
          </li>
        ))}
      </ul>
    </>
  );
}
