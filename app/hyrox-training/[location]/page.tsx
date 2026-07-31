import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GeoLanding, geoFaqJsonLd } from "@/components/landing/geo-landing";
import { JsonLd } from "@/lib/blog/jsonld";
import { getLocationBySlug, listLocationSlugs } from "@/lib/uk-locations";
import { siteUrl } from "@/lib/blog/urls";

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
  // The conversion half of the intent split (see /hyrox/[city]). This page
  // sells the coaching; /hyrox/{slug} answers the research question.
  const title = `Hyrox coaching in ${loc.name}, personalised to your race`;
  const description = `Hyrox coaching for ${loc.name} athletes from HYROX Elite 15 competitor Ben Sutherland. A 12-week programme dated to your race and built around the kit you train with. Starts with a free consultation.`;
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
    robots: { index: true, follow: true },
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
      <GeoLanding variant="hyrox" loc={loc} />
    </>
  );
}
