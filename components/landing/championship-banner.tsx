import Link from "next/link";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { CtaButton } from "@/components/shared/cta-button";

/**
 * The World Championship callout.
 *
 * Hong Kong hosts two races on the calendar: a regular event in January 2027
 * and the PUMA HYROX World Championships in June. The page surfaced only the
 * January one, because `nextRaceIn` sorts by date and takes the soonest — so
 * the single most notable fact about HYROX in Hong Kong appeared nowhere on
 * the page about HYROX in Hong Kong.
 *
 * It renders wherever a city hosts a championship, not as a Hong Kong special
 * case, so wherever the 2028 championship lands the page picks it up from the
 * calendar without anyone remembering to come back here.
 */
export function ChampionshipBanner({
  city,
  raceSlug,
  raceName,
  startDate,
  venue,
}: {
  city: string;
  raceSlug: string;
  raceName: string;
  startDate: string;
  venue?: string | null;
}) {
  const when = new Date(`${startDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <section
      aria-labelledby="championship-heading"
      className="border-y border-suth-accent/30 bg-suth-elevated py-14 md:py-20"
    >
      <Container>
        <div className="mx-auto max-w-3xl">
          <Eyebrow>World Championships</Eyebrow>
          <h2
            id="championship-heading"
            className="mt-3 text-2xl font-black tracking-[-0.03em] text-suth-text md:text-4xl"
          >
            The World Championships are in {city}.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-suth-text-secondary md:text-lg">
            {raceName} — {venue ? `${venue}, ` : ""}
            {when}. Qualifying is the hard part and it happens at the races you
            enter before it, which is the argument for building a season rather
            than a single twelve-week block: you need a qualifying time first,
            then a peak that lands months later without spending yourself
            getting there.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-suth-text-secondary">
            If that is the goal, say so on the consultation. A season aimed at a
            championship is planned differently from a first race, and the
            difference starts well before the twelve weeks do.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            <CtaButton href="/free-consultation" size="md">
              Plan a season around it
            </CtaButton>
            <Link
              href={`/hyrox/events/${raceSlug}`}
              className="text-sm font-medium text-suth-accent underline decoration-suth-accent/40 underline-offset-4 hover:decoration-suth-accent"
            >
              Dates, venue and when to start →
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
