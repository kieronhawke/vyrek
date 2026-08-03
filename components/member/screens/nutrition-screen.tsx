import { weekFor } from "@/lib/member/week";
import { WeekStrip } from "@/components/member/week-strip";
import { FoodLog } from "@/components/member/food-log";

/**
 * NUTRITION — the day, against the targets.
 *
 * This screen used to render `DEMO_FOOD_LOG`: a fixed sample day that looked
 * like a working food diary and was not one. Its own footer admitted it —
 * "nothing here is stored yet" — which is the placeholder problem in its purest
 * form, because the only way to find out was to read the small print under a
 * page that otherwise looked finished.
 *
 * It now renders the real log. Everything below the week strip is the athlete's
 * own data, and it persists. The totals card, the meal breakdown and the add
 * flow all live in `FoodLog`, which owns the store.
 */

export function NutritionScreen({ base = "/app" }: { base?: string } = {}) {
  const week = weekFor();

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

      <FoodLog />
    </>
  );
}
