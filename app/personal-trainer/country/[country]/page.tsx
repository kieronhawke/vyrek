import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GeoRegionDirectory } from "@/components/landing/geo-region-directory";
import {
  countryRaceCount,
  getCountryBySlug,
  listCountrySlugs,
  raceCityAsLocation,
} from "@/lib/race-cities";
import { siteUrl } from "@/lib/blog/urls";

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
  const title = `Personal trainer in ${data.country}`;
  const description = `Online personal training across ${data.country}: ${data.cities.length} ${data.cities.length === 1 ? "city" : "cities"} on the HYROX calendar, ${races} ${races === 1 ? "race" : "races"} between them, each with the gyms actually near it. Coaching from HYROX Elite 15 athlete Ben Sutherland.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "Suth Performance", type: "website", locale: "en_GB" },
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
      locations={data.cities.map(raceCityAsLocation)}
      base="/personal-trainer"
      title={`Personal trainer in ${data.country}`}
      intro={`${data.cities.length} ${data.cities.length === 1 ? "city in" : "cities in"} ${data.country} ${data.cities.length === 1 ? "has" : "have"} hosted a HYROX, ${races} ${races === 1 ? "race" : "races"} between them. Every one has its own page with the gyms actually near the centre and the venue the race is held at. Coaching is online and in English, wherever you train.`}
    />
  );
}
