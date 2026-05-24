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
    // Was the cold-stare Pexels coach also used as the home hero
    // backdrop. Moved to the warm portrait (h1) so the home page
    // doesn't repeat the same person twice and the "coach you'd
    // actually DM" register lands.
    image: "/media/images/v2/coach-james-wright-warm.jpg",
    alt: "Vyrek coach in his gym",
  },
  {
    tag: "Dated weekly programme",
    title: "Every workout, dated to your race.",
    body:
      "No guessing what to do next. Open the app, see today's session, hit it, log it. Your plan adapts each Sunday.",
    // 1.1A: replaced the phone-mockup shot. Now shows an athlete with
    // their training notebook + chartreuse [ WEEK 04 ] overlay so the
    // "dated weekly" claim is visually anchored.
    image: "/media/images/v2/workout-dated.jpg",
    alt: "Athlete planning a training week in a notebook",
    badge: "WEEK 04",
  },
  {
    tag: "Hyrox-specific programming",
    title: "Built backwards from the 8 stations.",
    body:
      "Sled push, ski erg, wall balls, sandbag lunges. Every block has a purpose.",
    // Was a sled-push shot users said felt off. New: wall-ball mid-rep,
    // race-pace station work.
    image: "/media/images/v2/station-fresh.jpg",
    alt: "Athlete mid wall-ball rep at race pace",
  },
  {
    tag: "Progression you can see",
    title: "Track your splits, your sled times, your wall ball cycles.",
    body:
      "Every week your data sharpens the next plan.",
    // Was a watch-metrics shot. New: phone + watch combo logging data
    // — reads "your progress, in the app" rather than just "fitness watch".
    image: "/media/images/v2/metrics-fresh.jpg",
    alt: "Athlete logging training data on phone and watch",
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
                {c.badge ? (
                  <span
                    aria-hidden
                    className="absolute right-4 top-4 inline-flex items-center rounded-pill border border-vyrek-accent/40 bg-vyrek-base/70 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-vyrek-accent backdrop-blur-md"
                  >
                    [ {c.badge} ]
                  </span>
                ) : null}
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
