import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { RevealOnView } from "@/components/shared/reveal-on-view";
import { SplitHeading } from "@/components/shared/split-heading";

const PRINCIPLES = [
  {
    tag: "Specificity",
    title: "Eight stations. Eight 1-km runs. One race format.",
    body: "Every programme is built around the Hyrox race architecture, not adapted from generic functional fitness. Sled push and sled pull get explicit progression. Wall ball volume scales to your bodyweight, not a fixed number. Run intervals match station-to-station spacing, not arbitrary track distances.",
  },
  {
    tag: "Calibration",
    title: "Loads dialled to your standards, not the gym's max plate.",
    body: "Men's sled at 152 kg, women's at 102 kg. Wall ball at 9 kg or 6 kg. Sandbag lunge as a percentage of bodyweight. You log what you actually lifted; Sunday's recalibration adjusts next week's targets based on whether you closed the prescribed sets.",
  },
  {
    tag: "Progression",
    title: "Twelve weeks, three phases, taper baked in from day one.",
    body: "Weeks 1-4 build aerobic capacity and station competence. Weeks 5-8 layer in race-pace intensity. Weeks 9-11 sharpen the day, race simulations, transition rehearsals, recovery dialled tight. Week 12 is taper: less volume, same intensity, fresh legs.",
  },
  {
    tag: "Honesty",
    title: "No 'transformations'. Just the work.",
    body: "Vyrek doesn't sell physique outcomes or before-and-after promises. We sell a finishing time you can put on a watch, and the structured weeks that get you there. If the programme isn't working, the Sunday recalibration changes it, or you cancel in two taps. No lock-ins, no shame.",
  },
];

export function Methodology() {
  return (
    <RevealOnView
      as="section"
      aria-labelledby="methodology-heading"
      className="border-t border-vyrek-border-subtle py-24 md:py-32"
    >
      <Container>
        <header className="mx-auto max-w-2xl text-center">
          <Eyebrow>Methodology</Eyebrow>
          <SplitHeading
            id="methodology-heading"
            className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl lg:text-5xl"
          >
            Programming that works backwards from the race.
          </SplitHeading>
          <p className="mt-5 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
            Four principles every Vyrek programme is built on.
          </p>
        </header>

        <ol
          role="list"
          className="mx-auto mt-14 grid max-w-6xl gap-4 md:mt-16 md:grid-cols-2 md:gap-5"
        >
          {PRINCIPLES.map((p, i) => (
            <li
              key={p.tag}
              className="group relative flex flex-col gap-4 overflow-hidden rounded-lg border border-vyrek-border bg-vyrek-elevated p-7 transition-[border,transform] duration-base ease-out hover:-translate-y-0.5 hover:border-vyrek-border-strong md:p-9"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute right-5 top-5 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary"
              >
                0{i + 1}
              </span>
              <Eyebrow>{p.tag}</Eyebrow>
              <h3 className="text-balance text-2xl font-bold leading-tight tracking-[-0.025em] text-vyrek-text md:text-[1.625rem]">
                {p.title}
              </h3>
              <p className="text-base leading-relaxed text-vyrek-text-secondary">
                {p.body}
              </p>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-vyrek-accent/40 to-transparent opacity-0 transition-opacity duration-base group-hover:opacity-100"
              />
            </li>
          ))}
        </ol>
      </Container>
    </RevealOnView>
  );
}
