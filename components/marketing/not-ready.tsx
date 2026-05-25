import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { RevealOnView } from "@/components/shared/reveal-on-view";
import { SplitHeading } from "@/components/shared/split-heading";

const OBJECTIONS = [
  {
    fear: "I've never raced before",
    response:
      "First Race programme. 12 weeks. Week 1 starts from where you are, not where you wish you were.",
  },
  {
    fear: "I might get injured",
    response:
      "Built-in active recovery. Mobility weekly. Programmed deload weeks.",
  },
  {
    fear: "What if I miss a session?",
    response:
      "Plan adapts. Missed sessions reshuffle. No guilt. No restart.",
  },
];

export function NotReady() {
  return (
    <RevealOnView
      as="section"
      aria-labelledby="objections-heading"
      className="border-t border-vyrek-border-subtle py-24 md:py-32"
    >
      <Container>
        <header className="mx-auto max-w-2xl text-center">
          <Eyebrow>Common questions</Eyebrow>
          <SplitHeading
            id="objections-heading"
            className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
          >
            What if I&apos;m not ready?
          </SplitHeading>
        </header>

        <div className="mx-auto mt-14 grid max-w-6xl gap-8 md:grid-cols-3 md:gap-10">
          {OBJECTIONS.map((o) => (
            <article
              key={o.fear}
              className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-6 md:p-8"
            >
              <h3 className="text-lg font-black leading-snug tracking-[-0.02em] text-vyrek-text md:text-xl">
                &ldquo;{o.fear}&rdquo;
              </h3>
              <p className="mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                {o.response}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </RevealOnView>
  );
}
