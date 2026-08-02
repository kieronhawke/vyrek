import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  GeoLanding,
  geoFaqJsonLd,
  geoServiceJsonLd,
  geoBreadcrumbJsonLd,
} from "@/components/landing/geo-landing";
import { JsonLd } from "@/lib/blog/jsonld";
import { siteUrl } from "@/lib/blog/urls";
import { listAllGeoSlugs, resolveGeo } from "@/lib/geo-page";

export const revalidate = 86400;
export const dynamicParams = false;

export async function generateStaticParams() {
  return listAllGeoSlugs().map((location) => ({ location }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ location: string }>;
}): Promise<Metadata> {
  const { location } = await params;
  const r = resolveGeo(location);
  if (!r) return { title: "Not found" };
  const { loc, city } = r;
  const url = `${siteUrl()}/hyrox-training/${loc.slug}`;
  // app/layout.tsx appends " · Suth Performance" (20 chars). Lead with the
  // exact query and keep the rendered title under 65 characters.
  //
  // This is also the conversion half of the intent split (see /hyrox/[city]):
  // this page sells the coaching, /hyrox/{slug} answers the research question.
  /* Boston, Houston, Perth and Portland each exist twice in the slug space,
     once as a UK town and once as an international race city. The country
     disambiguates the title; see the personal-trainer sibling. */
  const displayName = city?.bareSlug ? `${loc.name}, ${city.country}` : loc.name;
  const title = `Hyrox training in ${displayName}`;
  // A race city can say something no UK town page can: the race is here. That
  // belongs in the snippet, because it is the reason someone in Osaka clicks.
  const description = city
    ? `Hyrox training in ${loc.name}, where the race is actually held, from a HYROX Elite 15 athlete. A personalised 12-week programme dated backwards from race day and built around the gym you already use.`
    : `Hyrox training in ${loc.name} from a HYROX Elite 15 athlete. A personalised 12-week programme dated to your race, calibrated to your kit. See your Week 1, then talk it through with Ben on a free consultation.`;
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
    // Indexed where the page has something local to say. See lib/locations/seo.ts
    // for the UK rule; every race city qualifies on the race itself.
    robots: r.robots,
  };
}

export default async function HyroxTrainingLocationPage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const { location } = await params;
  const r = resolveGeo(location);
  if (!r) notFound();
  const { loc, seo, parent, nearby, city } = r;
  // See the metadata above: the four names both catalogues claim need the
  // country in the heading, or two live pages carry the same H1.
  const headingName = city?.bareSlug ? `${loc.name}, ${city.country}` : undefined;
  return (
    <>
      <JsonLd data={geoFaqJsonLd("hyrox", loc, seo)} />
      <JsonLd data={geoServiceJsonLd("hyrox", loc)} />
      <JsonLd
        data={geoBreadcrumbJsonLd("hyrox", loc, {
          name: parent.name,
          path: parent.path("/hyrox-training"),
        })}
      />
      <GeoLanding
        variant="hyrox"
        loc={loc}
        seo={seo}
        nearby={nearby}
        headingName={headingName}
      />
    </>
  );
}
