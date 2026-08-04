import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GeoRegionDirectory } from "@/components/landing/geo-region-directory";
import { getCountyBySlug, listCountySlugs } from "@/lib/uk-locations";
import { siteUrl } from "@/lib/blog/urls";
import { ogImages } from "@/lib/seo/og";

/**
 * A county directory.
 *
 * "personal trainer kent" and "personal trainer essex" carry real search
 * volume, but a county has no centre worth writing about: the parkruns nearest
 * the middle of Kent are nobody's parkruns. So the county gets a list of its
 * towns, which is the honest answer to that query, and each town keeps the
 * page with the local detail on it.
 */
export const dynamicParams = false;
export const revalidate = 86400;

export async function generateStaticParams() {
  return listCountySlugs().map((county) => ({ county }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ county: string }>;
}): Promise<Metadata> {
  const { county } = await params;
  const data = getCountyBySlug(county);
  if (!data) return { title: "Not found" };
  const url = `${siteUrl()}/personal-trainer/county/${county}`;
  // A directory lists places; a town page is about one. "across" keeps the
  // two off the same query — Leeds the city and Leeds the county both had
  // the title "Hyrox training in Leeds".
  /* layout.tsx appends 20 characters. "Cheshire West and Chester" and
     "East Riding of Yorkshire" push "across" past 65, so those fall back to
     a comma, which reads as a directory just as well and fits. */
  const across = `Personal trainer across ${data.county}`;
  const title = across.length + 20 <= 65 ? across : `Personal trainer, ${data.county}`;
  const description = `Personal training across ${data.county}: ${data.locations.length} towns and cities, each with its local gyms, nearest measured 5 km and closest race. Online coaching from HYROX Elite 15 athlete Ben Sutherland.`;
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

export default async function CountyPage({
  params,
}: {
  params: Promise<{ county: string }>;
}) {
  const { county } = await params;
  const data = getCountyBySlug(county);
  if (!data) notFound();
  return (
    <GeoRegionDirectory
      region={data.county}
      locations={data.locations}
      base="/personal-trainer"
      title={`Personal trainer in ${data.county}`}
      intro={`${data.locations.length} towns and cities across ${data.county}. Every one has its own page with the gyms actually near it, the closest measured 5 km, and how far the nearest race really is. Pick yours.`}
    />
  );
}
