import { faqPage, jsonLd } from "@/lib/results/structured-data";

/**
 * An FAQ block that renders and marks itself up from the same array.
 *
 * The pairing is the point. The commonest way `FAQPage` schema goes wrong is
 * that the JSON and the visible copy drift apart — Google's guideline is that
 * the answer must be present on the page, and a block that promises answers a
 * reader cannot see is a manual-action risk rather than a rich result. Passing
 * one array to both makes that failure impossible by construction.
 *
 * `<details>` rather than a JS accordion so the answers exist in the HTML for
 * a crawler whether or not anything hydrates, and so the whole thing is
 * keyboard-operable for free.
 *
 * The competitor emits no FAQ schema anywhere on its site, and these questions
 * ("what's a good hyrox time in london", "when is the next hyrox in berlin")
 * are exactly the long-tail phrasing people search.
 */
export function FaqSection({
  faqs,
  title = "Common questions",
  id = "faq",
}: {
  faqs: { q: string; a: string }[];
  title?: string;
  id?: string;
}) {
  if (faqs.length === 0) return null;

  return (
    <section aria-labelledby={`${id}-heading`} className="mt-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqPage(faqs)) }}
      />
      <h2
        id={`${id}-heading`}
        className="font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary"
      >
        {title}
      </h2>

      <div className="mt-3 divide-y divide-suth-border-subtle rounded-md border border-suth-border-subtle bg-suth-elevated">
        {faqs.map((faq) => (
          <details key={faq.q} className="group px-4 py-3">
            <summary
              className="flex cursor-pointer list-none items-center justify-between gap-4
                         text-sm font-semibold text-suth-text
                         focus-visible:outline-2 focus-visible:outline-offset-2
                         focus-visible:outline-suth-accent"
            >
              {faq.q}
              <span
                aria-hidden
                className="shrink-0 font-mono text-suth-text-tertiary transition-transform
                           group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-suth-text-secondary">
              {faq.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
