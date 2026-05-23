import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { CtaButton } from "@/components/shared/cta-button";
import { RevealOnView } from "@/components/shared/reveal-on-view";
import { SplitHeading } from "@/components/shared/split-heading";

const EXAMPLE_WEEK = [
  { day: "Mon", workout: "Easy run", duration: "45 min", zone: "Z2" },
  { day: "Tue", workout: "Hyrox Hybrid: Run + Sled", duration: "60 min", zone: "Race-pace" },
  { day: "Wed", workout: "Strength", duration: "60 min", zone: "Lower body" },
  { day: "Thu", workout: "Threshold intervals", duration: "45 min", zone: "Z4" },
  { day: "Fri", workout: "Active recovery", duration: "30 min", zone: "Mobility" },
  { day: "Sat", workout: "Race simulation", duration: "90 min", zone: "8 stations" },
  { day: "Sun", workout: "Rest", duration: ",", zone: "," },
];

export function PlanDeepDive() {
  return (
    <RevealOnView
      as="section"
      aria-labelledby="deep-dive-heading"
      className="border-t border-vyrek-border-subtle py-24 md:py-32"
    >
      <Container>
        <header className="mx-auto max-w-2xl text-center">
          <Eyebrow>Example week</Eyebrow>
          <SplitHeading
            id="deep-dive-heading"
            className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
          >
            What a week looks like
          </SplitHeading>
        </header>

        <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated">
          <ul role="list" className="divide-y divide-vyrek-border-subtle">
            {EXAMPLE_WEEK.map((d) => (
              <li
                key={d.day}
                className="grid grid-cols-[88px_1fr_auto] items-center gap-3 px-5 py-4 md:grid-cols-[96px_1fr_140px_140px] md:px-6"
              >
                <Eyebrow className="whitespace-nowrap">{d.day}</Eyebrow>
                <span className="text-base font-medium text-vyrek-text md:text-lg">
                  {d.workout}
                </span>
                <span className="hidden text-sm text-vyrek-text-secondary md:inline tabular-nums">
                  {d.duration}
                </span>
                <span className="text-right font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-tertiary md:text-left">
                  {d.zone}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-base text-vyrek-text-secondary md:text-lg">
          Yours will be personalised to your goals, equipment, and race date.
        </p>

        <div className="mt-8 flex justify-center">
          <CtaButton href="/quiz" size="md">
            Get your personalised week →
          </CtaButton>
        </div>
      </Container>
    </RevealOnView>
  );
}
