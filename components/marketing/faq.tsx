import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { RevealOnView } from "@/components/shared/reveal-on-view";
import { SplitHeading } from "@/components/shared/split-heading";
import { FAQS } from "@/lib/faqs";

export function Faq() {
  // Split into two columns on desktop, single accordion on mobile.
  const mid = Math.ceil(FAQS.length / 2);
  const colA = FAQS.slice(0, mid);
  const colB = FAQS.slice(mid);

  return (
    <RevealOnView
      as="section"
      aria-labelledby="faq-heading"
      className="border-t border-vyrek-border-subtle py-24 md:py-32"
    >
      <Container>
        {/* FAQPage JSON-LD, search engines render these as rich results. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQS.map((f) => ({
                "@type": "Question",
                name: f.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: f.answer,
                },
              })),
            }),
          }}
        />
        <header className="mx-auto max-w-2xl text-center">
          <Eyebrow>Questions</Eyebrow>
          <SplitHeading
            id="faq-heading"
            className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
          >
            Common questions
          </SplitHeading>
        </header>

        <div className="mx-auto mt-12 max-w-6xl">
          {/* Mobile: single column */}
          <Accordion className="md:hidden">
            {FAQS.map((f, i) => (
              <AccordionItem
                key={f.question}
                value={`item-${i}`}
                className="border-b border-vyrek-border-subtle last:border-b-0"
              >
                <AccordionTrigger className="py-5 text-left text-base font-medium text-vyrek-text hover:no-underline">
                  {f.question}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-base leading-relaxed text-vyrek-text-secondary">
                  {f.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Desktop: two columns */}
          <div className="hidden gap-12 md:grid md:grid-cols-2">
            {[colA, colB].map((col, ci) => (
              <Accordion key={ci}>
                {col.map((f, i) => (
                  <AccordionItem
                    key={f.question}
                    value={`col-${ci}-item-${i}`}
                    className="border-b border-vyrek-border-subtle last:border-b-0"
                  >
                    <AccordionTrigger className="py-5 text-left text-lg font-medium text-vyrek-text hover:no-underline">
                      {f.question}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-base leading-relaxed text-vyrek-text-secondary">
                      {f.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ))}
          </div>
        </div>
      </Container>
    </RevealOnView>
  );
}
