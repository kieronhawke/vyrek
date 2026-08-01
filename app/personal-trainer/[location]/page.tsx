import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  GeoLanding,
  geoFaqJsonLd,
  geoServiceJsonLd,
  geoBreadcrumbJsonLd,
} from "@/components/landing/geo-landing";
import { JsonLd } from "@/lib/blog/jsonld";
import { getLocationBySlug, listLocationSlugs } from "@/lib/uk-locations";
import { siteUrl } from "@/lib/blog/urls";
import { geoRobots, getGeoSeo } from "@/lib/locations/seo";

export const revalidate = 86400;
export const dynamicParams = false;

export async function generateStaticParams() {
  return listLocationSlugs().map((location) => ({ location }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ location: string }>;
}): Promise<Metadata> {
  const { location } = await params;
  const loc = getLocationBySlug(location);
  if (!loc) return { title: "Not found" };
  const url = `${siteUrl()}/personal-trainer/${loc.slug}`;
  // app/layout.tsx appends " · Suth Performance" (20 chars), so the title
  // Google renders is this plus 20. The old one ran to 88 and truncated
  // mid-phrase. Lead with the exact query, keep the whole thing under 65.
  // 14 of the longest town names push this past 65 with ", online" on the
  // end, so drop the qualifier for those rather than let them truncate.
  // Two escape hatches, in order: drop the ", online" qualifier, then drop
  // the preposition. "Knightsbridge and Belgravia" needs both.
  const bare = `Personal trainer in ${loc.name}`;
  const title =
    bare.length + 8 + 20 <= 65
      ? `${bare}, online`
      : bare.length + 20 <= 65
        ? bare
        : `Personal trainer, ${loc.name}`;
  // Per-town, because this is the snippet in the results page. A description
  // identical across 879 towns gives a searcher no reason to click ours.
  const g = getGeoSeo(loc.slug);
  const description = g.gyms.length
    ? `Personal training in ${loc.name}, online, from a HYROX Elite 15 athlete. Built around any of the ${g.gyms.length} gyms and sports centres near you, or your kit at home. Free consultation, no commitment.`
    : `Looking for a personal trainer in ${loc.name}? Get online personal training from a HYROX Elite 15 athlete, at a fraction of local PT rates. Free consultation, no commitment.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Suth Performance",
      type: "website",
      locale: "en_GB",
      images: [{ url: "/media/images/track/og-default.jpg", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description },
    // Indexed only where the keyword database evidences demand. The rest
    // stay live and followable but out of the index, so 67 near-duplicate
    // pages cannot drag the domain down. See lib/locations/seo.ts.
    robots: geoRobots(loc.slug),
  };
}

export default async function PersonalTrainerLocationPage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const { location } = await params;
  const loc = getLocationBySlug(location);
  if (!loc) notFound();
  return (
    <>
      <JsonLd data={geoFaqJsonLd("pt", loc)} />
      <JsonLd data={geoServiceJsonLd("pt", loc)} />
      <JsonLd data={geoBreadcrumbJsonLd("pt", loc)} />
      <GeoLanding variant="pt" loc={loc} />
    </>
  );
}
