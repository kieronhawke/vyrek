import Image from "next/image";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { RevealOnView } from "@/components/shared/reveal-on-view";
import { SplitHeading } from "@/components/shared/split-heading";

// Each principle now has an image. Was a 4-card text-only grid that
// read as a wall of copy; now the imagery anchors each claim.
const PRINCIPLES = [
  {
    tag: "Specificity",
    title: "Eight stations. Eight 1-km runs. One race format.",
    body: "Every programme is built around the Hyrox race architecture, not adapted from generic functional fitness. Sled push and sled pull get explicit progression. Wall ball volume scales to your bodyweight, not a fixed number. Run intervals match station-to-station spacing, not arbitrary track distances.",
    image: "/media/images/v2/programme-sub-90-v2.jpg",
    imageAlt: "Athlete pushing a weighted Hyrox sled across an indoor floor.",
  },
  {
    tag: "Calibration",
    title: "Loads dialled to your standards, not the gym's max plate.",
    body: "Men's sled at 152 kg, women's at 102 kg. Wall ball at 9 kg or 6 kg. Sandbag lunge as a percentage of bodyweight. You log what you actually lifted; Sunday's recalibration adjusts next week's targets based on whether you closed the prescribed sets.",
    image: "/media/images/v2/quiz-interstitial-2.jpg",
    imageAlt: "Wall ball rep mid-throw, focus on hip drive.",
  },
  {
    tag: "Progression",
    title: "Twelve weeks, three phases, taper baked in from day one.",
    body: "Weeks 1-4 build aerobic capacity and station competence. Weeks 5-8 layer in race-pace intensity. Weeks 9-11 sharpen the day, race simulations, transition rehearsals, recovery dialled tight. Week 12 is taper: less volume, same intensity, fresh legs.",
    image: "/media/images/v2/metrics-fresh.jpg",
    imageAlt: "Athlete logging training data on phone and watch.",
  },
  {
    tag: "Honesty",
    title: "No 'transformations'. Just the work.",
    body: "Vyrek doesn't sell physique outcomes or before-and-after promises. We sell a finishing time you can put on a watch, and the structured weeks that get you there. If the programme isn't working, the Sunday recalibration changes it, or you cancel in two taps. No lock-ins, no shame.",
    image: "/media/images/v2/honesty-fresh.jpg",
    imageAlt: "Athlete working through a heavy set, candid effort.",
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
              className="group relative flex flex-col overflow-hidden rounded-lg border border-vyrek-border bg-vyrek-elevated transition-[border,transform] duration-base ease-out hover:-translate-y-0.5 hover:border-vyrek-border-strong"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-vyrek-overlay">
                <Image
                  src={p.image}
                  alt={p.imageAlt}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover grayscale transition-transform duration-slow ease-out group-hover:scale-[1.04]"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-vyrek-elevated/95 via-vyrek-elevated/30 to-transparent"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-5 top-5 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text"
                >
                  0{i + 1}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-4 p-7 md:p-9">
                <Eyebrow>{p.tag}</Eyebrow>
                <h3 className="text-balance text-2xl font-bold leading-tight tracking-[-0.025em] text-vyrek-text md:text-[1.625rem]">
                  {p.title}
                </h3>
                <p className="text-base leading-relaxed text-vyrek-text-secondary">
                  {p.body}
                </p>
              </div>
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
