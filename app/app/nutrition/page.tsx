import { assertMember } from "@/lib/member/auth";
import { DEMO_FOOD_LOG, DEMO_TARGETS } from "@/lib/member/demo";
import { SectionEyebrow } from "@/components/member/section-eyebrow";
import { FoodLog } from "@/components/member/food-log";

export const dynamic = "force-dynamic";

export default async function NutritionPage() {
  await assertMember("/app/nutrition");

  const totals = DEMO_FOOD_LOG.reduce(
    (a, f) => ({
      kcal: a.kcal + f.kcal,
      protein: a.protein + f.protein,
      carbs: a.carbs + f.carbs,
      fat: a.fat + f.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          [ FUEL ]
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-[-0.02em] text-vyrek-text md:text-3xl">
          Today&apos;s food
        </h1>
        <p className="mt-1 text-sm text-vyrek-text-secondary">
          Targets are tuned to your programme + body weight.
        </p>
      </header>

      {/* Macro rings */}
      <section className="mb-8">
        <div className="grid grid-cols-4 gap-2 md:gap-3">
          <MacroTile label="kcal" value={totals.kcal} target={DEMO_TARGETS.kcal} unit="" />
          <MacroTile label="Protein" value={totals.protein} target={DEMO_TARGETS.protein} unit="g" />
          <MacroTile label="Carbs" value={totals.carbs} target={DEMO_TARGETS.carbs} unit="g" />
          <MacroTile label="Fat" value={totals.fat} target={DEMO_TARGETS.fat} unit="g" />
        </div>
      </section>

      {/* Food log */}
      <section className="mb-8">
        <SectionEyebrow title="Logged today" right={`${DEMO_FOOD_LOG.length} items`} />
        <FoodLog initial={DEMO_FOOD_LOG} />
      </section>

      {/* Coach guidance */}
      <section>
        <SectionEyebrow title="Race-week tip" />
        <div className="rounded-lg border border-vyrek-accent/30 bg-vyrek-accent/5 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-accent">
            [ COACH JAMES ]
          </p>
          <p className="mt-2 text-sm leading-relaxed text-vyrek-text">
            Push carbs to 7-8 g/kg in the 48 hours before your next race. Stick
            to white rice, pasta, ripe fruit. Cut fibre 24 hours out so you&apos;re
            not running with a heavy gut at metre 200.
          </p>
        </div>
      </section>
    </div>
  );
}

function MacroTile({
  label,
  value,
  target,
  unit,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
}) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  const r = 22;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-3 text-center">
      <div className="relative mx-auto size-14">
        <svg viewBox="0 0 56 56" className="size-14 -rotate-90">
          <circle
            cx="28"
            cy="28"
            r={r}
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-vyrek-border-subtle"
          />
          <circle
            cx="28"
            cy="28"
            r={r}
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${dash} ${c}`}
            strokeLinecap="round"
            className="text-vyrek-accent"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums text-vyrek-text">
          {pct}%
        </span>
      </div>
      <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
        {label}
      </p>
      <p className="text-xs tabular-nums text-vyrek-text">
        {value}
        {unit} / {target}
        {unit}
      </p>
    </div>
  );
}
