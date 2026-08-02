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

/**
 * A country directory for the international race cities. The Hyrox-training
 * half of the pair; see the personal-trainer sibling for why a country gets a
 * list rather than a location page.
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
  const url = `${siteUrl()}/hyrox-training/country/${country}`;
  const races = countryRaceCount(country);
  const title = `Hyrox training in ${data.country}`;
  const description = `Hyrox training across ${data.country}: ${data.cities.length} ${data.cities.length === 1 ? "host city" : "host cities"} and ${races} ${races === 1 ? "race" : "races"} on the calendar. A 12-week programme dated backwards from race day, from HYROX Elite 15 athlete Ben Sutherland.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "Suth Performance", type: "website", locale: "en_GB" },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  };
}

export default async function HyroxTrainingCountryPage({
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
      locations={data.cities.map(raceCityAsLocation)}
      base="/hyrox-training"
      title={`Hyrox training in ${data.country}`}
      intro={`${races} ${races === 1 ? "race" : "races"} across ${data.cities.length} ${data.cities.length === 1 ? "city" : "cities"} in ${data.country}. Each city has its own page with the venue, the date, and the gyms near the centre you could train the eight stations at. The programme is dated backwards from whichever race you enter.`}
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
                  href={`/hyrox-training/state/${st.slug}`}
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
