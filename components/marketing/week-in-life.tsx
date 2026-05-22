import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { RevealOnView } from "@/components/shared/reveal-on-view";
import { SplitHeading } from "@/components/shared/split-heading";

type Vignette = {
  stamp: string;
  lines: string[];
};

const VIGNETTES: Vignette[] = [
  {
    stamp: "Tuesday, 6:15am",
    lines: [
      "Day 2. Hyrox-specific session.",
      "Run + sled push intervals.",
      "45 minutes. Log it in the app.",
    ],
  },
  {
    stamp: "Thursday, 7:30pm",
    lines: [
      "Strength block.",
      "Compound lifts + Hyrox-relevant accessories.",
      "60 minutes. Video form checks on key sets.",
    ],
  },
  {
    stamp: "Saturday, 8:00am",
    lines: [
      "Race simulation. The big one.",
      "8 stations + 8 × 1km run.",
      "90 minutes. The session that builds belief.",
    ],
  },
];

export function WeekInLife() {
  return (
    <RevealOnView
      as="section"
      aria-labelledby="week-heading"
      className="border-t border-vyrek-border-subtle py-24 md:py-32"
    >
      <Container>
        <header className="mx-auto max-w-2xl text-center">
          <Eyebrow>A week with Vyrek</Eyebrow>
          <SplitHeading
            id="week-heading"
            className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
          >
            A week in your life with Vyrek
          </SplitHeading>
        </header>

        <ol className="mx-auto mt-14 grid max-w-6xl gap-8 md:grid-cols-3 md:gap-10">
          {VIGNETTES.map((v) => (
            <li
              key={v.stamp}
              className="relative border-l border-vyrek-border-default pl-6 md:border-l-0 md:border-t md:pl-0 md:pt-8"
            >
              <span
                aria-hidden
                className="absolute -left-[5px] top-1 block h-2.5 w-2.5 rounded-full bg-vyrek-accent md:-top-[5px] md:left-0"
              />
              <Eyebrow bare className="text-vyrek-text-secondary">
                {v.stamp.toUpperCase()}
              </Eyebrow>
              <div className="mt-3 space-y-1 text-lg leading-relaxed text-vyrek-text md:text-xl">
                {v.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </RevealOnView>
  );
}
