import { Num } from "@/components/control/num";
import { SplitBar } from "@/components/control/split-bar";
import { BENCHMARKS, PREDICTED } from "@/lib/client-app/member-fixtures";

/**
 * PROGRESS — spec/11 §4 and §7.
 *
 * Station benchmarks against their own history, and the percentile against
 * real field data — which spec/13 §4 calls "the thing no app has". The split
 * bar carries both, because both are values measured against a target, which
 * is the only thing that device is for (spec/14 §4).
 */

/** Seconds saved reads as an improvement, so negative deltas are good. */
function deltaCopy(trend: number) {
  if (trend === 0) return { text: "no change", tone: "var(--text-muted)" };
  if (trend < 0)
    return { text: `${Math.abs(trend)}s faster`, tone: "var(--accent)" };
  return { text: `${trend}s slower`, tone: "var(--warn)" };
}

export default function MemberProgress() {
  return (
    <>
      <p className="eyebrow">Where you are</p>
      <h1
        style={{
          fontSize: "var(--text-2xl)",
          lineHeight: "var(--text-2xl-lh)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          margin: "var(--space-1) 0 var(--space-3)",
        }}
      >
        Progress
      </h1>

      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          padding: "var(--space-3)",
          marginBottom: "var(--space-4)",
        }}
      >
        <p className="eyebrow">Predicted finish</p>
        <Num size="metric" align="left" tone="accent">
          {PREDICTED.current}
        </Num>
        <p
          style={{
            margin: "var(--space-1) 0 var(--space-2)",
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
          }}
        >
          Down from <span className="num">{PREDICTED.startOfBlock}</span> at the
          start of the block. Target{" "}
          <span className="num">{PREDICTED.target}</span>.
        </p>
        <SplitBar
          label="Toward target"
          value={78}
          target={100}
          display="78%"
          targetLabel="target"
        />
      </section>

      <h2 className="eyebrow" style={{ marginBottom: "var(--space-2)" }}>
        Stations · percentile against the field
      </h2>
      <ul
        role="list"
        style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--space-3)" }}
      >
        {BENCHMARKS.map((b) => {
          const delta = deltaCopy(b.trend);
          return (
            <li key={b.station}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: "var(--space-2)",
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
                  {b.station}
                </span>
                <span style={{ display: "flex", gap: "var(--space-1)", alignItems: "baseline" }}>
                  <Num>{b.value}</Num>
                  <span style={{ fontSize: "var(--text-xs)", color: delta.tone }}>
                    {delta.text}
                  </span>
                </span>
              </div>
              <SplitBar
                label={`Top ${100 - b.percentile}%`}
                value={b.percentile}
                target={75}
                max={100}
                display={`${b.percentile}th`}
              />
            </li>
          );
        })}
      </ul>

      <p
        style={{
          marginTop: "var(--space-4)",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
        }}
      >
        Percentiles compare you with real race results in your age group.
        Sample data until the results layer is connected.
      </p>
    </>
  );
}
