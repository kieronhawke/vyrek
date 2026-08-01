import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GeoRegionDirectory } from "@/components/landing/geo-region-directory";
import { getRegionBySlug, listRegionSlugs, regionWithArticle } from "@/lib/uk-locations";
import { siteUrl } from "@/lib/blog/urls";

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
  const url = `${siteUrl()}/personal-trainer/in/${region}`;
  const title = `Personal training in ${data.region}`;
  const description = `Personal training across ${regionWithArticle(data.region)}. ${data.locations.length} towns and cities covered, each with local running options and the nearest race. Online coaching from an Elite 15 athlete.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: "Suth Performance", type: "website", locale: "en_GB" },
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
      base="/personal-trainer"
      title={`Personal training across ${regionWithArticle(data.region)}`}
      intro={`Online personal training for ${regionWithArticle(data.region)}, from HYROX Elite 15 athlete Ben Sutherland. A programme built around your gym, your days and your level, rebuilt every Sunday. Pick your town for what is on your doorstep.`}
    />
  );
}
