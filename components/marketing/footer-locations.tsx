import Link from "next/link";
import { Eyebrow } from "@/components/shared/eyebrow";
import {
  UK_LOCATIONS,
  groupLocationsByRegion,
  regionSlug,
} from "@/lib/uk-locations";
import { countriesByContinent, RACE_CITIES } from "@/lib/race-cities";

/**
 * The locations band in the footer.
 *
 * The geo programme is the largest thing on this site — 3,764 UK town pages,
 * 182 race-city pages, 224 directories — and until now not one link on the
 * site pointed at any of it. The hubs were not in the nav, not in the footer,
 * and not on the home page, so the entire set was reachable only by typing a
 * URL or reading sitemap.xml. Kieron could not find his own pages.
 *
 * This is the pattern every large local-services site uses, and it is in the
 * footer rather than the home page on purpose: the footer renders on all 6,404
 * pages, so it seeds the crawl from everywhere at once rather than from one
 * page that happens to be the most linked.
 *
 * Deliberately a sample, not a directory. Around fifty links here, and the
 * hubs and region pages carry the rest. A footer that listed all 1,882 towns
 * would put a 600 KB link farm on every page on the site — the same mistake
 * the geo hub already made once and fixed by introducing regions.
 */

/** How many of each to show. Tuned so the band stays two or three rows deep. */
const CITY_COUNT = 24;
const COUNTRY_COUNT = 10;

function topCities() {
  return UK_LOCATIONS
    // London's areas are places people search, but twenty of them in a row
    // reads as a London directory rather than a national one.
    .filter((l) => !l.isLondonBorough)
    .slice(0, CITY_COUNT);
}

function topCountries() {
  return countriesByContinent()
    .flatMap((g) => g.countries)
    .sort((a, b) => b.cities - a.cities || a.name.localeCompare(b.name))
    .slice(0, COUNTRY_COUNT);
}

function LinkRow({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2.5">
      {items.map((i) => (
        <li key={i.href}>
          <Link
            href={i.href}
            // py-1 lifts each link from 17px to 26px tall. WCAG 2.5.8 asks for a
            // 24px minimum target, and these are the densest links on the site —
            // on a phone the old size put four towns inside one thumb.
            className="inline-block py-1 text-sm text-suth-text-secondary transition-colors hover:text-suth-text"
          >
            {i.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function FooterLocations() {
  const cities = topCities();
  const regions = Object.keys(groupLocationsByRegion());
  const countries = topCountries();

  return (
    <section
      aria-labelledby="footer-locations-heading"
      className="mt-16 border-t border-suth-border-subtle pt-12"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2
          id="footer-locations-heading"
          className="text-lg font-black tracking-[-0.02em] text-suth-text"
        >
          Coaching where you are
        </h2>
        <p className="text-sm text-suth-text-tertiary">
          {UK_LOCATIONS.length.toLocaleString("en-GB")} towns and cities in the
          UK · {RACE_CITIES.length} more on the HYROX calendar worldwide
        </p>
      </div>

      <div className="mt-10 space-y-9">
        <div>
          <Eyebrow>Personal training by city</Eyebrow>
          <LinkRow
            items={cities.map((l) => ({
              href: `/personal-trainer/${l.slug}`,
              label: l.name,
            }))}
          />
        </div>

        <div>
          <Eyebrow>Hyrox training by region</Eyebrow>
          <LinkRow
            items={regions.map((r) => ({
              href: `/hyrox-training/in/${regionSlug(r)}`,
              label: r,
            }))}
          />
        </div>

        <div>
          <Eyebrow>Where Hyrox races</Eyebrow>
          <LinkRow
            items={countries.map((c) => ({
              href: `/hyrox-training/country/${c.slug}`,
              label: c.name,
            }))}
          />
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-suth-border-subtle pt-6">
          <Link
            href="/personal-trainer"
            className="text-sm font-medium text-suth-accent underline decoration-suth-accent/40 underline-offset-4 hover:decoration-suth-accent"
          >
            Every place we cover for personal training →
          </Link>
          <Link
            href="/hyrox-training"
            className="text-sm font-medium text-suth-accent underline decoration-suth-accent/40 underline-offset-4 hover:decoration-suth-accent"
          >
            Every place we cover for Hyrox training →
          </Link>
          <Link
            href="/hyrox/events"
            className="text-sm font-medium text-suth-accent underline decoration-suth-accent/40 underline-offset-4 hover:decoration-suth-accent"
          >
            The full race calendar →
          </Link>
        </div>
      </div>
    </section>
  );
}
