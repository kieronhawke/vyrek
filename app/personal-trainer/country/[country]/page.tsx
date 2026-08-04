import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GeoRegionDirectory } from "@/components/landing/geo-region-directory";
import {
  countryRaceCount,
  getCountryBySlug,
  listCountrySlugs,
  raceCityAsLocation,
} from "@/lib/race-cities";
import Link from "next/link";
import { siteUrl } from "@/lib/blog/urls";
import { US_STATES } from "@/lib/us-states";
import { intlCitiesInCountry, intlCityAsLocation } from "@/lib/intl-cities";
import { ogImages } from "@/lib/seo/og";

/**
 * A country directory for the international race cities.
 *
 * The same middle layer that regions and counties give the UK set. Without it
 * the 91 race cities hang off the hub alone: a crawler arriving at Cologne has
 * no route to Hamburg, and a reader in Germany has no way to see that four of
 * their cities are on the calendar.
 *
 * A country gets a list rather than a location page for the same reason a
 * county does — there is no centre of Japan worth writing about, and the
 * parkruns nearest the middle of it are nobody's parkruns.
 */
export const dynamicParams = false;
export const revalidate = 86400;

export async function generateStaticParams() {
  return listCountrySlugs().map((country) => ({ country }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string }>;
}): Promise<Metadata> {
  const { country } = await params;
  const data = getCountryBySlug(country);
  if (!data) return { title: "Not found" };
  const url = `${siteUrl()}/personal-trainer/country/${country}`;
  const races = countryRaceCount(country);
  // A directory lists places; a town page is about one. "across" keeps the
  // two off the same query — Leeds the city and Leeds the county both had
  // the title "Hyrox training in Leeds".
  /* layout.tsx appends 20 characters. "Cheshire West and Chester" and
     "East Riding of Yorkshire" push "across" past 65, so those fall back to
     a comma, which reads as a directory just as well and fits. */
  const across = `Personal trainer across ${data.country}`;
  const title = across.length + 20 <= 65 ? across : `Personal trainer, ${data.country}`;
  const description = `Online personal training across ${data.country}: ${data.cities.length} ${data.cities.length === 1 ? "city" : "cities"} on the HYROX calendar, ${races} ${races === 1 ? "race" : "races"} between them, each with the gyms actually near it. Coaching from HYROX Elite 15 athlete Ben Sutherland.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      // A child `openGraph` replaces the root layout's entirely rather
      // than merging, so without this the page inherits no social card.
      images: ogImages(), title, description, url, siteName: "Suth Performance", type: "website", locale: "en_GB" },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  };
}

export default async function PersonalTrainerCountryPage({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const { country } = await params;
  const data = getCountryBySlug(country);
  if (!data) notFound();
  const races = countryRaceCount(country);
  return (
    <GeoRegionDirectory
      region={data.country}
      /* Ireland, Australia, Canada, New Zealand and South Africa were
         expanded to town depth, so their directory lists the whole catalogue
         rather than only the cities that happen to host a race. */
      locations={[
        ...data.cities.map(raceCityAsLocation),
        ...intlCitiesInCountry(country).map(intlCityAsLocation),
      ]}
      base="/personal-trainer"
      title={`Personal trainer in ${data.country}`}
      intro={`${data.cities.length} ${data.cities.length === 1 ? "city in" : "cities in"} ${data.country} ${data.cities.length === 1 ? "has" : "have"} hosted a HYROX, ${races} ${races === 1 ? "race" : "races"} between them. Every one has its own page with the gyms actually near the centre and the venue the race is held at. Coaching is online and in English, wherever you train.`}
    >
      {country === "usa" ? (
        <section
          aria-label="US states"
          className="mx-auto mt-14 max-w-4xl border-t border-suth-border-subtle pt-10"
        >
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
            [ {US_STATES.length} states ]
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-suth-text-secondary">
            Every state has its own page: the races held there, the gyms in its
            largest metros, and — where there is no race yet — the nearest one
            and how far it actually is.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2.5">
            {US_STATES.map((st) => (
              <li key={st.slug}>
                <Link
                  href={`/personal-trainer/state/${st.slug}`}
                  className="inline-flex h-10 items-center gap-2 rounded-pill border border-suth-border bg-suth-elevated px-4 text-sm font-medium text-suth-text transition-colors hover:border-suth-border-strong"
                >
                  {st.name}
                  {st.races.length ? (
                    <span className="font-mono text-[10px] text-suth-accent">
                      {st.races.length}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </GeoRegionDirectory>
  );
}
