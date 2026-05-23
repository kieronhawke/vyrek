import type { Metadata } from "next";
import Image from "next/image";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";

export const metadata: Metadata = {
  title: "About Vyrek. UK Hyrox training built by Elite 15 athletes",
  description:
    "Vyrek is a UK Hyrox-first training platform. 12-week personalised programmes built by Elite 15 athletes for first-timers, sub-90 chasers, doubles teams, and pros. Direct from the coaches who race it.",
};

const PRINCIPLES = [
  {
    tag: "DATED, NOT GENERIC",
    body: "Every workout has a calendar slot. Open the app on Tuesday and see Tuesday's session, not a library of options.",
  },
  {
    tag: "ADAPTIVE, NOT FIXED",
    body: "Your plan rebuilds every Sunday based on what you logged. Strong week pushes harder. Missed sessions reshape the next block.",
  },
  {
    tag: "COACHED, NOT ALGORITHMIC",
    body: "An Elite 15 athlete reviews your weekly training and answers your questions in the app. The software supports the coach, not the other way round.",
  },
];

const GROWTH = [
  { year: "2018", value: "600 athletes" },
  { year: "2020", value: "20,000" },
  { year: "2022", value: "160,000" },
  { year: "2024", value: "650,000" },
];

export default function AboutPage() {
  return (
    <>
      <MarketingNav />
      <main>
        {/* Hero band with overlay image */}
        <section
          aria-labelledby="about-heading"
          className="relative isolate flex min-h-[68svh] flex-col justify-end overflow-hidden bg-vyrek-base pb-16 pt-[max(7rem,calc(var(--safe-top)+6rem))]"
        >
          <div aria-hidden className="absolute inset-0 -z-10">
            <Image
              src="/media/images/v2/bento-coaches.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-vyrek-base/70 via-vyrek-base/55 to-vyrek-base" />
          </div>
          <Container>
            <Eyebrow>About</Eyebrow>
            <SplitHeading
              id="about-heading"
              as="h1"
              className="mt-4 max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.04em] text-vyrek-text md:text-6xl"
            >
              Built for the world&apos;s fastest growing sport.
            </SplitHeading>
            <p className="mt-5 max-w-2xl text-base text-vyrek-text-secondary md:text-lg">
              Vyrek is a Hyrox-first training platform. Our mission: get you to
              your start line stronger than you expected.
            </p>
          </Container>
        </section>

        {/* Our story (breathing room: pt-24 = 96px, more than brief's 64px minimum) */}
        <section
          aria-labelledby="story-heading"
          className="border-t border-vyrek-border-subtle py-24 md:py-32"
        >
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Our story</Eyebrow>
              <h2
                id="story-heading"
                className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
              >
                A training plan written by the coach who races it.
              </h2>

              <div className="mt-10 space-y-6 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                <p>
                  James Wright started Vyrek after coaching dozens of athletes
                  through their first Hyrox using nothing more than a shared
                  spreadsheet. The spreadsheet worked. Every athlete finished.
                  Most surprised themselves with their time. The bottleneck was
                  not programming, it was that programming this thorough did
                  not scale beyond people he could text directly.
                </p>
                <figure className="-mx-4 my-8 overflow-hidden rounded-2xl md:mx-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/media/images/v2/about-coaching.jpg"
                    alt="A coach demonstrating a movement to an athlete on a training floor."
                    className="aspect-[16/10] w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </figure>
                <p>
                  Vyrek is the version of that spreadsheet that scales: dated
                  workouts, adaptive Sunday rebuilds, weekly coach review, all
                  inside an app you open like any other. The coaching does not
                  get diluted. It gets handed back the time it used to lose to
                  copy-paste.
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* Why Hyrox */}
        <section
          aria-labelledby="why-heading"
          className="border-t border-vyrek-border-subtle py-24 md:py-32"
        >
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Why Hyrox</Eyebrow>
              <h2
                id="why-heading"
                className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
              >
                Programming that works backwards from the race.
              </h2>

              <div className="mt-10 space-y-6 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                <p>
                  The sport: 600 athletes in 2018. Around 650,000 in 2024.
                  Hyrox is the fastest growing endurance event in Europe and
                  has spread to 22 countries. The format is precise: eight
                  stations, eight 1km runs, fixed order, measured floor.
                </p>
                <p>
                  The gap: most programmes are generic functional fitness with
                  a few sled days bolted on. Generic strength teaches you to be
                  strong in isolation. Generic running teaches you to be fast
                  over ground. Neither prepares you for the specific challenge
                  of running 8km between hard stations with real-time pacing
                  decisions.
                </p>
                <p>
                  The fix: we work backwards from the 8 stations and 8 runs.
                  Every week is built around the stations that decide your time
                  (sled push, sled pull, burpee broad jump, wall ball). Run
                  volume is matched to station volume. Recovery is programmed,
                  not improvised. By race day, you have rehearsed the day, not
                  hoped for it.
                </p>
              </div>

              <figure className="-mx-4 mt-10 overflow-hidden rounded-2xl md:mx-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/media/images/v2/about-outdoor.jpg"
                  alt="An athlete running along a UK trail at dawn, mid-effort."
                  className="aspect-[21/9] w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </figure>

              {/* Growth timeline graphic */}
              <ol
                role="list"
                className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4"
                aria-label="Hyrox global participation by year"
              >
                {GROWTH.map((g) => (
                  <li
                    key={g.year}
                    className="rounded-md border border-vyrek-border-subtle bg-vyrek-elevated p-4"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-accent">
                      {g.year}
                    </p>
                    <p className="mt-2 text-lg font-bold tracking-[-0.02em] text-vyrek-text tabular-nums md:text-xl">
                      {g.value}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </Container>
        </section>

        {/* What we believe (3 principle cards) */}
        <section
          aria-labelledby="believe-heading"
          className="border-t border-vyrek-border-subtle py-24 md:py-32"
        >
          <Container>
            <div className="mx-auto max-w-5xl">
              <div className="mx-auto max-w-3xl">
                <Eyebrow>What we believe</Eyebrow>
                <h2
                  id="believe-heading"
                  className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
                >
                  Three principles that decide every workout.
                </h2>
              </div>

              <ul
                role="list"
                className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3"
              >
                {PRINCIPLES.map((p) => (
                  <li
                    key={p.tag}
                    className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-6"
                  >
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
                      [ {p.tag} ]
                    </p>
                    <p className="mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                      {p.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </section>

        {/* Built in the UK */}
        <section className="border-t border-vyrek-border-subtle py-24 md:py-32">
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Made in UK</Eyebrow>
              <h2 className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl">
                Built in the UK.
              </h2>
              <p className="mt-6 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                Vyrek is a small team based in the United Kingdom. Our founding
                coach, James Wright, races at the Elite 15 level and finished
                top 50 at the 2025 World Championships. The programming is
                designed for UK athletes training in UK gyms with UK race
                schedules.
              </p>
              <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                [ MADE IN UK ]
              </p>
            </div>
          </Container>
        </section>

        {/* Final CTA */}
        <section className="border-t border-vyrek-border-subtle py-24 md:py-32">
          <Container>
            <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
              <Eyebrow>Start</Eyebrow>
              <h2 className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl">
                Ready to find your plan?
              </h2>
              <p className="mt-4 text-base text-vyrek-text-secondary md:text-lg">
                Three-minute quiz. Real Week 1 before you pay.
              </p>
              <div className="mt-8">
                <CtaButton href="/quiz" size="lg">
                  Find your plan →
                </CtaButton>
              </div>
              <p className="mt-4 text-sm text-vyrek-text-tertiary">
                First week free. Cancel anytime.
              </p>
            </div>
          </Container>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
