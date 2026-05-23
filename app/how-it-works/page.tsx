import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Vyrek in four steps: quiz, Week 1 reveal, free trial, then train and adapt. See exactly what you get.",
};

const STEPS = [
  {
    number: "01",
    label: "Take the quiz",
    image: "/media/images/quiz-interstitial-1.jpg",
    body: [
      "Around 3 minutes. We ask about your race, your experience, the time you can commit, the kit you can train with, and any injuries to plan around.",
      "Single-select questions auto-advance. Multi-select uses a Continue button. Your answers save as you go, so a refresh, a phone call, or a closed tab doesn't cost you anything.",
    ],
  },
  {
    number: "02",
    label: "See your Week 1",
    image: "/media/images/bento-plan.jpg",
    body: [
      "Real workouts, dated, before you pay. Day-by-day for the next seven days, structured to fit the time you have and the kit you have access to.",
      "Tap any day to open the full session: warm-up, main block, cool-down. Total time, intensity zone, every block listed. No demo screens. This is your actual first week.",
    ],
  },
  {
    number: "03",
    label: "Start your trial",
    image: "/media/images/programme-first-race.jpg",
    body: [
      "Seven days free. £8.99 per month after that, billed in pounds sterling through Stripe. Apple Pay and Google Pay work at checkout.",
      "We email you on day 6 to remind you the trial ends tomorrow. Cancel any time in two taps from your account, no questions asked. The trial is built so accidental charges don't happen.",
    ],
  },
  {
    number: "04",
    label: "Train and adapt",
    image: "/media/images/bento-progress.jpg",
    body: [
      "Every Sunday at 6pm, your next seven days appear, calibrated to what you logged the week before. Hit your sessions, the volume builds; miss a few, the plan reshuffles without guilt.",
      "Twelve weeks to your race. Every workout has video form checks where they matter. The plan is yours; the work is yours; the structure is ours.",
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
                className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
              >
                From quiz to start line, in four steps.
              </SplitHeading>
              <p className="mt-5 text-base text-vyrek-text-secondary md:text-lg">
                No mystery. No drip-feed. Here is the whole arc.
              </p>
            </div>
          </Container>
        </section>

        {STEPS.map((step, i) => (
          <section
            key={step.number}
            aria-labelledby={`step-${step.number}`}
            className="border-t border-vyrek-border-subtle py-20 md:py-28"
          >
            <Container>
              <div
                className={`mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-16 ${
                  i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <p className="font-mono text-sm font-medium uppercase tracking-[0.18em] text-vyrek-accent">
                    [ {step.number} ]
                  </p>
                  <h2
                    id={`step-${step.number}`}
                    className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
                  >
                    {step.label}
                  </h2>
                  <div className="mt-6 space-y-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                    {step.body.map((p) => (
                      <p key={p.slice(0, 40)}>{p}</p>
                    ))}
                  </div>
                </div>
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-vyrek-border bg-vyrek-elevated">
                  <img
                    src={step.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover grayscale"
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-vyrek-base/80 via-vyrek-base/20 to-transparent"
                  />
                  <p className="absolute bottom-6 left-6 font-mono text-xs font-medium uppercase tracking-[0.18em] text-vyrek-text">
                    [ STEP {step.number} ]
                  </p>
                </div>
              </div>
            </Container>
          </section>
        ))}

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
