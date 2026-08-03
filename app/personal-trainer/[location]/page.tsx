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
import { VipInPerson } from "@/components/landing/vip-in-person";
import { ChampionshipBanner } from "@/components/landing/championship-banner";

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
  const { loc, seo, city, disambiguatedName } = r;
  const url = `${siteUrl()}/personal-trainer/${loc.slug}`;
  // app/layout.tsx appends " · Suth Performance" (20 chars), so the title
  // Google renders is this plus 20. The old one ran to 88 and truncated
  // mid-phrase. Lead with the exact query, keep the whole thing under 65.
  // 14 of the longest town names push this past 65 with ", online" on the
  // end, so drop the qualifier for those rather than let them truncate.
  // Two escape hatches, in order: drop the ", online" qualifier, then drop
  // the preposition. "Knightsbridge and Belgravia" needs both.
  /* Four international cities share a name with a UK town that already owns
     the bare slug: Boston, Houston, Perth and Portland. Distinct URLs are not
     enough — without the country these render two identical titles, which is
     the duplicate-title problem this whole scheme exists to avoid. Only the
     qualified side carries it; the UK page keeps the plain name. */
  const displayName = disambiguatedName ?? loc.name;
  const bare = `Personal trainer in ${displayName}`;
  const title =
    bare.length + 8 + 20 <= 65
      ? `${bare}, online`
      : bare.length + 20 <= 65
        ? bare
        : `Personal trainer, ${displayName}`;
  // Per-town, because this is the snippet in the results page. A description
  // identical across 1,973 places gives a searcher no reason to click ours.
  // The international cities lead on the race instead of the gym count: it is
  // the more specific fact, and the reason the page exists.
  const description = city
    ? `Online personal training for ${loc.name}, from a HYROX Elite 15 athlete. ${loc.name} is on the HYROX calendar${seo.gyms.length ? `, and the programme is built around any of the ${seo.gyms.length} gyms near the centre` : ""}. Free consultation, no commitment.`
    : seo.gyms.length
      ? `Personal training in ${loc.name}, online, from a HYROX Elite 15 athlete. Built around any of the ${seo.gyms.length} gyms and sports centres near you, or your kit at home. Free consultation, no commitment.`
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
    // Indexed where the page has something local to say. See lib/locations/seo.ts
    // for the UK rule; every race city qualifies on the race itself.
    robots: r.robots,
  };
}

export default async function PersonalTrainerLocationPage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const { location } = await params;
  const r = resolveGeo(location);
  if (!r) notFound();
  const { loc, seo, parent, nearby, city, vip, championship, disambiguatedName } = r;
  // See the metadata above: the four names both catalogues claim need the
  // country in the heading, or two live pages carry the same H1.
  const headingName = disambiguatedName;
  return (
    <>
      <JsonLd data={geoFaqJsonLd("pt", loc, seo)} />
      <JsonLd data={geoServiceJsonLd("pt", loc)} />
      <JsonLd
        data={geoBreadcrumbJsonLd("pt", loc, {
          name: parent.name,
          path: parent.path("/personal-trainer"),
        })}
      />
      <GeoLanding
        variant="pt"
        loc={loc}
        seo={seo}
        nearby={nearby}
        headingName={headingName}
        afterLocalContext={
          <>
            {championship ? <ChampionshipBanner {...championship} /> : null}
            {vip ? <VipInPerson city={vip.city} country={vip.country} /> : null}
          </>
        }
      />
    </>
  );
}
