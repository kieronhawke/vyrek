import type { Faq } from "@/lib/blog/posts";

/**
 * FAQ section for blog posts. Renders inside the article. The page also
 * emits FAQPage JSON-LD so Google can show rich results.
 */
export function FaqSection({ faqs }: { faqs: Faq[] }) {
  if (!faqs.length) return null;
  return (
    <section
      aria-labelledby="faq-heading"
      className="mt-12 rounded-lg border border-suth-border-subtle bg-suth-elevated p-6 md:p-8"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
        [ FAQ ]
      </p>
      <h2
        id="faq-heading"
        className="mt-3 text-2xl font-black leading-tight tracking-[-0.02em] text-suth-text md:text-3xl"
      >
        Frequently asked
      </h2>
      <div className="mt-6 divide-y divide-suth-border-subtle">
        {faqs.map((f, i) => (
          <details
            key={i}
            className="group py-4 [&[open]>summary>span:last-child]:rotate-45"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
              <span className="flex-1 text-base font-semibold leading-snug text-suth-text md:text-lg">
                {f.q}
              </span>
              <span
                aria-hidden
                className="font-mono text-xl text-suth-text-tertiary transition-transform"
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-base leading-relaxed text-suth-text-secondary md:text-lg">
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
