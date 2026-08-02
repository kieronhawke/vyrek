import type { WeekSummary } from "@/lib/member/demo";

/**
 * The whole block, twelve weeks, in one strip.
 *
 * This is the single most useful thing the Plan tab can show, and it was
 * missing: the athlete could see this week and no sense of where it sat in the
 * arc Ben has built. Phase is carried by fill as well as label, so "I am in
 * peak, two weeks out" is legible without reading anything.
 */

const PHASE_LABEL: Record<WeekSummary["phase"], string> = {
  base: "Base",
  build: "Build",
  peak: "Peak",
  taper: "Taper",
};

/** Intensity rises through the block; the ramp says so without a legend. */
const PHASE_FILL: Record<WeekSummary["phase"], string> = {
  base: "28%",
  build: "55%",
  peak: "100%",
  taper: "40%",
};

export function PhaseBar({
  weeks,
  currentWeek,
}: {
  weeks: WeekSummary[];
  currentWeek: number;
}) {
  const phases = weeks.reduce<{ phase: WeekSummary["phase"]; count: number }[]>(
    (acc, w) => {
      const last = acc[acc.length - 1];
      if (last && last.phase === w.phase) last.count += 1;
      else acc.push({ phase: w.phase, count: 1 });
      return acc;
    },
    [],
  );

  return (
    <div>
      {/* Phase names, sized to how many weeks each one runs for. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: phases.map((p) => `${p.count}fr`).join(" "),
          gap: 3,
          marginBottom: 4,
        }}
      >
        {phases.map((p) => (
          <span
            key={p.phase}
            className="eyebrow"
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {PHASE_LABEL[p.phase]}
          </span>
        ))}
      </div>

      <ol
        role="list"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`,
          gap: 3,
          margin: 0,
          padding: 0,
          listStyle: "none",
        }}
      >
        {weeks.map((w) => {
          const done = w.number < currentWeek;
          const current = w.number === currentWeek;
          return (
            <li key={w.number}>
              <div
                title={`${w.label}: ${w.focus}`}
                style={{
                  height: 40,
                  display: "flex",
                  alignItems: "flex-end",
                  borderRadius: 3,
                  background: "var(--surface-raised)",
                  border: current
                    ? "1px solid var(--accent)"
                    : "1px solid transparent",
                  overflow: "hidden",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: "100%",
                    height: PHASE_FILL[w.phase],
                    background: current
                      ? "var(--accent)"
                      : done
                        ? "var(--border-strong)"
                        : "var(--border)",
                  }}
                />
              </div>
              <p
                className="num"
                style={{
                  margin: "3px 0 0",
                  textAlign: "center",
                  fontSize: "var(--text-2xs)",
                  color: current ? "var(--accent)" : "var(--text-muted)",
                  fontWeight: current ? 700 : 500,
                }}
              >
                {w.number}
              </p>
              <span className="sr-only">
                {w.label}, {PHASE_LABEL[w.phase]} phase, {w.focus},{" "}
                {w.sessionCount} sessions
                {current ? ", current week" : done ? ", completed" : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
