import type { Metadata } from "next";
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
            {/* Pinned to a single visual asset until media drop lands */}
            <img
              src="/media/images/bento-coaches.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover grayscale"
              loading="eager"
              decoding="async"
              fetchPriority="high"
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

        {/* Why Vyrek */}
        <section className="border-t border-vyrek-border-subtle py-24 md:py-32">
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Why Vyrek</Eyebrow>
              <h2 className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl">
                Programming that works backwards from the race.
              </h2>

              <div className="mt-10 space-y-8 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                <p>
                  Hyrox went from 600 athletes in 2018 to over 650,000 in 2024.
                  It has become the fastest growing endurance sport in Europe.
                  The format is precise: eight stations, eight 1km runs, in a
                  fixed order, on a measured floor. Most training programmes
                  are not built for that.
                </p>
                <p>
                  Generic functional fitness teaches you to be strong in
                  isolation. Most running plans teach you to be fast over
                  ground. Neither prepares you for the specific challenge of
                  running 8km between hard stations with race-pace decisions
                  to make in real time.
                </p>
                <p>
                  Vyrek programmes work backwards from the race format. Every
                  week is built around the stations that decide your time:
                  sled push, sled pull, burpee broad jump, wall ball. Run
                  volume is matched to station volume. Recovery is programmed,
                  not improvised. By race day, you have rehearsed the day, not
                  hoped for it.
                </p>
              </div>
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
                schedules. We answer every email ourselves.
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
