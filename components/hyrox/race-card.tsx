import Link from "next/link";
import { daysUntil, flagFor, formatDates, type Race } from "@/lib/hyrox/races";
import { HEROES, pickPhoto } from "@/lib/photo-library";

/**
 * A race, as a card.
 *
 * Runna and RoxFit both put a photograph behind a race card with the date in
 * the accent, the name, and a flag beside the location
 * (docs/design/app-references.md §1.7). Reading a calendar of 113 races is a
 * scanning job, and a flag is read faster than a country name.
 *
 * The photograph is one of the Elite 15 frames rather than a city photo,
 * chosen deterministically from the slug so a race keeps its image between
 * builds. We hold no city photography and would not invent any: a stock shot
 * of a skyline says nothing, whereas a mono race frame is on-brand and true to
 * what the event is.
 */
export function RaceCard({ race }: { race: Race }) {
  const photo = pickPhoto(HEROES, race.slug);
  const flag = flagFor(race.country);
  const days = daysUntil(race);

  return (
    <Link
      href={`/hyrox/events/${race.slug}`}
      className="race-card"
      aria-label={`${race.name}, ${formatDates(race)}`}
    >
      <span className="race-card__img" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.wide ?? photo.src} alt="" loading="lazy" />
      </span>

      <span className="race-card__body">
        <span className="race-card__date">{formatDates(race)}</span>
        <strong className="race-card__name">{race.name}</strong>
        <span className="race-card__meta">
          {flag ? <span aria-hidden>{flag} </span> : null}
          {race.city}
          {race.country ? `, ${race.country}` : ""}
        </span>
        {days >= 0 && days <= 400 ? (
          <span className="race-card__away">
            {days === 0 ? "Racing today" : `in ${days} days`}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
