import type { Metadata } from "next";
import Image from "next/image";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Suth Performance in four steps: a few questions, a free call with Ben Sutherland, a plan built round your week, and a coach who adjusts it. No card, no commitment.",
  alternates: { canonical: "/how-it-works" },
};

type Step = {
  number: string;
  label: string;
  image: string;
  body: string[];
  cta?: { label: string; href: string };
};

/* THIS PAGE DESCRIBED A PRODUCT THAT NO LONGER EXISTS.
   It walked through "take the quiz, see your Week 1 free, start your trial,
   cancel anytime in the app" — the funnel from before the route became a
   free assessment with Ben. Every other page now promises a phone call and
   this one promised a self-serve trial, which is worse than looking weak:
   somebody reading it arrives at the quiz expecting something different
   from what they get.

   The four steps are the four things that actually happen now. Step 3 is
   the call, so it shows Ben. */
const STEPS: Step[] = [
  {
    number: "01",
    label: "Tell us where you're at",
    image: "/media/images/camp/camp-portrait-dawn-hr-strap-wide.jpg",
    body: [
      "Around three minutes. What you want out of this, what you've tried, how much time your week really has in it, and anything to train around.",
      "Your answers save as you go, so a phone call or a closed tab costs you nothing. There is no card and nothing to pay at any point in this.",
    ],
  },
  {
    number: "02",
    label: "Pick a time that suits you",
    image: "/media/images/camp/camp-trail-run-pair-sky-wide.jpg",
    body: [
      "You choose a slot from Ben's actual diary — evenings and weekends included — and it's yours. A confirmation lands by email and text straight away.",
      "Need to move it? The email does that in two taps. No forms, no waiting on a reply.",
    ],
  },
  {
    number: "03",
    label: "Ben calls you",
    image: "/media/images/camp/camp-portrait-forders-banner-wide.jpg",
    body: [
      "Half an hour on the phone, free, no obligation. He'll have read everything you sent before he rings, so you're not starting from the beginning.",
      "He'll tell you honestly what it would take to get where you want to go — and if he isn't the right coach for it, he'll say so and point you somewhere better.",
    ],
    cta: { label: "Book your free assessment →", href: "/book" },
  },
  {
    number: "04",
    label: "Train, and keep adapting",
    image: "/media/images/track/gym-coach-row-colour.jpg",
    body: [
      "If you decide to go ahead, your plan is built round the week you described rather than an ideal one you don't have.",
      "It rebuilds as you log sessions. Strong week, it pushes. Rough week, it backs off and rebuilds. Ben is on the other end of it the whole way through.",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <MarketingNav />
      <main>
        <section
          aria-labelledby="how-heading"
          className="pb-12 pt-32 md:pt-40"
        >
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>How it works</Eyebrow>
              <SplitHeading
                id="how-heading"
                as="h1"
                className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-[48px]"
              >
                From quiz to start line, in four steps.
              </SplitHeading>
              <p className="mt-5 text-base text-suth-text-secondary md:text-lg">
                No mystery, no drip-feed, and nothing to pay to find out
                whether this is for you. Here is the whole arc.
              </p>
            </div>
          </Container>
        </section>

        {STEPS.map((step, i) => (
          <section
            key={step.number}
            aria-labelledby={`step-${step.number}`}
            className="border-t border-suth-border-subtle py-14 md:py-20"
          >
            <Container>
              {/* THE NUMBER CARRIES ITS OWN COLUMN FROM lg.
                  Two even columns of text-and-photo at max-w-5xl is the same
                  shape four times running, and on a wide screen it read as a
                  narrow strip down the middle of an empty page — the "weak"
                  Kieron saw. A third, narrow column holds the step number as
                  a large numeral with a rule under it, so the sequence is
                  legible at a glance instead of being announced in 14px mono
                  four times. The text column keeps a readable measure rather
                  than stretching to fill, which is the other half of why
                  wide-screen pages look thin. */}
              <div
                className={`mx-auto grid max-w-6xl items-start gap-10 md:grid-cols-2 md:items-center md:gap-12 lg:grid-cols-[5rem_minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 ${
                  i % 2 === 1
                    ? "md:[&>*:first-child]:order-2 lg:[&>*:first-child]:order-none lg:[&>*:nth-child(2)]:order-3"
                    : ""
                }`}
              >
                <div
                  aria-hidden
                  className="hidden lg:block lg:pt-2"
                >
                  <span className="block font-mono text-[2.75rem] font-bold leading-none tracking-[-0.04em] text-suth-accent">
                    {step.number}
                  </span>
                  <span className="mt-4 block h-px w-12 bg-suth-border-strong" />
                </div>
                <div className="max-w-[46ch]">
                  <p className="font-mono text-sm font-medium uppercase tracking-[0.18em] text-suth-accent lg:hidden">
                    [ {step.number} ]
                  </p>
                  <h2
                    id={`step-${step.number}`}
                    className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-[34px] lg:mt-0"
                  >
                    {step.label}
                  </h2>
                  <div className="mt-6 space-y-4 text-base leading-relaxed text-suth-text-secondary md:text-lg">
                    {step.body.map((p) => (
                      <p key={p.slice(0, 40)}>{p}</p>
                    ))}
                  </div>
                  {step.cta ? (
                    <div className="mt-8">
                      <CtaButton href={step.cta.href} size="md">
                        {step.cta.label}
                      </CtaButton>
                    </div>
                  ) : null}
                </div>
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-suth-border bg-suth-elevated md:aspect-[4/3]">
                  {/* All four lazy — the first one is not special.
                    *
                    * `loading="eager"` on step 01 put a 403 KB raw JPEG into
                    * the RSC payload for this route. Every page in the Results
                    * section links here from its footer, Next prefetches the
                    * route, and the eager image came with it: 403 KB of a
                    * 1.1 MB page, on pages that render no images at all.
                    *
                    * This is the second time this exact bug has shipped — the
                    * station-guide heroes did the same thing and were fixed the
                    * same way. There is now a page-weight guard in the suite so
                    * there is not a third.
                    *
                    * Nothing is lost by lazy-loading it: this sits beside a
                    * block of body copy well down the page, so it is not the
                    * LCP element on any viewport. */}
                  {/*
                    MEASURED: as a raw `<img>` these four served their full
                    1467x2200 originals into a 486x364 slot — 1.5 MB of
                    photography for about 120 KB of visible pixels, and the
                    single heaviest thing on this page by a wide margin.

                    `sizes` is the part that actually does the work: without it
                    Next assumes 100vw and hands back a 1920-wide file, so the
                    optimiser runs and nothing gets smaller.
                  */}
                  <Image
                    src={step.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 42vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover grayscale"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-suth-base/80 via-suth-base/20 to-transparent"
                  />
                  <p className="absolute bottom-6 left-6 font-mono text-xs font-medium uppercase tracking-[0.18em] text-suth-text">
                    [ STEP {step.number} ]
                  </p>
                </div>
              </div>
            </Container>
          </section>
        ))}

        <section className="border-t border-suth-border-subtle py-24 md:py-32">
          <Container>
            <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
              <Eyebrow>Start</Eyebrow>
              <h2 className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-[44px]">
                Start with a conversation.
              </h2>
              <p className="mt-4 text-base text-suth-text-secondary md:text-lg">
                Three minutes of questions, then half an hour with Ben. Free,
                and you&apos;ll know either way by the end of it.
              </p>
              <div className="mt-8">
                <CtaButton href="/quiz" size="lg">
                  Free assessment →
                </CtaButton>
              </div>
              <p className="mt-4 text-sm text-suth-text-tertiary">
                No card. No obligation. Move or cancel the call any time.
              </p>
            </div>
          </Container>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
