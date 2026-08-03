import type { Metadata } from "next";
import Link from "next/link";
import { coachingSlugForRace } from "@/lib/geo-page";
import { notFound } from "next/navigation";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";
import { RaceCard } from "@/components/hyrox/race-card";
import {
  RACES,
  buildStarts,
  daysUntil,
  findRace,
  flagFor,
  formatDates,
  racesInCountry,
} from "@/lib/hyrox/races";
import type { Race } from "@/lib/hyrox/races";
import { siteUrl } from "@/lib/blog/urls";

/**
 * One HYROX race.
 *
 * THE DATES ARE NOW REAL. This page emitted SportsEvent JSON-LD built from
 * lib/hyrox-events.ts, whose own header called its dates "placeholder
 * approximations based on the 2024-26 calendar cadence". Inaccurate Event
 * markup breaches Google's structured-data policy, and an athlete could plan a
 * season around a date we invented. It was the reason the whole site is still
 * noindex. Everything below is read from HYROX's own event page.
 *
 * The one thing said here that HYROX's page does not say: when a twelve-week
 * build has to start to land on this race. That is the reason for this page to
 * exist at all rather than linking straight to theirs.
 */
export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
  return RACES.map((r) => ({ slug: r.slug }));
}

/** Drop any sponsor prefix so the title leads with "HYROX <place>". */
function titleName(name: string): string {
  const i = name.toUpperCase().indexOf("HYROX");
  return i > 0 ? name.slice(i) : name;
}

