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
  const url = `${siteUrl()}/hyrox-training/${loc.slug}`;
  // app/layout.tsx appends " · Suth Performance" (20 chars). Lead with the
  // exact query and keep the rendered title under 65 characters.
  //
  // This is also the conversion half of the intent split (see /hyrox/[city]):
  // this page sells the coaching, /hyrox/{slug} answers the research question.
  const title = `Hyrox training in ${loc.name}`;
  const description = `Hyrox training in ${loc.name} from a HYROX Elite 15 athlete. A personalised 12-week programme dated to your race, calibrated to your kit. See your Week 1, then talk it through with Ben on a free consultation.`;
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

export default async function HyroxTrainingLocationPage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const { location } = await params;
  const loc = getLocationBySlug(location);
  if (!loc) notFound();
  return (
    <>
      <JsonLd data={geoFaqJsonLd("hyrox", loc)} />
      <JsonLd data={geoServiceJsonLd("hyrox", loc)} />
      <JsonLd data={geoBreadcrumbJsonLd("hyrox", loc)} />
      <GeoLanding variant="hyrox" loc={loc} />
    </>
  );
}
