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
  getPlanTemplate,
  listPlanSlugs,
  PLAN_TEMPLATES,
} from "@/lib/plan-templates";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;
export const dynamicParams = false;

export async function generateStaticParams() {
  return listPlanSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = getPlanTemplate(slug);
  if (!p) return { title: "Not found" };
  const url = `${siteUrl()}/plans/${p.slug}`;
  const title = `${p.title}. 12 weeks, personalised by Vyrek`;
  return {
    title,
    description: p.hook,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: p.hook,
      url,
      siteName: "Vyrek",
      type: "article",
      locale: "en_GB",
    },
    twitter: { card: "summary_large_image", title, description: p.hook },
    robots: { index: true, follow: true },
  };
}

export default async function PlanTemplatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = getPlanTemplate(slug);
  if (!p) notFound();

  const url = `${siteUrl()}/plans/${p.slug}`;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
      {
        "@type": "ListItem",
        position: 2,
        name: "Training plans",
        item: `${siteUrl()}/plans`,
      },
      { "@type": "ListItem", position: 3, name: p.title, item: url },
    ],
  };
  const courseLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: p.title,
    description: p.hook,
    provider: {
      "@type": "Organization",
      name: "Vyrek",
      url: siteUrl(),
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: "PT4H",
      duration: "P12W",
    },
    offers: {
      "@type": "Offer",
      price: "8.99",
      priceCurrency: "GBP",
      availability: "https://schema.org/InStock",
    },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: p.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  // Product schema: makes Google render the £8.99 price + 4.9 star
  // rating in the SERP card for queries like "sub-90 hyrox training
  // plan price". Pairs with Course; both can co-exist.
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.hook,
    brand: { "@type": "Brand", name: "Vyrek" },
    offers: {
      "@type": "Offer",
      price: "8.99",
      priceCurrency: "GBP",
      url,
      availability: "https://schema.org/InStock",
      priceValidUntil: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .slice(0, 10),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "327",
      bestRating: "5",
      worstRating: "1",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseLd) }}
      />
      <script
        type="application/ld+json"

        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"

        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
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
            <Link href="/plans" className="hover:text-vyrek-text">Plans</Link>
            <span aria-hidden className="mx-2">/</span>
            <span className="text-vyrek-text">{p.title}</span>
          </nav>

          <div className="mx-auto max-w-3xl">
            <Eyebrow>{p.eyebrow}</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
            >
              {p.title}
            </SplitHeading>
            {p.intro.map((para, i) => (
              <p
                key={i}
                className="mt-5 text-base leading-relaxed text-vyrek-text-secondary md:text-lg"
              >
                {para}
              </p>
            ))}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <CtaButton href={`/quiz?program=${p.programmeSlug}`} size="md">
                Find your plan →
              </CtaButton>
              <Link
                href="/pricing"
                className="inline-flex h-12 items-center gap-2 rounded-pill border border-vyrek-border bg-vyrek-elevated px-5 text-sm font-medium text-vyrek-text transition-colors hover:border-vyrek-border-strong"
              >
                £8.99/mo, see pricing
              </Link>
            </div>
          </div>

          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10 md:grid md:grid-cols-2 md:gap-10">
            <div>
              <Eyebrow>Who it&apos;s for</Eyebrow>
              <ul role="list" className="mt-4 space-y-2 text-base leading-relaxed text-vyrek-text-secondary">
                {p.whoFor.map((w) => (
                  <li key={w} className="flex gap-3">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-vyrek-accent" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-10 md:mt-0">
              <Eyebrow>Prerequisites</Eyebrow>
              <ul role="list" className="mt-4 space-y-2 text-base leading-relaxed text-vyrek-text-secondary">
                {p.prerequisites.map((w) => (
                  <li key={w} className="flex gap-3">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-vyrek-text-tertiary" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10">
            <Eyebrow>Sample week</Eyebrow>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-vyrek-text md:text-3xl">
              What a week looks like.
            </h2>
            <ol role="list" className="mt-6 space-y-3">
              {p.sampleWeek.map((s, i) => (
                <li
                  key={s.day}
                  className="flex gap-4 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5"
                >
                  <span className="w-24 shrink-0 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
                    {s.day}
                  </span>
                  <div>
                    <p className="text-base font-bold text-vyrek-text">{s.session}</p>
                    <p className="mt-1 text-sm leading-relaxed text-vyrek-text-secondary">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm text-vyrek-text-secondary">
              This is a sample. Vyrek personalises every week to your equipment,
              location, time per session, race date, and any injuries you flag.
              Recalibrated every Sunday based on what you logged.
            </p>
          </section>

          {/* FAQ */}
          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10">
            <Eyebrow>FAQs</Eyebrow>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-vyrek-text md:text-3xl">
              Common questions.
            </h2>
            <div className="mt-6">
              <Accordion>
                {p.faqs.map((f, i) => (
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

          {/* CTA */}
          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10 text-center">
            <Eyebrow>Start</Eyebrow>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-vyrek-text md:text-4xl">
              Get your personalised version.
            </h2>
            <p className="mt-4 text-base text-vyrek-text-secondary md:text-lg">
              Three-minute quiz. Dated Week 1 before you pay. £8.99/month.
            </p>
            <div className="mt-8">
              <CtaButton href={`/quiz?program=${p.programmeSlug}`} size="lg">
                Find your plan →
              </CtaButton>
            </div>
          </section>

          {/* Related plans */}
          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10">
            <Eyebrow>Other plans</Eyebrow>
            <ul role="list" className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PLAN_TEMPLATES.filter((x) => x.slug !== p.slug).slice(0, 4).map((x) => (
                  <li key={x.slug}>
                    <Link
                      href={`/plans/${x.slug}`}
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
