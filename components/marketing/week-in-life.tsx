import Image from "next/image";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { RevealOnView } from "@/components/shared/reveal-on-view";
import { SplitHeading } from "@/components/shared/split-heading";

/**
 * Brief 2.10: "A week in your life".
 *
 * Replaces the text-only vignettes with a day-by-day timeline. Each vignette
 * pairs an image with copy and a time-stamp. On mobile the layout stacks
 * vertically alternating image-text-image-text. On desktop the three
 * vignettes sit in a horizontal row with images above.
 */

type Vignette = {
  stamp: string;
  title: string;
  body: string;
  image: string;
  alt: string;
};

const VIGNETTES: Vignette[] = [
  {
    stamp: "Tuesday, 6:15 am",
    title: "Day 2. Hyrox-specific session.",
    body: "Run plus sled push intervals. 45 minutes. Log it in the app.",
    image: "/media/images/v2/programme-first-race.jpg",
    alt: "Athlete running and pushing a sled in a gym",
  },
  {
    stamp: "Thursday, 7:30 pm",
    title: "Strength block.",
    body: "Compound lifts and Hyrox-relevant accessories. 60 minutes. Video form checks on key sets.",
    image: "/media/images/v2/programme-sub-90-v2.jpg",
    alt: "Athlete lifting in a gym during a strength block",
  },
  {
    stamp: "Saturday, 8:00 am",
    title: "Race simulation. The big one.",
    body: "8 stations and 8 by 1km run. 90 minutes. The session that builds belief.",
    image: "/media/images/v2/programme-pro.jpg",
    alt: "Athlete mid race-simulation",
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
            className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
          >
            A week in your life.
          </SplitHeading>
        </header>

        {/* Mobile (default): single column where each row alternates the
            order of image vs text — image-text, text-image, image-text.
            Desktop (md+): three-column horizontal row of card-style tiles. */}
        <ol
          role="list"
          className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-10 md:grid-cols-3 md:gap-6"
        >
          {VIGNETTES.map((v, i) => {
            const reverseOnMobile = i % 2 === 1;
            return (
              <li
                key={v.stamp}
                className="md:flex md:flex-col md:gap-4 md:rounded-lg md:border md:border-vyrek-border-subtle md:bg-vyrek-elevated md:p-6"
              >
                <div
                  className={`grid grid-cols-1 gap-4 md:contents ${
                    reverseOnMobile
                      ? "[&>*:first-child]:order-2 md:[&>*:first-child]:order-none"
                      : ""
                  }`}
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-vyrek-overlay">
                    <Image
                      src={v.image}
                      alt={v.alt}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover grayscale"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-vyrek-elevated/80 via-transparent to-transparent"
                    />
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-pill border border-vyrek-border bg-vyrek-base/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text">
                      <span aria-hidden className="size-1.5 rounded-full bg-vyrek-accent" />
                      {v.stamp}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold leading-tight tracking-[-0.02em] text-vyrek-text md:text-xl">
                      {v.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-vyrek-text-secondary md:text-base">
                      {v.body}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Container>
    </RevealOnView>
  );
}
