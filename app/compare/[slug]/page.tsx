import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  COMPARISONS,
  getComparison,
  listComparisonSlugs,
} from "@/lib/hyrox-comparisons";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;
export const dynamicParams = false;

export async function generateStaticParams() {
  return listComparisonSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) return { title: "Not found" };
  const url = `${siteUrl()}/compare/${c.slug}`;
  return {
    title: c.title,
    description: c.hook,
    alternates: { canonical: url },
    openGraph: {
      title: c.title,
      description: c.hook,
      url,
      siteName: "Vyrek",
      type: "article",
      locale: "en_GB",
    },
    twitter: { card: "summary_large_image", title: c.title, description: c.hook },
    robots: { index: true, follow: true },
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) notFound();

  const url = `${siteUrl()}/compare/${c.slug}`;
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
      {
        "@type": "ListItem",
        position: 2,
        name: "Compare",
        item: `${siteUrl()}/compare`,
      },
      { "@type": "ListItem", position: 3, name: c.title, item: url },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <nav
            aria-label="Breadcrumb"
            className="mb-8 font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-tertiary"
          >
            <Link href="/" className="hover:text-vyrek-text">Home</Link>
            <span aria-hidden className="mx-2">/</span>
            <Link href="/compare" className="hover:text-vyrek-text">Compare</Link>
            <span aria-hidden className="mx-2">/</span>
            <span className="text-vyrek-text">{c.eyebrow}</span>
          </nav>

          <div className="mx-auto max-w-3xl">
            <Eyebrow>{c.eyebrow}</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
            >
              {c.title}
            </SplitHeading>
            {c.intro.map((p, i) => (
              <p key={i} className="mt-5 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                {p}
              </p>
            ))}
          </div>

          <section className="mx-auto mt-16 max-w-4xl border-t border-vyrek-border-subtle pt-10">
            <Eyebrow>Side by side</Eyebrow>
            <div className="mt-6 overflow-hidden rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-vyrek-border-subtle">
                  <tr>
                    <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                      Axis
                    </th>
                    <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-accent">
                      Hyrox
                    </th>
                    <th className="px-4 py-4 font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                      {c.opposite}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {c.rows.map((r, i) => (
                    <tr
                      key={r.axis}
                      className={
                        i < c.rows.length - 1
                          ? "border-b border-vyrek-border-subtle"
                          : ""
                      }
                    >
                      <td className="px-4 py-3 text-vyrek-text-secondary">{r.axis}</td>
                      <td className="px-4 py-3 text-vyrek-text">{r.hyrox}</td>
                      <td className="px-4 py-3 text-vyrek-text-secondary">{r.other}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10">
            <Eyebrow>Verdict</Eyebrow>
            <p className="mt-4 text-base leading-relaxed text-vyrek-text md:text-lg">
              {c.verdict}
            </p>
          </section>

          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10">
            <Eyebrow>FAQs</Eyebrow>
            <div className="mt-6">
              <Accordion>
                {c.faqs.map((f, i) => (
                  <AccordionItem
                    key={i}
                    value={`q-${i}`}
                    className="border-b border-vyrek-border-subtle last:border-b-0"
                  >
                    <AccordionTrigger className="py-5 text-left text-base font-medium text-vyrek-text hover:no-underline md:text-lg">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-base leading-relaxed text-vyrek-text-secondary">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10 text-center">
            <Eyebrow>Pick Hyrox</Eyebrow>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-vyrek-text md:text-4xl">
              Ready to race?
            </h2>
            <p className="mt-4 text-base text-vyrek-text-secondary md:text-lg">
              Three-minute quiz. Dated Week 1 before you pay. £8.99/month.
            </p>
            <div className="mt-8">
              <CtaButton href="/quiz" size="lg">
                Find your plan →
              </CtaButton>
            </div>
          </section>

          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10">
            <Eyebrow>More comparisons</Eyebrow>
            <ul role="list" className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {COMPARISONS.filter((x) => x.slug !== c.slug).map((x) => (
                <li key={x.slug}>
                  <Link
                    href={`/compare/${x.slug}`}
                    className="block rounded-md border border-vyrek-border-subtle bg-vyrek-elevated p-4 transition-colors hover:border-vyrek-border-strong"
                  >
                    <p className="text-sm font-medium text-vyrek-text">{x.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
