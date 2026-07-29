import Image from "next/image";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { RevealOnView } from "@/components/shared/reveal-on-view";
import { SplitHeading } from "@/components/shared/split-heading";

/**
 * Brief 2.4: "What you get with Suth Performance".
 *
 * Four cards, feature-led. No pricing. No "cancel anytime". Mobile stacks
 * one column, desktop is a 2x2 bento. Each card has a real image and
 * concrete copy describing one piece of the membership.
 */

const CARDS = [
  {
    tag: "Personal Hyrox coach",
    title: "An Elite 15 athlete on your programme.",
    body:
      "Reviews your weekly progress, answers questions, and adjusts your training as you improve.",
    image: "/media/images/track/gym-coach-row-colour.jpg",
    alt: "Coach standing over an athlete mid rowing interval in the gym",
  },
  {
    tag: "Dated weekly programme",
    title: "Every workout, dated to your race.",
    body:
      "No guessing what to do next. Open the app, see today's session, hit it, log it. Your plan adapts each Sunday.",
    image: "/media/images/track/straight-elevated-colour.jpg",
    alt: "Elevated view of two athletes striding down the track straight",
    badge: "WEEK 04",
  },
  {
    tag: "Hyrox-specific programming",
    title: "Built backwards from the 8 stations.",
    body:
      "Sled push, ski erg, wall balls, sandbag lunges. Every block has a purpose.",
    image: "/media/images/track/gym-skierg-colour.jpg",
    alt: "Athlete mid ski erg pull in the gym",
  },
  {
    tag: "Progression you can see",
    title: "Track your splits, your sled times, your wall ball cycles.",
    body:
      "Every week your data sharpens the next plan.",
    image: "/media/images/track/solo-watch-bw.jpg",
    alt: "Athlete checking a training watch on the track between reps",
  },
];

export function WhatYouGet() {
  return (
    <RevealOnView
      as="section"
      aria-labelledby="what-you-get-heading"
      className="border-t border-suth-border-subtle py-24 md:py-32"
    >
      <Container>
        <header className="mx-auto max-w-2xl text-center">
          <Eyebrow>What you get with Suth Performance</Eyebrow>
          <SplitHeading
            id="what-you-get-heading"
            className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-4xl"
          >
            Four parts of one membership.
          </SplitHeading>
        </header>

        <ul
          role="list"
          className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 md:gap-5"
        >
          {CARDS.map((c) => (
            <li
              key={c.tag}
              className="group relative flex flex-col overflow-hidden rounded-lg border border-suth-border bg-suth-elevated transition-[border,transform] duration-base ease-out hover:-translate-y-0.5 hover:border-suth-border-strong"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-suth-overlay">
                <Image
                  src={c.image}
                  alt={c.alt}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover grayscale transition-transform duration-slow group-hover:scale-[1.03]"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-suth-elevated/95 via-suth-elevated/30 to-transparent"
                />
                {c.badge ? (
                  <span
                    aria-hidden
                    className="absolute right-4 top-4 inline-flex items-center rounded-pill border border-suth-accent/40 bg-suth-base/70 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-suth-accent backdrop-blur-md"
                  >
                    [ {c.badge} ]
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-6 md:p-8">
                <Eyebrow>{c.tag}</Eyebrow>
                <h3 className="text-balance text-xl font-bold leading-tight tracking-[-0.02em] text-suth-text md:text-2xl">
                  {c.title}
                </h3>
                <p className="text-base leading-relaxed text-suth-text-secondary">
                  {c.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </RevealOnView>
  );
}
