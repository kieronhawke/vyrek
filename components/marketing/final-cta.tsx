import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { CtaButton } from "@/components/shared/cta-button";
import { RevealOnView } from "@/components/shared/reveal-on-view";
import { SplitHeading } from "@/components/shared/split-heading";

/**
 * Brief 2.15: final CTA block. Centred, large, no price, no
 * "cancel anytime" copy. Trial framing only.
 */

export function FinalCta() {
  return (
    <RevealOnView
      as="section"
      aria-labelledby="final-cta-heading"
      className="border-t border-vyrek-border-subtle py-24 md:py-40"
    >
      <Container>
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Eyebrow>Start</Eyebrow>
          <SplitHeading
            id="final-cta-heading"
            className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.05em] text-vyrek-text md:text-4xl lg:text-5xl"
          >
            Train like a Hyrox athlete.
          </SplitHeading>
          <div className="mt-10">
            <CtaButton href="/quiz" size="lg">
              Find your plan
            </CtaButton>
          </div>
          <p className="mt-5 font-mono text-xs uppercase tracking-[0.18em] text-vyrek-text-tertiary">
            7-day free trial. No card needed to start.
          </p>
        </div>
      </Container>
    </RevealOnView>
  );
}
