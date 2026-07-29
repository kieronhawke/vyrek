import type { Metadata } from "next";
import Image from "next/image";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { CountUp } from "@/components/shared/count-up";
import { Eyebrow } from "@/components/shared/eyebrow";
import { ParallaxBackdrop } from "@/components/shared/parallax-backdrop";
import { RevealOnView } from "@/components/shared/reveal-on-view";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";

export const metadata: Metadata = {
  title: "About Ben Sutherland. HYROX Elite 15 athlete and founder",
  description:
    "Suth Performance is the coaching platform of Ben Sutherland, a HYROX Elite 15 athlete with Pro Doubles wins in Rotterdam and Glasgow. Personalised 12-week programmes for every level, from first race to professional.",
  alternates: { canonical: "/about" },
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
    body: "Ben reviews your weekly training and answers your questions in the app. The software supports the coach, not the other way round.",
  },
];

const RACE_RECORD = [
  { label: "FIRST RACE", value: "Berlin 2024" },
  { label: "DIVISION", value: "Elite 15 Doubles" },
  { label: "PRO DOUBLES WINS", value: "Rotterdam · Glasgow" },
  { label: "BEST DOUBLES TIMES", value: "49 to 51 minutes" },
] as const;

const GROWTH = [
  { year: "2018", value: 600, suffix: " athletes" },
  { year: "2020", value: 20_000, suffix: "" },
  { year: "2022", value: 160_000, suffix: "" },
  { year: "2024", value: 650_000, suffix: "" },
] as const;

