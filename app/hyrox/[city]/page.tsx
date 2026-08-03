import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
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
import { RACE_CITY_SLUGS } from "@/lib/locations/seo";
import { HYROX_EVENTS } from "@/lib/hyrox-events";
import { upcoming as upcomingRaces, formatDates } from "@/lib/hyrox/races";
import { getGeoSeo } from "@/lib/locations/seo";

export const revalidate = 86400;
// Only the slugs we know are valid render; everything else 404s cleanly.
export const dynamicParams = false;

// The five slugs that keep a /hyrox/[city] page, and why, live in
// lib/locations/seo.ts so the training pages can check the same list.

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
  const isRaceCity = (RACE_CITY_SLUGS as readonly string[]).includes(loc.slug);
  // Race-information intent, not coaching intent. The title has to answer the
  // question the searcher typed or the click never happens. This is also the
  // intent split from docs/phase-d-groundwork-report.md finding 1: this URL is
  // the race-city guide, /hyrox-training/{slug} is the coaching conversion
  // page, and the two carried the same title for 94 locations.
  /* "venue, dates and how to prepare" put the longer city names past 65
     once the brand suffix was added (Manchester and Birmingham at 68).
     The shorter form keeps all three ideas. */
  const title = isRaceCity
    ? `Hyrox ${loc.name}: venue, dates, prep`
    : `Hyrox training in ${loc.name}, personalised 12-week plans`;
  const description = isRaceCity
    ? `Everything a ${loc.name} Hyrox race weekend involves: the venue, the expected dates, getting there, and the twelve weeks before it. Written by an Elite 15 coach.`
    : `Personalised Hyrox training programmes for ${loc.name} athletes. Built by an Elite 15 coach, with a dated Week 1 and a free consultation. Find your plan in three minutes.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Suth Performance",
      type: "website",
      locale: "en_GB",
    },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: isRaceCity, follow: true },
  };
}

function buildFaqs(loc: UkLocation) {
  const venue = loc.nearestVenue;
  return [
    {
      q: `Is there a Hyrox gym in ${loc.name}?`,
      // Do not assert what gyms exist here. Affiliate status cannot be
      // verified from any free source (see docs/phase-d-groundwork-report.md),
      // and this answer is templated across 94 locations and emitted as
      // FAQPage structured data. Hard rule 1.
      a: `Suth Performance isn't a gym and doesn't run classes in ${loc.name}. It's a personalised training platform you use alongside whatever you already train with, whether that's a Hyrox affiliate gym, a standard commercial gym, or a home setup. The quiz asks what equipment you can get to, and your plan only includes work you can actually do.`,
    },
    {
      q: `What's the nearest Hyrox race to ${loc.name}?`,
      a: venue
        ? `${venue.name} in ${venue.city} hosts annual Hyrox race weekends and is the closest major venue to ${loc.name}. Suth Performance programmes auto-calibrate to your chosen race date, you tell us when you're racing, we build the 12 weeks backwards from it.`: `${loc.name} athletes typically race at ExCeL London, Birmingham NEC, or Manchester Central. All three host Hyrox weekends annually. Suth Performance programmes auto-calibrate to your chosen race date.`,
    },
    {
      q: `How much does Hyrox coaching cost in ${loc.name}?`,
      // The old answer quoted a £60 to £150 local hourly range for all 94
      // locations. Nothing sources that, and it published a price we cannot
      // stand behind while declining to publish our own.
      a: `Face-to-face 1:1 coaching is normally charged by the hour and booked session by session, so the cost tracks how often you train. Suth Performance is online programming from an Elite 15 athlete, personalised and dated to your race. Pricing is tailored to you and starts with a free consultation with Ben.`,
    },
    {
      q: `Can I train for Hyrox in ${loc.name} as a beginner?`,
      a: `Yes. Suth Performance's First Race programme is built for total Hyrox beginners, three minutes of quiz, you see your Week 1 immediately. We calibrate to your current fitness, equipment, and the race date you're working towards. No CrossFit background needed.`,
    },
    {
      q: `Do I need a special gym to train for Hyrox in ${loc.name}?`,
      a: `No. Suth Performance programmes adapt to your equipment, full commercial gym, standard PureGym/Nuffield-style facility, or home setup. The quiz asks what you have access to, and your plan only includes exercises you can actually do. You can train for a Hyrox finish from any ${loc.name} gym.`,
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

  // 89 of these 94 towns have no "hyrox {town}" search volume, and this page
  // said much the same thing as /hyrox-training/{town} anyway. A 308 to the
  // coaching page serves the same intent and keeps the link equity, which a
  // 404 would throw away.
  if (!(RACE_CITY_SLUGS as readonly string[]).includes(loc.slug)) {
    permanentRedirect(`/hyrox-training/${loc.slug}`);
  }

  const faqs = buildFaqs(loc);
  // The event this city hosts, if any. Cardiff has real search demand and no
  // race, so its page answers the question honestly rather than pretending.
  const cityEvent = HYROX_EVENTS.find(
    (e) => e.venue.city.toLowerCase() === loc.slug,
  );
  /**
   * The DATE comes from the real calendar; everything else about the venue
   * still comes from HYROX_EVENTS.
   *
   * Only the dates in that file were invented — its header says so. The venue
   * name, address, divisions, logistics and prep-window copy are hand-written
   * facts about real places and are worth keeping. So this reads the confirmed
   * date from hyrox.com and falls back to no date at all rather than to the
   * cadence guess, because "we do not know yet" beats a made-up Saturday.
   */
  const confirmedRace = upcomingRaces().find(
    (r) => r.city.toLowerCase() === loc.slug && !r.isYoungstars,
  );
  const cityRaceDate = confirmedRace
    ? { date: formatDates(confirmedRace), rolledForward: false }
    : null;
  const nearestRace = getGeoSeo(loc.slug).nearestRace;
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
    name: `Suth Performance Hyrox Training, ${loc.name}`,
    description: `Personalised Hyrox training programmes for ${loc.name} athletes. Online platform delivered by an Elite 15 coach.`,
    url,
    areaServed: {
      "@type": "City",
      name: loc.name,
      containedInPlace: { "@type": "AdministrativeArea", name: loc.region },
    },
    provider: {
      "@type": "Organization",
      name: "Suth Performance",
      url: siteUrl(),
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
            className="mb-8 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary"
          >
            <Link href="/" className="hover:text-suth-text">
              Home
            </Link>
            <span aria-hidden className="mx-2">
              /
            </span>
            <Link href="/hyrox" className="hover:text-suth-text">
              Hyrox locations
            </Link>
            <span aria-hidden className="mx-2">
              /
            </span>
            <span className="text-suth-text">{loc.name}</span>
          </nav>

          <div className="mx-auto max-w-3xl">
            <Eyebrow>Hyrox · {loc.region}</Eyebrow>
            {/* Race intent, not coaching intent. Someone searching "hyrox
                london" wants the race: where, when, how to get there. The
                coaching offer still follows, but it does not lead. */}
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-[44px] lg:text-[52px]"
            >
              Hyrox {loc.name}
            </SplitHeading>
            <p className="mt-6 text-base leading-relaxed text-suth-text-secondary md:text-lg">
              {cityEvent
                ? `${cityEvent.venue.name} hosts the ${loc.name} race weekend. Here is the venue, the expected dates, how to get there, and what the twelve weeks before it should look like.`
                : `There is no ${loc.name} date on the current UK calendar. Here is the nearest race, how far it actually is, and how to build the twelve weeks before it.`}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <CtaButton href="/quiz" size="md">
                Find your plan →
              </CtaButton>
              {/* No-pricing policy: secondary action is the free
                  consultation, never a price page. */}
              <Link
                href="/free-consultation"
                className="inline-flex h-12 items-center gap-2 rounded-pill border border-suth-border bg-suth-elevated px-5 text-sm font-medium text-suth-text transition-colors hover:border-suth-border-strong"
              >
                Talk to Ben, free
              </Link>
            </div>
          </div>

          {/* ── The race itself ──
              This is what the search was for. Dates are the calendar cadence,
              not a confirmed schedule (see lib/hyrox-events.ts), so they are
              worded as expected rather than fixed. ── */}
          {cityEvent ? (
            <section className="mx-auto mt-16 max-w-3xl border-t border-suth-border-subtle pt-12">
              <Eyebrow>The race</Eyebrow>
              <h2 className="mt-4 text-2xl font-black leading-tight tracking-[-0.03em] text-suth-text md:text-3xl">
                {cityEvent.venue.name}
              </h2>
              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-suth-border-subtle bg-suth-elevated px-4 py-3">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                    Expected race weekend
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-suth-text">
                    {new Date(cityRaceDate!.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </dd>
                </div>
                <div className="rounded-lg border border-suth-border-subtle bg-suth-elevated px-4 py-3">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                    Where
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-suth-text">
                    {cityEvent.venue.addressLine}, {cityEvent.venue.postcode}
                  </dd>
                </div>
                <div className="rounded-lg border border-suth-border-subtle bg-suth-elevated px-4 py-3">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                    Divisions
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-suth-text">
                    {cityEvent.divisions.join(", ")}
                  </dd>
                </div>
                <div className="rounded-lg border border-suth-border-subtle bg-suth-elevated px-4 py-3">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                    Start your 12-week build
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-suth-text">
                    {cityRaceDate!.rolledForward
                      ? "Twelve weeks before the weekend above. The quiz dates every session to it."
                      : cityEvent.prepWindow}
                  </dd>
                </div>
              </dl>
              <p className="mt-6 text-base leading-relaxed text-suth-text-secondary md:text-lg">
                {cityEvent.about}
              </p>
              <h3 className="mt-8 text-lg font-black tracking-[-0.02em] text-suth-text">
                Getting there
              </h3>
              <ul className="mt-3 space-y-2 text-base leading-relaxed text-suth-text-secondary">
                {cityEvent.logistics.map((l) => (
                  <li key={l} className="flex gap-2">
                    <span aria-hidden className="text-suth-text-tertiary">
                      ·
                    </span>
                    {l}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-[13px] leading-relaxed text-suth-text-tertiary">
                Dates follow the recent UK calendar cadence and are not a
                confirmed schedule. Hyrox usually confirms six to nine months
                ahead, so check the official calendar before booking travel.
              </p>
              <Link
                href={`/hyrox/events/${cityEvent.slug}`}
                className="mt-5 inline-block text-sm font-medium text-suth-accent underline decoration-suth-accent/40 underline-offset-4 hover:decoration-suth-accent"
              >
                Full {loc.name} event guide →
              </Link>
            </section>
          ) : null}

          {/* Local context */}
          <section className="mx-auto mt-20 max-w-3xl border-t border-suth-border-subtle pt-12">
            <Eyebrow>The {loc.name} Hyrox scene</Eyebrow>
            <p className="mt-4 text-base leading-relaxed text-suth-text-secondary md:text-lg">
              {loc.context ??
                `${loc.name} has a growing community of Hyrox athletes training across its local gyms. Suth Performance programmes adapt to whatever equipment your gym has, full commercial setup, standard chain gym, or home weights, and recalibrate every Sunday based on the sessions you've logged.`}
            </p>
            {/* Computed from coordinates rather than read from the legacy
                nearestVenue field, which had Cardiff pointing at ExCeL when
                the NEC is roughly 60 km closer. */}
            {nearestRace && !cityEvent ? (
              <p className="mt-4 text-base leading-relaxed text-suth-text-secondary md:text-lg">
                The closest race venue to {loc.name} is{" "}
                <span className="text-suth-text">{nearestRace.venue}</span> in{" "}
                {nearestRace.city}, roughly {nearestRace.straightLineKm} km away
                in a straight line. Your Suth Performance programme builds
                backwards from whichever date you pick.
              </p>
            ) : null}
          </section>

          {/* Programmes for this city */}
          <section className="mx-auto mt-20 max-w-5xl border-t border-suth-border-subtle pt-12">
            <header className="mx-auto max-w-2xl text-center">
              <Eyebrow>Programmes for {loc.name} athletes</Eyebrow>
              <h2 className="mt-3 text-2xl font-black leading-tight tracking-[-0.04em] text-suth-text md:text-3xl">
                Pick the path that fits.
              </h2>
              <p className="mt-3 text-base leading-relaxed text-suth-text-secondary">
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
                    className="lift-on-hover shimmer block rounded-lg border border-suth-border bg-suth-elevated p-6"
                  >
                    <Eyebrow>{p.tag}</Eyebrow>
                    <p className="mt-3 text-base leading-relaxed text-suth-text-secondary">
                      {p.body}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-suth-accent">
                      Start the quiz →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* FAQ */}
          <section className="mx-auto mt-20 max-w-3xl border-t border-suth-border-subtle pt-12">
            <Eyebrow>FAQs · {loc.name}</Eyebrow>
            <h2 className="mt-3 text-2xl font-black leading-tight tracking-[-0.04em] text-suth-text md:text-3xl">
              Common {loc.name} Hyrox questions.
            </h2>
            <div className="mt-6">
              <Accordion>
                {faqs.map((f, i) => (
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

          {/* Final CTA */}
          <section className="mx-auto mt-20 max-w-3xl border-t border-suth-border-subtle pt-12 text-center">
            <Eyebrow>Start</Eyebrow>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-suth-text md:text-4xl">
              Find your {loc.name} plan.
            </h2>
            <p className="mt-4 text-base text-suth-text-secondary md:text-lg">
              Three-minute quiz. Dated Week 1 before you decide. Free consultation with Ben.
            </p>
            <div className="mt-8">
              <CtaButton href="/quiz" size="lg">
                Find your plan →
              </CtaButton>
            </div>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-suth-text-tertiary">
              Free consultation first. Cancel anytime.
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
          <section className="mx-auto mt-20 max-w-3xl border-t border-suth-border-subtle pt-12">
            <Eyebrow>More UK locations</Eyebrow>
            <p className="mt-3 text-sm text-suth-text-secondary">
              Suth Performance serves athletes across the UK, see the full list of
              cities and boroughs.
            </p>
            <div className="mt-5">
              <Link
                href="/hyrox"
                className="inline-flex h-11 items-center gap-2 rounded-pill border border-suth-border bg-suth-elevated px-5 text-sm font-medium text-suth-text transition-colors hover:border-suth-border-strong"
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
