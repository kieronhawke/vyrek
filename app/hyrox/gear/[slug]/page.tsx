import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  getGearGuide,
  listGearSlugs,
  GEAR_GUIDES,
} from "@/lib/hyrox-gear";
import { siteUrl } from "@/lib/blog/urls";
import { ogImages } from "@/lib/seo/og";

export const revalidate = 86400;
export const dynamicParams = false;

export async function generateStaticParams() {
  return listGearSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const g = getGearGuide(slug);
  if (!g) return { title: "Not found" };
  const url = `${siteUrl()}/hyrox/gear/${g.slug}`;
  return {
    title: g.seoTitle ?? g.title,
    description: g.hook,
    alternates: { canonical: url },
    openGraph: {
      // A child `openGraph` replaces the root layout's entirely rather
      // than merging, so without this the page inherits no social card.
      images: ogImages(),
      title: g.seoTitle ?? g.title,
      description: g.hook,
      url,
      siteName: "Suth Performance",
      type: "article",
      locale: "en_GB",
    },
    twitter: { card: "summary_large_image", title: g.seoTitle ?? g.title, description: g.hook },
    robots: { index: true, follow: true },
  };
}

export default async function GearPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const g = getGearGuide(slug);
  if (!g) notFound();

  const url = `${siteUrl()}/hyrox/gear/${g.slug}`;
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
      {
        "@type": "ListItem",
        position: 2,
        name: "Gear",
        item: `${siteUrl()}/hyrox/gear`,
      },
      { "@type": "ListItem", position: 3, name: g.title, item: url },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: g.faqs.map((f) => ({
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
            className="mb-8 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary"
          >
            <Link href="/" className="hover:text-suth-text">Home</Link>
            <span aria-hidden className="mx-2">/</span>
            <Link href="/hyrox/gear" className="hover:text-suth-text">Gear</Link>
            <span aria-hidden className="mx-2">/</span>
            <span className="text-suth-text">{g.eyebrow}</span>
          </nav>

          {/* TWO COLUMNS FROM lg, AND THE BOTTOM LINE TRAVELS WITH YOU.
              This was a max-w-3xl column all the way down: intro, then two
              lists, then FAQs, on a page whose whole job is to answer one
              purchase question. On a monitor that is a narrow ribbon, and
              the answer — which the data already carries as `summary` — was
              nowhere on the page at all. It is the first thing now, and it
              stays in view while the reasoning scrolls past it. */}
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-16">
          <div className="min-w-0 max-w-3xl">
            <Eyebrow>Gear · {g.eyebrow}</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-[46px]"
            >
              {g.title}
            </SplitHeading>
            {g.intro.map((p, i) => (
              <p key={i} className="mt-5 text-base leading-relaxed text-suth-text-secondary md:text-lg">
                {p}
              </p>
            ))}

          <section className="mt-16 border-t border-suth-border-subtle pt-10 md:grid md:grid-cols-2 md:gap-10">
            <div>
              <Eyebrow>What to look for</Eyebrow>
              <ul role="list" className="mt-4 space-y-2 text-base leading-relaxed text-suth-text-secondary">
                {g.whatToLookFor.map((w) => (
                  <li key={w} className="flex gap-3">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-suth-accent" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-10 md:mt-0">
              <Eyebrow>What to avoid</Eyebrow>
              <ul role="list" className="mt-4 space-y-2 text-base leading-relaxed text-suth-text-secondary">
                {g.whatToAvoid.map((w) => (
                  <li key={w} className="flex gap-3">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-suth-danger/70" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section
            className="mt-16 border-t border-suth-border-subtle pt-10"
            aria-labelledby="gear-faq-heading"
          >
            <Eyebrow>FAQs</Eyebrow>
            <h2 id="gear-faq-heading" className="sr-only">
              {g.eyebrow}, frequently asked questions
            </h2>
            <div className="mt-6">
              <Accordion>
                {g.faqs.map((f, i) => (
                  <AccordionItem
                    key={i}
                    value={`q-${i}`}
                    className="border-b border-suth-border-subtle last:border-b-0"
                  >
                    <AccordionTrigger className="py-5 text-left text-base font-medium text-suth-text hover:no-underline md:text-lg">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-base leading-relaxed text-suth-text-secondary">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          </div>

          {/* THE ASIDE. The answer, then the thing that actually matters,
              then the rest of the guides — in that order because that is the
              order somebody stops caring: they came for a verdict, they may
              take a plan, and they might read another guide. */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-xl border border-suth-accent/40 bg-suth-elevated p-6">
              <Eyebrow>The short answer</Eyebrow>
              <p className="mt-3 text-base leading-relaxed text-suth-text">
                {g.summary}
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-suth-border bg-suth-elevated p-6">
              <Eyebrow>Gear doesn&apos;t train you</Eyebrow>
              <p className="mt-3 text-sm leading-relaxed text-suth-text-secondary">
                Right kit and the wrong plan is still slow. Right plan and any
                decent kit will do. Half an hour with Ben, free, and
                you&apos;ll know where you stand.
              </p>
              <Link
                href="/book"
                className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-pill bg-suth-accent px-5 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-suth-accent-hover"
              >
                Free assessment →
              </Link>
            </div>

            <div className="mt-6">
              <Eyebrow>More gear guides</Eyebrow>
              <ul role="list" className="mt-4 space-y-2">
                {GEAR_GUIDES.filter((x) => x.slug !== g.slug).map((x) => (
                  <li key={x.slug}>
                    <Link
                      href={`/hyrox/gear/${x.slug}`}
                      className="block rounded-md border border-suth-border-subtle bg-suth-elevated p-4 transition-colors hover:border-suth-border-strong"
                    >
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                        {x.eyebrow}
                      </p>
                      <p className="mt-1 text-sm font-medium leading-snug text-suth-text">
                        {x.title}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
          </div>

        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
