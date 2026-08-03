import { MicroLabel } from "../ui/primitives";
import type { PowerScore } from "@/lib/results/athlete-analytics";

/**
 * The power score, with its working shown.
 *
 * The reference site has "Elite Points" — a closed number with no published
 * formula, so nobody can check it or disagree with it. Publishing the
 * breakdown is the whole point: an athlete who can see *why* they scored 612
 * can act on it, and a number that explains itself earns trust and links.
 *
 * Confidence is shown alongside rather than folded in. A 700 from two races
 * and a 700 from twenty are different claims and the reader should see which
 * they are looking at.
 */
export function PowerCard({ power }: { power: PowerScore }) {
  const bars: { label: string; value: number; hint: string }[] = [
    { label: "Peak", value: power.breakdown.peak, hint: "Best finish, as a percentile of its division" },
    { label: "Consistency", value: power.breakdown.consistency, hint: "Median finish percentile across the career" },
    { label: "Recency", value: power.breakdown.recency, hint: "How much of the career is recent — form decays" },
    { label: "Field depth", value: power.breakdown.depth, hint: "Size of the fields raced against" },
  ];

  return (
    <section className="rounded-md border border-suth-border-subtle bg-suth-elevated p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <MicroLabel>[ POWER SCORE ]</MicroLabel>
        <span className="text-[11px] text-suth-text-tertiary">
          {power.confidence >= 70 ? "High confidence"
            : power.confidence >= 40 ? "Moderate confidence"
            : "Low confidence — few races"}
        </span>
      </div>

      <p className="mt-2 flex items-baseline gap-3">
        <span className="results-num text-4xl text-suth-accent md:text-5xl">{power.score}</span>
        <span className="text-xs text-suth-text-tertiary">of 1000</span>
      </p>

      <ul className="mt-4 space-y-2">
        {bars.map((bar) => (
          <li key={bar.label} className="flex items-center gap-3 text-[11px]">
            <span className="w-24 shrink-0 text-suth-text-secondary" title={bar.hint}>
              {bar.label}
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-sm bg-suth-overlay">
              <span
                className="block h-full rounded-sm bg-suth-accent/70"
                style={{ width: `${Math.max(2, Math.min(100, bar.value))}%` }}
              />
            </span>
            <span className="results-num w-8 shrink-0 text-right text-suth-text-secondary">
              {bar.value}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] leading-relaxed text-suth-text-tertiary">
        Peak and consistency carry most of the weight, so one outstanding day and a body of
        solid races both count and neither alone is enough. Scores are scaled down until six
        races are on record.
      </p>
    </section>
  );
}
