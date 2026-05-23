import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { RevealOnView } from "@/components/shared/reveal-on-view";
import { SplitHeading } from "@/components/shared/split-heading";
import { CountUp } from "@/components/shared/count-up";

/**
 * Outcome stats block, pattern from Hybrid Athlete Club / Marchon:
 * a row of large counters that signal scale + outcomes.
 *
 * Numbers below are honest *programme-construction* stats, verifiable
 * facts about what's been built, not invented member outcomes.
 * When real outcome data is available ("82% hit their goal time"), swap
 * the entries and add a footnote.
 */

const STATS = [
  {
    value: 12,
    suffix: " weeks",
    label: "Per programme",
    detail: "The full periodised build, dated to your race.",
  },
  {
    value: 8,
    suffix: " stations",
    label: "Programmed individually",
    detail: "Sled push and pull to wall balls. Each gets specific drills.",
  },
  {
    value: 4,
    suffix: " paths",
    label: "All on one subscription",
    detail: "First Race · Sub-90 · Doubles · Pro. Switch any time.",
  },
  {
    value: 47,
    suffix: "+",
    label: "Workout templates",
    detail: "Coach-written, weekly-reviewed. The library grows every month.",
  },
];

export function OutcomeStats() {
  return (
    <RevealOnView
      as="section"
      aria-labelledby="outcome-stats-heading"
      className="border-t border-vyrek-border-subtle py-20 md:py-24"
    >
      <Container>
        <header className="mx-auto max-w-2xl text-center">
          <Eyebrow>The system</Eyebrow>
          <SplitHeading
            id="outcome-stats-heading"
            className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
          >
            What you get for £8.99 a month.
          </SplitHeading>
        </header>
        {/* Use a plain grid + dl pairs as siblings, wrapping <dt>/<dd>
            inside an arbitrary <div> inside <dl> breaks the
            definition-list semantic rule. Each stat becomes its own
            self-contained card via div wrapper, not a dl child. */}
        <div className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map((s) => (
            <dl
              key={s.label}
              className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-6 md:p-7"
            >
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                {s.label}
              </dt>
              <dd className="mt-3 text-4xl font-black tracking-[-0.05em] text-vyrek-text md:text-5xl">
                <CountUp value={s.value} durationMs={1100} />
                <span className="font-mono text-sm font-medium text-vyrek-text-secondary md:text-base">
                  {s.suffix}
                </span>
              </dd>
              <dd className="mt-3 text-sm leading-relaxed text-vyrek-text-secondary">
                {s.detail}
              </dd>
            </dl>
          ))}
        </div>
      </Container>
    </RevealOnView>
  );
}
