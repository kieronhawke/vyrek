import Link from "next/link";
import { Container } from "@/components/shared/container";
import type { GeoSeo } from "@/lib/locations/seo";

/**
 * The one section on a geo page that is genuinely about the place.
 *
 * Everything else on /hyrox-training/[location] and /personal-trainer/[location]
 * is the same offer described the same way, which is why any two of those pages
 * shared 64% of their eight-word sequences before this existed. A location page
 * earns its URL by saying something true that no other location page can say.
 *
 * Two facts qualify today, and both are sourced rather than asserted:
 *
 *   Terrain  parkrun venues within reach, from parkrun's own events feed,
 *            with straight-line distances from the town centroid.
 *   Race     the nearest UK race weekend, distance computed from published
 *            venue coordinates.
 *
 * The gym layer and the results layer would add two more, and both are blocked
 * (growth-plan open questions 1 and 1b). Nothing here is padded to compensate:
 * if a location has no terrain data the section renders the race half alone,
 * and if it has neither the section does not render at all. An empty section
 * is more honest than an invented one.
 */

/**
 * What a given distance actually means for race morning. Kept deliberately
 * vague at the edges: these are straight-line kilometres, so anything more
 * precise than "you will probably stay over" would be inventing detail the
 * data does not support.
 */
function travelShape(km: number, name: string): string {
  if (km <= 25)
    return `Close enough to ${name} to get there on race morning without staying over, and close enough to walk the venue beforehand if you want to.`;
  if (km <= 90)
    return `Roughly ${km} km from ${name} in a straight line, which for most people is an early train rather than a hotel.`;
  if (km <= 200)
    return `Roughly ${km} km from ${name} in a straight line. Far enough that an early wave usually means travelling the night before.`;
  return `Roughly ${km} km from ${name} in a straight line, so treat it as a weekend away rather than a day out, and book the room when you book the race.`;
}

export function GeoLocalContext({
  seo,
  name,
  variant,
  context,
  guideLink,
}: {
  seo: GeoSeo;
  name: string;
  variant: "hyrox" | "pt";
  /** Hand-written local paragraph. Rendered only when one exists: the
   *  generic fallback it replaced was on 45 of 62 pages word for word. */
  context?: string;
  guideLink?: { href: string; label: string } | null;
}) {
  const parkruns = seo.parkruns.slice(0, 4);
  const race = seo.nearestRace;
  if (!parkruns.length && !race && !context) return null;

  const runLabel =
    variant === "hyrox"
      ? "Where to run your 1 km repeats"
      : "Where to run, near you";

  return (
    <section
      aria-labelledby="geo-local-heading"
      className="border-t border-suth-border-subtle py-16 md:py-24"
    >
      <Container>
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
            [ Training in {name} ]
          </p>
          <h2
            id="geo-local-heading"
            className="mt-4 text-[28px] font-black leading-[1.1] tracking-[-0.03em] text-suth-text md:text-[36px]"
          >
            {race && seo.hostsRace
              ? `${name} hosts a race, which changes how you train for it.`
              : `The ground you actually train on in ${name}.`}
          </h2>
          {context ? (
            <p className="mt-4 text-base leading-relaxed text-suth-text-secondary">
              {context}
            </p>
          ) : null}
          {guideLink ? (
            <Link
              href={guideLink.href}
              className="mt-5 inline-block text-sm font-medium text-suth-accent underline decoration-suth-accent/40 underline-offset-4 hover:decoration-suth-accent"
            >
              {guideLink.label} →
            </Link>
          ) : null}
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-4 md:mt-14 md:grid-cols-2 md:gap-5">
          {parkruns.length ? (
            <div className="rounded-lg border border-suth-border-subtle bg-suth-elevated p-7">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-suth-text-tertiary">
                {runLabel}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-suth-text-secondary">
                {variant === "hyrox"
                  ? "A Hyrox is eight 1 km runs with a station between each. Running them on flat, measured, repeatable ground is worth more than any single session you will do indoors. These are the closest measured 5 km courses to you."
                  : "Free, measured, timed, every Saturday morning. The simplest way to see whether the programme is working is to run the same 5 km every few weeks and watch the number move."}
              </p>
              <ul className="mt-5 space-y-3">
                {parkruns.map((p) => (
                  <li key={p.name} className="flex items-baseline justify-between gap-4">
                    <span className="text-sm text-suth-text">
                      {p.name}
                      {p.area && p.area !== p.name.replace(" parkrun", "") ? (
                        <span className="text-suth-text-tertiary"> · {p.area}</span>
                      ) : null}
                    </span>
                    {typeof p.distanceKm === "number" ? (
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-suth-text-tertiary">
                        {p.distanceKm} km
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[11px] leading-relaxed text-suth-text-tertiary">
                Distances are straight-line from the centre of {name}, not
                journey times. Source: parkrun&rsquo;s own events feed.
              </p>
            </div>
          ) : null}

          {race ? (
            <div className="rounded-lg border border-suth-border-subtle bg-suth-elevated p-7">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-suth-text-tertiary">
                Your nearest race
              </p>
              <p className="mt-4 text-2xl font-black leading-tight tracking-[-0.025em] text-suth-text">
                {race.venue}
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                {race.city} · {race.rolledForward ? "expected " : ""}
                {new Date(race.startDate).toLocaleDateString("en-GB", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p className="mt-5 text-sm leading-relaxed text-suth-text-secondary">
                {seo.hostsRace
                  ? `The race comes to ${name}. That means you can walk the venue beforehand, and it means the people you train beside will be on the same start list. A programme dated to that weekend is worth more than a generic twelve weeks.`
                  : `${travelShape(race.straightLineKm, name)} Whichever race you enter, the programme is built backwards from that date.`}
              </p>
              <p className="mt-5 text-[11px] leading-relaxed text-suth-text-tertiary">
                {/* Sources the distance figure above — so it only belongs here
                    when there is one. A city that hosts its own race renders no
                    distance, and the note was left dangling under it, citing a
                    number that was not on the page. */}
                {seo.hostsRace
                  ? ""
                  : `Straight-line distance from the centre of ${name} to the venue. `}
                {race.rolledForward
                  ? "The date follows the venue's annual cadence rather than a confirmed listing, so check the official Hyrox calendar before booking."
                  : "Check the official Hyrox calendar for final dates."}
              </p>
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
