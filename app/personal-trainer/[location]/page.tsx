import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GeoLanding, geoFaqJsonLd } from "@/components/landing/geo-landing";
import { JsonLd } from "@/lib/blog/jsonld";
import { getLocationBySlug, listLocationSlugs } from "@/lib/uk-locations";
import { siteUrl } from "@/lib/blog/urls";
import { geoRobots } from "@/lib/locations/seo";

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
  const title = `Personal trainer in ${loc.name} · online coaching with a free consultation`;
  const description = `Looking for a personal trainer in ${loc.name}? Get online personal training from a HYROX Elite 15 athlete, at a fraction of local PT rates. Free consultation, no commitment.`;
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
      <GeoLanding variant="pt" loc={loc} />
    </>
  );
}
