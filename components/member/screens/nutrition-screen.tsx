import { DEMO_FOOD_LOG, DEMO_TARGETS, DEMO_TODAY } from "@/lib/member/demo";
import { weekFor } from "@/lib/member/week";
import { WeekStrip } from "@/components/member/week-strip";
import { Card, Chip, ChipRow, Eyebrow } from "@/components/member/ui";

/**
 * NUTRITION — the day, against the targets, on a timeline.
 *
 * Structure lifted from MarchOn (teardown §3, "Nutrition"): a macro summary
 * card, then the day laid out against times in a left gutter with the workout
 * sitting in the timeline as its own band. That last detail is the one worth
 * copying — it is what makes "eat before this, eat after this" obvious rather
 * than something the athlete has to work out.
 *
 * Macro colours are fixed and consistent everywhere: protein, carbs, fat.
 * They are a fourth category of colour, separate from both the accent and the
 * status ramp, because they are labels rather than judgements.
 */

const MACRO = {
  protein: { label: "Protein", colour: "#B3261E" },
  carbs: { label: "Carbs", colour: "#1F4FA8" },
  fat: { label: "Fat", colour: "#8A5A00" },
} as const;

function Bar({ value, target, colour }: { value: number; target: number; colour: string }) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  return (
    <div
      style={{
        height: 6,
        borderRadius: 999,
        background: "var(--surface-raised)",
        overflow: "hidden",
      }}
    >
      <span
        aria-hidden
        style={{ display: "block", height: "100%", width: `${pct}%`, background: colour }}
      />
    </div>
  );
}

export function NutritionScreen({ base = "/app" }: { base?: string } = {}) {
  const week = weekFor();
  const totals = DEMO_FOOD_LOG.reduce(
    (a, f) => ({
      kcal: a.kcal + f.kcal,
      protein: a.protein + f.protein,
      carbs: a.carbs + f.carbs,
      fat: a.fat + f.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const kcalPct = Math.min(100, Math.round((totals.kcal / DEMO_TARGETS.kcal) * 100));
  const remaining = Math.max(0, DEMO_TARGETS.kcal - totals.kcal);

  // The workout drops into the timeline at its own time, so "fuel before,
  // recover after" is positional rather than something to be inferred.
  const WORKOUT_AT = "17:30";
  const timeline = [
    ...DEMO_FOOD_LOG.map((f) => ({ kind: "food" as const, time: f.time, entry: f })),
    { kind: "workout" as const, time: WORKOUT_AT, entry: null },
  ].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <>
      <p className="eyebrow">Fuel</p>
      <h1
        style={{
          fontSize: "var(--text-2xl)",
          lineHeight: 1.1,
          fontWeight: 800,
          letterSpacing: "-0.025em",
          margin: "var(--space-1) 0 var(--space-3)",
        }}
      >
        Today&apos;s fuel
      </h1>

      <section style={{ marginBottom: "var(--space-4)" }}>
        <WeekStrip days={week} base={base} />
      </section>

      {/* ── The day, in one card ─────────────────────────────────────── */}
      <section style={{ marginBottom: "var(--space-4)" }}>
        <Card>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: "var(--space-2)",
            }}
          >
            <p style={{ margin: 0 }}>
              <span
                className="num"
                style={{ fontSize: "var(--text-2xl)", fontWeight: 800, letterSpacing: "-0.03em" }}
              >
                {totals.kcal}
              </span>
              <span style={{ color: "var(--text-muted)" }}> / {DEMO_TARGETS.kcal} kcal</span>
            </p>
            <span className="eyebrow">{remaining} left</span>
          </div>

          <div style={{ marginTop: 8 }}>
            <Bar value={totals.kcal} target={DEMO_TARGETS.kcal} colour="var(--text)" />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "var(--space-2)",
              marginTop: "var(--space-2)",
            }}
          >
            {(["protein", "carbs", "fat"] as const).map((k) => (
              <div key={k}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 4,
                    marginBottom: 4,
                  }}
                >
                  <span className="eyebrow">{MACRO[k].label}</span>
                  <span className="num" style={{ fontSize: "var(--text-xs)", fontWeight: 650 }}>
                    {totals[k]}/{DEMO_TARGETS[k]}
                  </span>
                </div>
                <Bar value={totals[k]} target={DEMO_TARGETS[k]} colour={MACRO[k].colour} />
              </div>
            ))}
          </div>

          <p
            style={{
              margin: "var(--space-2) 0 0",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
            }}
          >
            Targets are set for a training day at your bodyweight. {kcalPct}% logged.
          </p>
        </Card>
      </section>

      {/* ── Timeline ─────────────────────────────────────────────────── */}
      <section style={{ marginBottom: "var(--space-4)" }}>
        <Eyebrow right={`${DEMO_FOOD_LOG.length} logged`}>Today</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          {timeline.map((item, i) =>
            item.kind === "workout" ? (
              <div
                key={`w-${i}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px 1fr",
                  gap: "var(--space-1)",
                  alignItems: "center",
                }}
              >
                <span
                  className="num"
                  style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
                >
                  {item.time}
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minHeight: 48,
                    padding: "0 var(--space-2)",
                    borderRadius: "var(--radius-card)",
                    border: "1px solid var(--accent)",
                    color: "var(--accent-text)",
                    fontSize: "var(--text-sm)",
                    fontWeight: 650,
                    backgroundImage:
                      "repeating-linear-gradient(135deg, var(--accent-faint) 0 6px, transparent 6px 12px)",
                  }}
                >
                  {DEMO_TODAY.title} · {DEMO_TODAY.durationMin} min
                </div>
              </div>
            ) : (
              <div
                key={item.entry.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px 1fr",
                  gap: "var(--space-1)",
                  alignItems: "start",
                }}
              >
                <span
                  className="num"
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    paddingTop: 14,
                  }}
                >
                  {item.time}
                </span>
                <Card>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "var(--space-2)",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "var(--text-sm)",
                          fontWeight: 650,
                          lineHeight: 1.35,
                        }}
                      >
                        {item.entry.name}
                      </p>
                      {item.entry.amount ? (
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: "var(--text-xs)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {item.entry.amount}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className="num"
                      style={{ fontSize: "var(--text-sm)", fontWeight: 700, whiteSpace: "nowrap" }}
                    >
                      {item.entry.kcal} kcal
                    </span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <ChipRow>
                      <Chip>P {item.entry.protein}g</Chip>
                      <Chip>C {item.entry.carbs}g</Chip>
                      <Chip>F {item.entry.fat}g</Chip>
                    </ChipRow>
                  </div>
                </Card>
              </div>
            ),
          )}
        </div>
      </section>

      <p
        style={{
          margin: 0,
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
        }}
      >
        Sample day. Logging saves to your account once the database is
        connected — nothing here is stored yet.
      </p>
    </>
  );
}
