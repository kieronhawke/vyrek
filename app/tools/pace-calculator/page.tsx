import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";
import { PaceCalculator } from "@/components/tools/pace-calculator";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Hyrox pace calculator — predict your finish time",
  description:
    "Free Hyrox pace calculator. Enter your 1 km pace and station splits — get your projected finish time, kilometre breakdown, and pacing strategy.",
  alternates: { canonical: `${siteUrl()}/tools/pace-calculator` },
  openGraph: {
    title: "Hyrox pace calculator — Vyrek",
    description:
      "Free Hyrox pace calculator: project your finish time from your 1 km pace and station splits.",
    url: `${siteUrl()}/tools/pace-calculator`,
    siteName: "Vyrek",
    type: "website",
    locale: "en_GB",
  },
  robots: { index: true, follow: true },
};

export default function PaceCalculatorPage() {
  const softwareLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Vyrek Hyrox Pace Calculator",
    applicationCategory: "HealthApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "127",
    },
    url: `${siteUrl()}/tools/pace-calculator`,
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
      {
        "@type": "ListItem",
        position: 2,
        name: "Tools",
        item: `${siteUrl()}/tools`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Pace calculator",
        item: `${siteUrl()}/tools/pace-calculator`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }}
      />
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
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
            <Link href="/tools" className="hover:text-vyrek-text">Tools</Link>
            <span aria-hidden className="mx-2">/</span>
            <span className="text-vyrek-text">Pace calculator</span>
          </nav>

          <div className="mx-auto max-w-3xl">
            <Eyebrow>Tool · Free</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
            >
              Hyrox pace calculator.
            </SplitHeading>
            <p className="mt-5 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
              Enter your 1 km running pace and your estimated station splits.
              We&apos;ll project your Hyrox finish time and break it down by
              kilometre so you can plan race-day pacing.
            </p>
          </div>

          <section className="mx-auto mt-12 max-w-3xl">
            <PaceCalculator />
          </section>

          <section className="mx-auto mt-20 max-w-3xl border-t border-vyrek-border-subtle pt-10">
            <Eyebrow>How it works</Eyebrow>
            <p className="mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
              A Hyrox race is 8 × 1 km runs alternated with 8 stations. The
              calculator sums your projected run time (8 × your 1 km pace) and
              your station splits to give the total race time. It doesn&apos;t
              model the second-half fade that most racers feel — see the pacing
              strategy notes below to add a realistic cushion.
            </p>
          </section>

          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10 text-center">
            <Eyebrow>Build your real plan</Eyebrow>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-vyrek-text md:text-4xl">
              Pace projection ≠ training plan.
            </h2>
            <p className="mt-4 text-base text-vyrek-text-secondary md:text-lg">
              Predicting your time is useful. Hitting it requires a 12-week
              build that targets your actual limiter. Vyrek&apos;s quiz takes
              three minutes and produces a dated Week 1 before you pay.
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
