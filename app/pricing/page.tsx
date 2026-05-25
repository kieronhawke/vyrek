import type { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { CtaButton } from "@/components/shared/cta-button";
import { ReferralCodeInput } from "@/components/marketing/referral-code-input";
import { SplitHeading } from "@/components/shared/split-heading";
import { PRICING } from "@/lib/pricing";
import { FAQS } from "@/lib/faqs";

export const metadata: Metadata = {
  title: "Pricing, £8.99/mo Hyrox training, first week free",
  description: `Vyrek Hyrox membership is ${PRICING.monthlyDisplay}/month with a 7-day free trial. All four programmes included. First Race, Sub-90, Doubles, Pro. Cancel anytime in two taps, no minimum term.`,
  alternates: { canonical: "/pricing" },
};

// 4 most common questions for the mini-FAQ on the pricing page.
const MINI_FAQ = FAQS.filter((f) =>
  [
    "What happens after my trial ends?",
    "Can I cancel during the trial?",
    "What equipment do I need?",
    "Will my plan change as I improve?",
  ].includes(f.question),
);

export default function PricingPage() {
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-32 md:pt-40">
        <Container>
          <header className="mx-auto max-w-2xl text-center">
            <Eyebrow>Pricing</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.05em] text-vyrek-text md:text-4xl lg:text-5xl"
            >
              One plan. All programmes.
            </SplitHeading>
          </header>

          <section className="mx-auto mt-16 max-w-xl">
            <div className="pricing-card shimmer relative overflow-hidden rounded-lg border border-vyrek-border-strong bg-vyrek-elevated p-8 md:p-10">
              {/* Soft accent gradient on the top edge. Apple's pricing-card flourish */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-vyrek-accent/60 to-transparent"
              />
              <div className="text-center">
                <div className="font-mono text-xs uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                  Vyrek membership
                </div>
                <div className="pricing-card-price mt-4 flex items-baseline justify-center gap-2">
                  <span className="text-4xl font-black tracking-[-0.06em] text-vyrek-text md:text-5xl">
                    {PRICING.monthlyDisplay}
                  </span>
                  <span className="text-base text-vyrek-text-secondary">
                    /month
                  </span>
                </div>
                <p className="mt-3 text-base text-vyrek-text">
                  First week free, then {PRICING.monthlyDisplay}/month
                </p>
                <p className="mt-1 text-sm text-vyrek-text-tertiary">
                  {PRICING.anchorCopy}
                </p>
              </div>

              <ul className="mt-10 space-y-3">
                {PRICING.inclusions.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-base">
                    <span
                      aria-hidden
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-vyrek-accent"
                    />
                    <span className="text-vyrek-text">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <CtaButton href="/quiz" fullWidth size="lg">
                  {PRICING.ctaLabel}
                </CtaButton>
              </div>

              <p className="mt-4 text-center text-xs text-vyrek-text-tertiary">
                Cancel anytime in two taps. No charge during trial.
              </p>

              <div className="mt-8 border-t border-vyrek-border-subtle pt-6">
                <ReferralCodeInput />
              </div>
            </div>
          </section>

          {/* Why £8.99?, defuses the "too cheap, must be templated" reaction
              that experienced racers have when they compare to HAC (£45)
              or Marchon (£30). Honesty pre-empts skepticism. */}
          <section className="mx-auto mt-16 max-w-2xl">
            <div className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated/60 p-6 md:p-8">
              <Eyebrow>Why £8.99?</Eyebrow>
              <h2 className="mt-3 text-balance text-xl font-black leading-tight tracking-[-0.04em] text-vyrek-text sm:text-2xl md:text-3xl">
                Software-first, not 1:1 coaching.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                Vyrek is a personalised programme delivered by software.
                Programming is written and reviewed weekly by our Elite 15
                coaching team, then the algorithm calibrates it to your race
                date, equipment, body weight, injuries, and the sessions
                you&apos;ve actually logged.
              </p>
              <p className="mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                What you get for £8.99/mo: the same programming logic an Elite
                15 coach would write, applied to your inputs, updated every
                Sunday. What you don&apos;t get: a human messaging you weekly,
                video form-checks on demand, or a custom block written for your
                name. If you want that, you want 1:1 coaching, typically
                £150, £400/mo elsewhere.
              </p>
              <p className="mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                We&apos;re open about the trade. Most members never need 1:1.
                Some do, and we&apos;ll signpost when.
              </p>
            </div>
          </section>

          <section className="mx-auto mt-20 max-w-3xl">
            <p className="text-center font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
              [ FROM THE FIELD ]
            </p>
            <h2 className="mt-3 text-center text-2xl font-black tracking-[-0.04em] text-vyrek-text md:text-3xl">
              Why members stay
            </h2>
            <ul role="list" className="mt-8 grid gap-4 md:grid-cols-3">
              <li className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5">
                <p className="text-sm leading-relaxed text-vyrek-text">
                  &ldquo;Got me to my first Hyrox finish in 92 minutes when
                  I&apos;d planned for 105.&rdquo;
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                  Sarah · Bristol · First Race graduate
                </p>
              </li>
              <li className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5">
                <p className="text-sm leading-relaxed text-vyrek-text">
                  &ldquo;Broke 85 minutes after three years stuck at 95. The
                  Sub-90 programme actually delivers on the name.&rdquo;
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                  Marcus · Manchester · Sub-90 graduate
                </p>
              </li>
              <li className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5">
                <p className="text-sm leading-relaxed text-vyrek-text">
                  &ldquo;The Doubles programme is the only one I&apos;ve found
                  that builds station handoff strategy. 11 minutes off our
                  PB.&rdquo;
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                  Alex &amp; Jamie · Edinburgh · Doubles
                </p>
              </li>
            </ul>
          </section>

          <section className="mx-auto mt-24 max-w-2xl">
            <h2 className="text-center text-2xl font-black tracking-[-0.04em] text-vyrek-text md:text-3xl">
              Common questions
            </h2>
            <div className="mt-8">
              <Accordion>
                {MINI_FAQ.map((f, i) => (
                  <AccordionItem
                    key={f.question}
                    value={`mini-${i}`}
                    className="border-b border-vyrek-border-subtle last:border-b-0"
                  >
                    <AccordionTrigger className="py-5 text-left text-base font-medium text-vyrek-text hover:no-underline md:text-lg">
                      {f.question}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-base leading-relaxed text-vyrek-text-secondary">
                      {f.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
