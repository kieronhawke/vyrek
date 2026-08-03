import Image from "next/image";
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
        {/*
          MEASURED: this was a raw `<img>` pointing at the 1800x1013 source and
          rendered at 331x166. On `/hyrox/events`, which lists 111 races, that
          is 1.9 MB of photography where roughly 150 KB does the same job — by
          some distance the heaviest thing on the site.
          
          `sizes` is what actually fixes it. Without it Next assumes 100vw and
          serves a 1920-wide file to a 331px slot, so the optimiser runs and the
          page is no lighter. These are three-up on desktop, two-up on tablet.
          
          The parent span is already `position: absolute; inset: 0`, so `fill`
          needs no extra wrapper.
        */}
        <Image
          src={photo.wide ?? photo.src}
          alt=""
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="race-card__photo"
        />
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
