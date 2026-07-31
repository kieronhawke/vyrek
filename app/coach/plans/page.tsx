import { Num } from "@/components/control/num";
import {
  CONFLICT_CLIENT_ID,
  listCoachClients,
  listRacesForAccount,
} from "@/lib/control/fixtures";
import { analyseRaces, requiresAcknowledgement } from "@/lib/control/race-conflicts";

/**
 * COACH MODE — PLANS
 *
 * The plan builder itself is Phase D. What is live here is the piece that has
 * to run *before* a plan can be sent: the race conflict resolver
 * (spec/10 §2), which spec/11 §2 point 7 says must warn before send rather
 * than relying on Ben remembering to check.
 *
 * It shows the conflicts and the options with their trade-offs. It does not
 * pick and it does not rank — spec/10 §1: the system builds the skeleton,
 * Ben supplies the judgement.
 */

const SEVERITY_TONE = {
  blocking: "var(--danger)",
  significant: "var(--warn)",
  worth_knowing: "var(--text-muted)",
} as const;

const SEVERITY_LABEL = {
  blocking: "Blocking",
  significant: "Significant",
  worth_knowing: "Worth knowing",
} as const;

export default function CoachPlansPage() {
  const client = listCoachClients().find((c) => c.id === CONFLICT_CLIENT_ID);
  const races = listRacesForAccount(CONFLICT_CLIENT_ID);
  const analysis = analyseRaces(races);
  const mustAcknowledge = requiresAcknowledgement(analysis);

  return (
    <>
      <h1
        style={{
          fontSize: "var(--text-xl)",
          lineHeight: "var(--text-xl-lh)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          margin: "0 0 var(--space-1)",
        }}
      >
        Plans
      </h1>
      <p className="eyebrow" style={{ marginBottom: "var(--space-3)" }}>
        Builder arrives in Phase D
      </p>

      <section
        style={{
          background: "var(--surface)",
          border: `1px solid ${mustAcknowledge ? "var(--danger)" : "var(--border)"}`,
          borderRadius: "var(--radius-card)",
          padding: "var(--space-2)",
          marginBottom: "var(--space-3)",
        }}
      >
        <p className="eyebrow">Race clash</p>
        <h2
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: 700,
            margin: "var(--space-1) 0 var(--space-2)",
          }}
        >
          {client?.name ?? "Client"} has <Num align="left">{races.length}</Num>{" "}
          races booked
        </h2>

        <ul
          role="list"
          style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}
        >
          {races.map((r) => (
            <li
              key={r.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "var(--space-2)",
                fontSize: "var(--text-sm)",
              }}
            >
              <span>
                {r.name}
                {r.priority === "A" ? " · A race" : null}
              </span>
              <Num tone="muted">
                {r.date.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </Num>
            </li>
          ))}
        </ul>
      </section>

      <h2 className="eyebrow" style={{ marginBottom: "var(--space-2)" }}>
        What clashes
      </h2>
      <ul
        role="list"
        style={{
          listStyle: "none",
          margin: "0 0 var(--space-4)",
          padding: 0,
          display: "grid",
          gap: "var(--space-1)",
        }}
      >
        {analysis.conflicts.map((c, i) => (
          <li
            key={`${c.code}-${i}`}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderLeft: `3px solid ${SEVERITY_TONE[c.severity]}`,
              borderRadius: "var(--radius-card)",
              padding: "var(--space-2)",
            }}
          >
            <p
              className="eyebrow"
              style={{ color: SEVERITY_TONE[c.severity], marginBottom: 4 }}
            >
              {SEVERITY_LABEL[c.severity]}
            </p>
            <p style={{ fontSize: "var(--text-sm)", margin: 0 }}>{c.description}</p>
          </li>
        ))}
      </ul>

      <h2 className="eyebrow" style={{ marginBottom: "var(--space-1)" }}>
        Your options
      </h2>
      {/* spec/10 §2: options, never an answer. The tool gets Ben to the
          decision in two minutes instead of forty; the decision stays his. */}
      <p
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          margin: "0 0 var(--space-2)",
        }}
      >
        Pick one and I&apos;ll draft the message explaining it to them.
      </p>

      <ul
        role="list"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gap: "var(--space-2)",
        }}
      >
        {analysis.options.map((o) => (
          <li
            key={o.aRaceId ?? "split"}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-card)",
              padding: "var(--space-2)",
            }}
          >
            <h3
              style={{
                fontSize: "var(--text-base)",
                fontWeight: 700,
                margin: "0 0 var(--space-1)",
              }}
            >
              {o.title}
            </h3>
            <ul
              role="list"
              style={{
                listStyle: "none",
                margin: "0 0 var(--space-2)",
                padding: 0,
                display: "grid",
                gap: 4,
              }}
            >
              {o.approach.map((line) => (
                <li
                  key={line}
                  style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}
                >
                  {line}
                </li>
              ))}
            </ul>
            <p style={{ fontSize: "var(--text-sm)", margin: 0, color: "var(--warn)" }}>
              Trade-off: {o.tradeOff}
            </p>
          </li>
        ))}
      </ul>

      <p
        style={{
          marginTop: "var(--space-4)",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
        }}
      >
        Sample records. Choosing an option and drafting the message arrives with
        the plan builder in Phase D.
      </p>
    </>
  );
}
