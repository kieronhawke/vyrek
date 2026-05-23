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
  getLocationBySlug,
  listLocationSlugs,
  type UkLocation,
} from "@/lib/uk-locations";
import { RelatedGrid } from "@/components/shared/related-grid";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;
// Only the slugs we know are valid render; everything else 404s cleanly.
export const dynamicParams = false;

export async function generateStaticParams() {
  return listLocationSlugs().map((city) => ({ city }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const loc = getLocationBySlug(city);
  if (!loc) return { title: "Not found" };
  const url = `${siteUrl()}/hyrox/${loc.slug}`;
  const title = `Hyrox training in ${loc.name}, personalised 12-week plans`;
  const description = `Personalised Hyrox training programmes for ${loc.name} athletes. Built by Elite 15 coaches, dated Week 1 before you pay, £8.99/month. Find your plan in three minutes.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Vyrek",
      type: "website",
      locale: "en_GB",
    },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  };
}

function buildFaqs(loc: UkLocation) {
  const venue = loc.nearestVenue;
  return [
    {
      q: `Is there a Hyrox gym in ${loc.name}?`,
      a: `Yes, ${loc.name} has a growing network of affiliate gyms running Hyrox-pattern classes. Vyrek isn't a gym; we're a personalised training platform you can use alongside any gym. Members in ${loc.name} train at their usual gym (or at home) and follow a programme built around the exact equipment they have available.`,
    },
    {
      q: `What's the nearest Hyrox race to ${loc.name}?`,
      a: venue
        ? `${venue.name} in ${venue.city} hosts annual Hyrox race weekends and is the closest major venue to ${loc.name}. Vyrek programmes auto-calibrate to your chosen race date, you tell us when you're racing, we build the 12 weeks backwards from it.`: `${loc.name} athletes typically race at ExCeL London, Birmingham NEC, or Manchester Central. All three host Hyrox weekends annually. Vyrek programmes auto-calibrate to your chosen race date.`,
    },
    {
      q: `How much does Hyrox coaching cost in ${loc.name}?`,
      a: `Local 1:1 Hyrox coaching in ${loc.name} typically ranges from £60–£150 per hour. Vyrek's online programme is £8.99 per month with a 7-day free trial, the same level of programming as you'd get from an Elite 15 coach, dated and personalised, at a fraction of the cost.`,
    },
    {
      q: `Can I train for Hyrox in ${loc.name} as a beginner?`,
      a: `Yes. Vyrek's First Race programme is built for total Hyrox beginners, three minutes of quiz, you see your Week 1 immediately. We calibrate to your current fitness, equipment, and the race date you're working towards. No CrossFit background needed.`,
    },
    {
      q: `Do I need a special gym to train for Hyrox in ${loc.name}?`,
      a: `No. Vyrek programmes adapt to your equipment, full commercial gym, standard PureGym/Nuffield-style facility, or home setup. The quiz asks what you have access to, and your plan only includes exercises you can actually do. You can train for a Hyrox finish from any ${loc.name} gym.`,
    },
  ];
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const loc = getLocationBySlug(city);
  if (!loc) notFound();

  const faqs = buildFaqs(loc);
  const url = `${siteUrl()}/hyrox/${loc.slug}`;
  const breadcrumbItems = [
    { name: "Home", url: siteUrl() },
    { name: "Hyrox locations", url: `${siteUrl()}/hyrox` },
    { name: loc.name, url },
  ];

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const localBusinessLd = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: `Vyrek Hyrox Training, ${loc.name}`,
    description: `Personalised Hyrox training programmes for ${loc.name} athletes. Online platform delivered by Elite 15 coaches.`,
    url,
    areaServed: {
      "@type": "City",
      name: loc.name,
      containedInPlace: { "@type": "AdministrativeArea", name: loc.region },
    },
    provider: {
      "@type": "Organization",
      name: "Vyrek",
      url: siteUrl(),
    },
    offers: {
      "@type": "Offer",
      price: "8.99",
      priceCurrency: "GBP",
      availability: "https://schema.org/InStock",
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
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessLd) }}
      />

      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="mb-8 font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-tertiary"
          >
            <Link href="/" className="hover:text-vyrek-text">
              Home
            </Link>
            <span aria-hidden className="mx-2">
              /
            </span>
            <Link href="/hyrox" className="hover:text-vyrek-text">
              Hyrox locations
            </Link>
            <span aria-hidden className="mx-2">
              /
            </span>
            <span className="text-vyrek-text">{loc.name}</span>
          </nav>

          <div className="mx-auto max-w-3xl">
            <Eyebrow>Hyrox · {loc.region}</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl lg:text-6xl"
            >
              Hyrox training in {loc.name}
            </SplitHeading>
            <p className="mt-6 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
              Personalised 12-week Hyrox programmes for athletes in {loc.name}.
              See your Week 1 dated and ready in three minutes, before you
              pay a penny.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <CtaButton href="/quiz" size="md">
                Find your plan →
              </CtaButton>
              <Link
                href="/pricing"
                className="inline-flex h-12 items-center gap-2 rounded-pill border border-vyrek-border bg-vyrek-elevated px-5 text-sm font-medium text-vyrek-text transition-colors hover:border-vyrek-border-strong"
              >
                See pricing
              </Link>
            </div>
          </div>

          {/* Local context */}
          <section className="mx-auto mt-20 max-w-3xl border-t border-vyrek-border-subtle pt-12">
            <Eyebrow>The {loc.name} Hyrox scene</Eyebrow>
            <p className="mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
              {loc.context ??
                `${loc.name} has a growing community of Hyrox athletes training across its local gyms. Vyrek programmes adapt to whatever equipment your gym has, full commercial setup, standard chain gym, or home weights, and recalibrate every Sunday based on the sessions you've logged.`}
            </p>
            {loc.nearestVenue ? (
              <p className="mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                The closest major race venue to {loc.name} is{" "}
                <span className="text-vyrek-text">
                  {loc.nearestVenue.name}
                </span>{" "}
                in {loc.nearestVenue.city}. Your Vyrek programme builds backwards
                from your chosen race date, pick the day, we&apos;ll dial in the 12
                weeks before it.
              </p>
            ): null}
          </section>

          {/* Programmes for this city */}
          <section className="mx-auto mt-20 max-w-5xl border-t border-vyrek-border-subtle pt-12">
            <header className="mx-auto max-w-2xl text-center">
              <Eyebrow>Programmes for {loc.name} athletes</Eyebrow>
              <h2 className="mt-3 text-2xl font-black leading-tight tracking-[-0.04em] text-vyrek-text md:text-3xl">
                Pick the path that fits.
              </h2>
              <p className="mt-3 text-base leading-relaxed text-vyrek-text-secondary">
                One subscription, all four programmes. Switch between them as
                your race calendar changes.
              </p>
            </header>
            <ul
              role="list"
              className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2"
            >
              {[
                {
                  slug: "first-race",
                  tag: "First Race",
                  body: `For ${loc.name} athletes prepping for their first Hyrox. 12 weeks, dated, designed for someone who's never raced.`,
                },
                {
                  slug: "sub-90",
                  tag: "Sub-90",
                  body: `Plateau-breaker for athletes stuck above 90 minutes. Diagnostic, then targeted intervention. ${loc.name} racers welcome.`,
                },
                {
                  slug: "doubles",
                  tag: "Doubles",
                  body: `Paired programming for ${loc.name} doubles teams, handoff strategy, split decisions, paired interval work.`,
                },
                {
                  slug: "pro",
                  tag: "Pro",
                  body: `Elite 15 qualification pathway. Pro-division standards, race-simulation depth.`,
                },
              ].map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/quiz?program=${p.slug}`}
                    className="lift-on-hover shimmer block rounded-lg border border-vyrek-border bg-vyrek-elevated p-6"
                  >
                    <Eyebrow>{p.tag}</Eyebrow>
                    <p className="mt-3 text-base leading-relaxed text-vyrek-text-secondary">
                      {p.body}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-vyrek-accent">
                      Start the quiz →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* FAQ */}
          <section className="mx-auto mt-20 max-w-3xl border-t border-vyrek-border-subtle pt-12">
            <Eyebrow>FAQs · {loc.name}</Eyebrow>
            <h2 className="mt-3 text-2xl font-black leading-tight tracking-[-0.04em] text-vyrek-text md:text-3xl">
              Common {loc.name} Hyrox questions.
            </h2>
            <div className="mt-6">
              <Accordion>
                {faqs.map((f, i) => (
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

          {/* Final CTA */}
          <section className="mx-auto mt-20 max-w-3xl border-t border-vyrek-border-subtle pt-12 text-center">
            <Eyebrow>Start</Eyebrow>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-vyrek-text md:text-4xl">
              Find your {loc.name} plan.
            </h2>
            <p className="mt-4 text-base text-vyrek-text-secondary md:text-lg">
              Three-minute quiz. Dated Week 1 before you pay. £8.99/month.
            </p>
            <div className="mt-8">
              <CtaButton href="/quiz" size="lg">
                Find your plan →
              </CtaButton>
            </div>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-vyrek-text-tertiary">
              First week free. Cancel anytime.
            </p>
          </section>

          {/* Cross-link to stations / plans / tools, internal-link density */}
          <RelatedGrid
            heading={`Useful for ${loc.name} athletes`}
            items={[
              {
                href: "/hyrox/stations/sled-push",
                eyebrow: "Station guide",
                title: "Hyrox sled push technique",
                body: "Low, long, locked, the technique that wins back 60 seconds.",
              },
              {
                href: "/hyrox/stations/wall-balls",
                eyebrow: "Station guide",
                title: "Hyrox wall balls strategy",
                body: "Plan your set scheme before the gun goes.",
              },
              {
                href: "/plans/sub-90-hyrox-training-plan",
                eyebrow: "Plan",
                title: "Sub-90 Hyrox training plan",
                body: "Break 90 with the diagnostic-led 12-week build.",
              },
              {
                href: "/tools/pace-calculator",
                eyebrow: "Tool · Free",
                title: "Hyrox pace calculator",
                body: "Project your finish time from your 1 km pace.",
              },
              {
                href: "/hyrox/events",
                eyebrow: "Events",
                title: "UK Hyrox race calendar",
                body: "London, Manchester, Birmingham, Glasgow, when to start training.",
              },
              {
                href: "/hyrox/gear/best-hyrox-shoes",
                eyebrow: "Gear",
                title: "Best Hyrox shoes",
                body: "Hybrid trainers, low drop, firm midsole, what to look for.",
              },
            ]}
          />

          {/* Related: other cities */}
          <section className="mx-auto mt-20 max-w-3xl border-t border-vyrek-border-subtle pt-12">
            <Eyebrow>More UK locations</Eyebrow>
            <p className="mt-3 text-sm text-vyrek-text-secondary">
              Vyrek serves athletes across the UK, see the full list of
              cities and boroughs.
            </p>
            <div className="mt-5">
              <Link
                href="/hyrox"
                className="inline-flex h-11 items-center gap-2 rounded-pill border border-vyrek-border bg-vyrek-elevated px-5 text-sm font-medium text-vyrek-text transition-colors hover:border-vyrek-border-strong"
              >
                All Hyrox locations →
              </Link>
            </div>
          </section>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
