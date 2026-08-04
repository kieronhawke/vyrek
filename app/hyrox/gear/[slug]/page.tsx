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

          <div className="mx-auto max-w-3xl">
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
          </div>

          <section className="mx-auto mt-16 max-w-3xl border-t border-suth-border-subtle pt-10 md:grid md:grid-cols-2 md:gap-10">
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
            className="mx-auto mt-16 max-w-3xl border-t border-suth-border-subtle pt-10"
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

          <section className="mx-auto mt-16 max-w-3xl border-t border-suth-border-subtle pt-10 text-center">
            <Eyebrow>Gear doesn&apos;t train you</Eyebrow>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-suth-text md:text-4xl">
              The plan does.
            </h2>
            <p className="mt-4 text-base text-suth-text-secondary md:text-lg">
              Right kit, wrong plan: still slow. Right plan: any decent kit
              will do. Take the quiz, see your Week 1 free.
            </p>
            <div className="mt-8">
              <CtaButton href="/quiz" size="lg">
                Find your plan →
              </CtaButton>
            </div>
          </section>

          <section className="mx-auto mt-16 max-w-3xl border-t border-suth-border-subtle pt-10">
            <Eyebrow>More gear guides</Eyebrow>
            <ul role="list" className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {GEAR_GUIDES.filter((x) => x.slug !== g.slug).map((x) => (
                <li key={x.slug}>
                  <Link
                    href={`/hyrox/gear/${x.slug}`}
                    className="block rounded-md border border-suth-border-subtle bg-suth-elevated p-4 transition-colors hover:border-suth-border-strong"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                      {x.eyebrow}
                    </p>
                    <p className="mt-1 text-sm font-medium text-suth-text">
                      {x.title}
                    </p>
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
