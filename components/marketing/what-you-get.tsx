import Image from "next/image";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { RevealOnView } from "@/components/shared/reveal-on-view";
import { SplitHeading } from "@/components/shared/split-heading";

/**
 * Brief 2.4: "What you get with Vyrek".
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
    image: "/media/images/v2/coach-james-wright.jpg",
    alt: "Vyrek coach in training",
  },
  {
    tag: "Dated weekly programme",
    title: "Every workout, dated to your race.",
    body:
      "No guessing what to do next. Open the app, see today's session, hit it, log it. Your plan adapts each Sunday.",
    image: "/media/images/v2/bento-plan.jpg",
    alt: "A weekly Hyrox plan laid out by day",
  },
  {
    tag: "Hyrox-specific programming",
    title: "Built backwards from the 8 stations.",
    body:
      "Sled push, ski erg, wall balls, sandbag lunges. Every block has a purpose.",
    image: "/media/images/v2/programme-sub-90.jpg",
    alt: "Athlete training on Hyrox stations",
  },
  {
    tag: "Progression you can see",
    title: "Track your splits, your sled times, your wall ball cycles.",
    body:
      "Every week your data sharpens the next plan.",
    image: "/media/images/v2/bento-progress.jpg",
    alt: "Athlete logging session data",
  },
];

export function WhatYouGet() {
  return (
    <RevealOnView
      as="section"
      aria-labelledby="what-you-get-heading"
      className="border-t border-vyrek-border-subtle py-20 md:py-28"
    >
      <Container>
        <header className="mx-auto max-w-2xl text-center">
          <Eyebrow>What you get with Vyrek</Eyebrow>
          <SplitHeading
            id="what-you-get-heading"
            className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
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
              className="group relative flex flex-col overflow-hidden rounded-lg border border-vyrek-border bg-vyrek-elevated transition-[border,transform] duration-base ease-out hover:-translate-y-0.5 hover:border-vyrek-border-strong"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-vyrek-overlay">
                <Image
                  src={c.image}
                  alt={c.alt}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover grayscale transition-transform duration-slow group-hover:scale-[1.03]"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-vyrek-elevated/95 via-vyrek-elevated/30 to-transparent"
                />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-6 md:p-8">
                <Eyebrow>{c.tag}</Eyebrow>
                <h3 className="text-balance text-xl font-bold leading-tight tracking-[-0.02em] text-vyrek-text md:text-2xl">
                  {c.title}
                </h3>
                <p className="text-base leading-relaxed text-vyrek-text-secondary">
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
