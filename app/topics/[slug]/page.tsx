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
import { RelatedGrid } from "@/components/shared/related-grid";
import {
  getTopicHub,
  listTopicSlugs,
  TOPIC_HUBS,
} from "@/lib/topic-hubs";
import { PLAN_TEMPLATES } from "@/lib/plan-templates";
import { STATIONS } from "@/lib/hyrox-stations";
import { listPostMeta } from "@/lib/blog/posts";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;
export const dynamicParams = false;

export async function generateStaticParams() {
  return listTopicSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = getTopicHub(slug);
  if (!t) return { title: "Not found" };
  const url = `${siteUrl()}/topics/${t.slug}`;
  return {
    title: t.title,
    description: t.hook,
    alternates: { canonical: url },
    openGraph: {
      title: t.title,
      description: t.hook,
      url,
      siteName: "Vyrek",
      type: "website",
      locale: "en_GB",
    },
    twitter: { card: "summary_large_image", title: t.title, description: t.hook },
    robots: { index: true, follow: true },
  };
}

export default async function TopicHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = getTopicHub(slug);
  if (!t) notFound();

  const url = `${siteUrl()}/topics/${t.slug}`;
  const allPosts = await listPostMeta();
  const posts = allPosts.filter((p) => t.blogSlugs.includes(p.slug));
  const plans = PLAN_TEMPLATES.filter((p) => t.planSlugs.includes(p.slug));
  const stations = (t.stationSlugs ?? [])
    .map((s) => STATIONS.find((x) => x.slug === s))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
      {
        "@type": "ListItem",
        position: 2,
        name: "Topics",
        item: `${siteUrl()}/topics`,
      },
      { "@type": "ListItem", position: 3, name: t.title, item: url },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: t.faqs.map((f) => ({
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
            <Link href="/topics" className="hover:text-vyrek-text">Topics</Link>
            <span aria-hidden className="mx-2">/</span>
            <span className="text-vyrek-text">{t.eyebrow}</span>
          </nav>

          <div className="mx-auto max-w-3xl">
            <Eyebrow>{t.eyebrow}</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
            >
              {t.title}
            </SplitHeading>
            {t.intro.map((p, i) => (
              <p
                key={i}
                className="mt-5 text-base leading-relaxed text-vyrek-text-secondary md:text-lg"
              >
                {p}
              </p>
            ))}
            <div className="mt-8">
              <CtaButton href="/quiz" size="md">
                Find your plan →
              </CtaButton>
            </div>
          </div>

          {/* Plans */}
          {plans.length > 0 ? (
            <section className="mx-auto mt-16 max-w-5xl border-t border-vyrek-border-subtle pt-10">
              <Eyebrow>Plans for this audience</Eyebrow>
              <ul role="list" className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                {plans.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/plans/${p.slug}`}
                      className="lift-on-hover block h-full rounded-lg border border-vyrek-border bg-vyrek-elevated p-6"
                    >
                      <Eyebrow>{p.eyebrow}</Eyebrow>
                      <h3 className="mt-3 text-lg font-black tracking-[-0.04em] text-vyrek-text">
                        {p.title}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-vyrek-text-secondary">
                        {p.hook}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Blog posts */}
          {posts.length > 0 ? (
            <section className="mx-auto mt-16 max-w-5xl border-t border-vyrek-border-subtle pt-10">
              <Eyebrow>Read next</Eyebrow>
              <ul role="list" className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {posts.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/blog/${p.slug}`}
                      className="lift-on-hover block h-full rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5"
                    >
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-accent">
                        {p.category}
                      </p>
                      <p className="mt-2 text-sm font-bold leading-snug text-vyrek-text">
                        {p.title}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-vyrek-text-secondary">
                        {p.excerpt}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Stations */}
          {stations.length > 0 ? (
            <section className="mx-auto mt-16 max-w-5xl border-t border-vyrek-border-subtle pt-10">
              <Eyebrow>Key stations for this audience</Eyebrow>
              <ul role="list" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                {stations.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/hyrox/stations/${s.slug}`}
                      className="lift-on-hover block h-full rounded-md border border-vyrek-border-subtle bg-vyrek-elevated p-4"
                    >
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                        Station {String(s.order).padStart(2, "0")}
                      </p>
                      <p className="mt-2 text-sm font-bold text-vyrek-text">
                        {s.name}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* FAQs */}
          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10" aria-labelledby="topic-faq-heading">
            <Eyebrow>FAQs</Eyebrow>
            <h2 id="topic-faq-heading" className="sr-only">
              {t.eyebrow} — frequently asked questions
            </h2>
            <div className="mt-6">
              <Accordion>
                {t.faqs.map((f, i) => (
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

          {/* Other topics */}
          <RelatedGrid
            heading="Other topic hubs"
            items={TOPIC_HUBS.filter((x) => x.slug !== t.slug).map((x) => ({
              href: `/topics/${x.slug}`,
              eyebrow: x.eyebrow,
              title: x.title,
              body: x.hook,
            }))}
          />

          {/* Final CTA */}
          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10 text-center">
            <Eyebrow>Start</Eyebrow>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-vyrek-text md:text-4xl">
              Build your plan.
            </h2>
            <p className="mt-4 text-base text-vyrek-text-secondary md:text-lg">
              Three-minute quiz. Dated Week 1 before you pay. £4.99/month.
            </p>
            <div className="mt-8">
              <CtaButton href="/quiz" size="lg">
                Find your plan →
              </CtaButton>
            </div>
          </section>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
