import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GeoRegionDirectory } from "@/components/landing/geo-region-directory";
import { getRegionBySlug, listRegionSlugs, regionWithArticle } from "@/lib/uk-locations";
import { siteUrl } from "@/lib/blog/urls";
import { ogImages } from "@/lib/seo/og";

export const dynamicParams = false;
export const revalidate = 86400;

export async function generateStaticParams() {
  return listRegionSlugs().map((region) => ({ region }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const { region } = await params;
  const data = getRegionBySlug(region);
  if (!data) return { title: "Not found" };
  const url = `${siteUrl()}/hyrox-training/in/${region}`;
  // See the county directories: "across" keeps a region page off the same
  // query as the town that shares its name (London, Wales).
  /* layout.tsx appends 20 characters. "Cheshire West and Chester" and
     "East Riding of Yorkshire" push "across" past 65, so those fall back to
     a comma, which reads as a directory just as well and fits. */
  const across = `Hyrox training across ${data.region}`;
  const title = across.length + 20 <= 65 ? across : `Hyrox training, ${data.region}`;
  const description = `Hyrox coaching across ${regionWithArticle(data.region)}. ${data.locations.length} towns and cities, each with its nearest race venue and local running options. From HYROX Elite 15 athlete Ben Sutherland.`;
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

export default async function RegionPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;
  const data = getRegionBySlug(region);
  if (!data) notFound();
  return (
    <GeoRegionDirectory
      region={data.region}
      locations={data.locations}
      base="/hyrox-training"
      title={`Hyrox training across ${regionWithArticle(data.region)}`}
      intro={`Personalised 12-week Hyrox programmes for athletes across ${regionWithArticle(data.region)}, dated to your race and built around the kit you actually train with. Pick your town for the local detail: nearest race, and where to run the 1 km repeats.`}
    />
  );
}