export default function AboutPage() {
  return (
    <>
      <MarketingNav />
      <main>
        {/* Hero band with overlay image */}
        <section
          aria-labelledby="about-heading"
          className="relative isolate flex min-h-[68svh] flex-col justify-end overflow-hidden bg-suth-base pb-16 pt-[max(7rem,calc(var(--safe-top)+6rem))]"
        >
          <ParallaxBackdrop
            intensity={70}
            className="absolute inset-0 -z-10"
          >
            {/* Own shoot footage (see docs/assets/asset-database.md). */}
            <Image
              src="/media/images/track/sunflare-stride-bw.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-suth-base/70 via-suth-base/55 to-suth-base" />
          </ParallaxBackdrop>
          <Container>
            <Eyebrow>About</Eyebrow>
            <SplitHeading
              id="about-heading"
              as="h1"
              className="mt-4 max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.04em] text-suth-text md:text-[52px]"
            >
              Coached by an athlete who races at the sharp end.
            </SplitHeading>
            <p className="mt-5 max-w-2xl text-base text-suth-text-secondary md:text-lg">
              Suth Performance is the coaching platform of Ben Sutherland,
              HYROX Elite 15 athlete. One coach, one method, every level from
              first race to professional.
            </p>
          </Container>
        </section>

        {/* Ben's story */}
        <section
          aria-labelledby="story-heading"
          className="border-t border-suth-border-subtle py-24 md:py-32"
        >
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Ben&apos;s story</Eyebrow>
              <h2
                id="story-heading"
                className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-4xl"
              >
                From a first race in Berlin to the Elite 15.
              </h2>

              <div className="mt-10 space-y-6 text-base leading-relaxed text-suth-text-secondary md:text-lg">
                <p>
                  Ben Sutherland raced his first HYROX in Berlin in 2024. He
                  has since risen to the Elite 15, the division reserved for
                  the fastest athletes in the sport, where he competes in
                  Doubles alongside his brother Harry.
                </p>
                <figure className="-mx-4 my-8 overflow-hidden rounded-2xl md:mx-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/media/images/track/pair-frontal-colour.jpg"
                    alt="Ben and Harry Sutherland running side by side on the track"
                    className="aspect-[16/10] w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </figure>
                <p>
                  The climb was quick but it was not lucky. Multiple Pro
                  Doubles wins, including Rotterdam and Glasgow. Elite 15
                  qualification secured at Miami. Best Doubles times around
                  the 49 to 51 minute mark. Every step came from the same
                  place: structured training, honest review, and a plan that
                  matched the athlete he was at the time, not the athlete he
                  wanted to be.
                </p>
                <p>
                  That is the part most people miss. Ben did not start at the
                  front of the field. He started where everyone starts, on a
                  start line wondering if the training had been right. The
                  difference was the method. And the method is what Suth
                  Performance hands to you.
                </p>
              </div>

              {/* Race record strip (verified facts only) */}
              <ol
                role="list"
                className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4"
                aria-label="Ben Sutherland's racing record"
              >
                {RACE_RECORD.map((r, i) => (
                  <RevealOnView key={r.label} as="li" delay={i * 0.08}>
                    <div className="h-full rounded-md border border-suth-border-subtle bg-suth-elevated p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
                        {r.label}
                      </p>
                      <p className="mt-2 text-base font-bold tracking-[-0.02em] text-suth-text md:text-lg">
                        {r.value}
                      </p>
                    </div>
                  </RevealOnView>
                ))}
              </ol>
            </div>
          </Container>
        </section>

        {/* Coaching philosophy */}
        <section
          aria-labelledby="coaching-heading"
          className="border-t border-suth-border-subtle py-24 md:py-32"
        >
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Coaching</Eyebrow>
              <h2
                id="coaching-heading"
                className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-4xl"
              >
                Beginner to professional. Same method, different loading.
              </h2>

              <div className="mt-10 space-y-6 text-base leading-relaxed text-suth-text-secondary md:text-lg">
                <p>
                  Ben coaches the full range: complete beginners staring down
                  a first race, sub-90 chasers, doubles pairs, and athletes
                  competing at professional level. The principles never
                  change. Structured, progressive blocks that work backwards
                  from the eight stations and eight runs. What changes is the
                  loading, the volume, and the pace targets, all set to where
                  you actually are.
                </p>
                <p>
                  Personalised does not mean a questionnaire and a PDF. Your
                  plan is dated to your race, rebuilt every Sunday from what
                  you logged, and reviewed by Ben each week. When something
                  does not make sense, you ask him in the app and he answers.
                </p>
                <figure className="-mx-4 mt-10 overflow-hidden rounded-2xl md:mx-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/media/images/track/gym-coach-row-colour.jpg"
                    alt="Coaching an athlete through a rowing interval in the gym"
                    className="aspect-[21/9] w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </figure>
              </div>
            </div>
          </Container>
        </section>

        {/* Why Suth Performance exists */}
        <section
          aria-labelledby="mission-heading"
          className="border-t border-suth-border-subtle py-24 md:py-32"
        >
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Why this exists</Eyebrow>
              <h2
                id="mission-heading"
                className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-4xl"
              >
                A note from Ben.
              </h2>
              <div className="mt-10 space-y-6 text-base leading-relaxed text-suth-text-secondary md:text-lg">
                <p>
                  &ldquo;I went from my first race in Berlin to the Elite 15,
                  and the honest answer for how is not talent. It is that I
                  trained to a structure and trusted it. Most
                  people who fall short of what they could do in this sport
                  are not short of effort. They are short of a plan that
                  respects where they are and tells them exactly what to do
                  next. That is what I build here. Whether it is your first
                  race or your fifteenth, you get the same thing I give
                  myself: a structured, progressive, personal plan, and a
                  coach who actually looks at your training.&rdquo;
                </p>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-suth-text-tertiary">
                  [ BEN SUTHERLAND · FOUNDER, SUTH PERFORMANCE ]
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* Why Hyrox */}
        <section
          aria-labelledby="why-heading"
          className="border-t border-suth-border-subtle py-24 md:py-32"
        >
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Why Hyrox</Eyebrow>
              <h2
                id="why-heading"
                className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-4xl"
              >
                Programming that works backwards from the race.
              </h2>

              <div className="mt-10 space-y-6 text-base leading-relaxed text-suth-text-secondary md:text-lg">
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

              {/* Growth timeline graphic. Numbers count up the first time
                  the row scrolls into view (CountUp uses
                  IntersectionObserver + an ease-out cubic). */}
              <ol
                role="list"
                className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4"
                aria-label="Hyrox global participation by year"
              >
                {GROWTH.map((g, i) => (
                  <RevealOnView key={g.year} as="li" delay={i * 0.08}>
                    <div className="rounded-md border border-suth-border-subtle bg-suth-elevated p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
                        {g.year}
                      </p>
                      <p className="mt-2 text-lg font-bold tracking-[-0.02em] text-suth-text md:text-xl">
                        <CountUp
                          value={g.value}
                          suffix={g.suffix}
                          durationMs={1500}
                        />
                      </p>
                    </div>
                  </RevealOnView>
                ))}
              </ol>
            </div>
          </Container>
        </section>

        {/* What we believe (3 principle cards) */}
        <section
          aria-labelledby="believe-heading"
          className="border-t border-suth-border-subtle py-24 md:py-32"
        >
          <Container>
            <div className="mx-auto max-w-5xl">
              <div className="mx-auto max-w-3xl">
                <Eyebrow>What we believe</Eyebrow>
                <h2
                  id="believe-heading"
                  className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-4xl"
                >
                  Three principles that decide every workout.
                </h2>
              </div>

              <ul
                role="list"
                className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3"
              >
                {PRINCIPLES.map((p, i) => (
                  <RevealOnView key={p.tag} as="li" delay={i * 0.12}>
                    <div className="rounded-lg border border-suth-border-subtle bg-suth-elevated p-6">
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
                        [ {p.tag} ]
                      </p>
                      <p className="mt-4 text-base leading-relaxed text-suth-text-secondary md:text-lg">
                        {p.body}
                      </p>
                    </div>
                  </RevealOnView>
                ))}
              </ul>
            </div>
          </Container>
        </section>

        {/* Built in the UK */}
        <section className="border-t border-suth-border-subtle py-24 md:py-32">
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Made in UK</Eyebrow>
              <h2 className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-4xl">
                Built in the UK.
              </h2>
              <p className="mt-6 text-base leading-relaxed text-suth-text-secondary md:text-lg">
                Suth Performance is built in the United Kingdom by Ben
                Sutherland. The programming is designed for UK athletes
                training in UK gyms with UK race schedules, and it travels
                well: the stations weigh the same everywhere.
              </p>
              <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-suth-text-tertiary">
                [ MADE IN UK ]
              </p>
            </div>
          </Container>
        </section>

        {/* Final CTA */}
        <section className="border-t border-suth-border-subtle py-24 md:py-32">
          <Container>
            <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
              <Eyebrow>Start</Eyebrow>
              <h2 className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-[46px]">
                Ready to find your plan?
              </h2>
              <p className="mt-4 text-base text-suth-text-secondary md:text-lg">
                Three-minute quiz. Real Week 1 before you pay.
              </p>
              <div className="mt-8">
                <CtaButton href="/quiz" size="lg">
                  Find your plan →
                </CtaButton>
              </div>
              <p className="mt-4 text-sm text-suth-text-tertiary">
                Free consultation first. Cancel anytime.
              </p>
            </div>
          </Container>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