/** "Apr 2027". The full range is still shown on the page itself. */
function monthAndYear(race: Race): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${race.startDate}T00:00:00Z`));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const race = findRace(slug);
  if (!race) return {};

  const where = [race.city, race.country].filter(Boolean).join(", ");
  return {
    /* Race names carry a sponsor prefix ("all inclusive Fitness HYROX
       Cologne", "MAYBELLINE HYROX PARIS GRAND-PALAIS"), which buried the
       part people actually search for and pushed roughly forty of these
       pages past 65 characters once the brand suffix was added. Lead with
       "HYROX <place>" and give the month rather than the full range; the
       exact dates stay in the description, the H1 and the page body, and
       the full official name stays in the description. */
    title: `${titleName(race.name)}: ${monthAndYear(race)}`,
    description:
      `${race.name} takes place ${formatDates(race)} at ${race.venueName ?? where}. ` +
      `Dates, venue, and when a twelve-week HYROX build needs to start to land on race day.`,
    alternates: { canonical: `${siteUrl()}/hyrox/events/${race.slug}` },
    robots: { index: true, follow: true },
  };
}

export default async function RacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const race = findRace(slug);
  if (!race) notFound();

  const flag = flagFor(race.country);
  const days = daysUntil(race);
  const build = buildStarts(race);
  const coachingSlug = coachingSlugForRace(race);
  const nearby = race.country
    ? racesInCountry(race.country)
        .filter((r) => r.slug !== race.slug)
        .slice(0, 4)
    : [];

  const eventLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: race.name,
    ...(race.description ? { description: race.description } : {}),
    // Read from hyrox.com. Never derived, never approximated.
    startDate: race.startDate,
    endDate: race.endDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: race.venueName ?? race.city,
      address: {
        "@type": "PostalAddress",
        ...(race.venue ? { streetAddress: race.venue } : {}),
        addressLocality: race.city,
        ...(race.country ? { addressCountry: race.country } : {}),
      },
    },
    url: `${siteUrl()}/hyrox/events/${race.slug}`,
    sameAs: race.sourceUrl,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventLd) }}
      />
      <MarketingNav />

      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <div className="mx-auto max-w-3xl">
            <Eyebrow>
              {race.isWorldChampionship
                ? "World Championships"
                : race.isYoungstars
                  ? "HYROX Youngstars"
                  : "HYROX race"}
            </Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-[46px]"
            >
              {race.name}
            </SplitHeading>

            {/* Metadata rows — the Runna pattern, app-references.md §1.8. */}
            <dl className="mt-6 grid gap-2 text-base">
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-suth-text-tertiary">Dates</dt>
                <dd className="text-suth-text">{formatDates(race)}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-suth-text-tertiary">Where</dt>
                <dd className="text-suth-text">
                  {flag ? <span aria-hidden>{flag} </span> : null}
                  {race.city}
                  {race.country ? `, ${race.country}` : ""}
                </dd>
              </div>
              {race.venue ? (
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 text-suth-text-tertiary">Venue</dt>
                  <dd className="text-suth-text">{race.venue}</dd>
                </div>
              ) : null}
              {days >= 0 ? (
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 text-suth-text-tertiary">Away</dt>
                  <dd className="text-suth-text">
                    {days === 0 ? "Racing today" : `${days} days`}
                  </dd>
                </div>
              ) : null}
            </dl>

            {race.description ? (
              <p className="mt-8 text-base leading-relaxed text-suth-text-secondary md:text-lg">
                {race.description}
              </p>
            ) : null}

            {build && days > 0 ? (
              <div className="mt-10 rounded-lg border border-suth-border bg-suth-elevated p-6">
                <Eyebrow>When to start</Eyebrow>
                <p className="mt-3 text-lg font-semibold text-suth-text">
                  {build.weeksAway > 0
                    ? `A twelve-week build for this race starts in ${build.weeksAway} ${build.weeksAway === 1 ? "week" : "weeks"}.`
                    : build.weeksAway === 0
                      ? "A twelve-week build for this race starts this week."
                      : `A twelve-week build for this race would have started ${Math.abs(build.weeksAway)} ${Math.abs(build.weeksAway) === 1 ? "week" : "weeks"} ago.`}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-suth-text-secondary">
                  {build.weeksAway < 0
                    ? `There are ${days} days left, so the block gets compressed rather than skipped. The first thing that changes is how much base work is in it.`
                    : "Twelve weeks is the standard block: base, build, peak, then a taper into race week. Start earlier and the base phase gets longer, not the intensity."}
                </p>
                <div className="mt-5">
                  <CtaButton href="/quiz" size="md">
                    Build a plan for this race →
                  </CtaButton>
                </div>
              </div>
            ) : null}

            {/* The city's own coaching page: the gyms actually near this venue
                and what training here involves. Deliberately outside the block
                above, which only renders for a race still ahead of us, a race
                that has been run keeps its page forever, and it would otherwise
                have no route into the rest of the site at all. */}
            {coachingSlug ? (
              <p className="mt-8 text-base text-suth-text-secondary">
                <Link
                  href={`/hyrox-training/${coachingSlug}`}
                  className="font-medium text-suth-accent underline decoration-suth-accent/40 underline-offset-4 hover:decoration-suth-accent"
                >
                  Training for Hyrox in {race.city} →
                </Link>{" "}
                the gyms near the venue, and what the eight stations ask of you.
              </p>
            ) : null}

            <p className="mt-8 text-sm text-suth-text-secondary">
              Dates and venue read from{" "}
              <Link
                href={race.sourceUrl}
                rel="nofollow"
                className="text-suth-accent underline underline-offset-2"
              >
                HYROX&apos;s official event page
              </Link>
              . Entries, divisions and start times are theirs, so check before
              booking travel.
            </p>
          </div>

          {nearby.length > 0 ? (
            <section className="mx-auto mt-16 max-w-5xl">
              <h2 className="mb-3 text-xl font-black tracking-[-0.03em] text-suth-text">
                Other races in {race.country}
              </h2>
              <ul role="list" className="race-grid">
                {nearby.map((r) => (
                  <li key={r.slug}>
                    <RaceCard race={r} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="mx-auto mt-12 max-w-3xl">
            <Link href="/hyrox/events" className="text-suth-accent">
              ← All {RACES.length} HYROX races
            </Link>
          </p>
        </Container>
      </main>

      <MarketingFooter />
    </>
  );
}
