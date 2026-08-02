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
    />
  );
}
