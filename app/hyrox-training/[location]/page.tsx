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
import { localesForCountry } from "@/lib/i18n/config";
import { localisedCities } from "@/lib/i18n/cities";
import { LOCALE_CONFIG } from "@/lib/i18n/config";
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
  const { loc, city, disambiguatedName } = r;
  const url = `${siteUrl()}/hyrox-training/${loc.slug}`;
  // app/layout.tsx appends " · Suth Performance" (20 chars). Lead with the
  // exact query and keep the rendered title under 65 characters.
  //
  // This is also the conversion half of the intent split (see /hyrox/[city]):
  // this page sells the coaching, /hyrox/{slug} answers the research question.
  /* Any catalogue that qualifies a slug supplies the qualified name too; see
     resolveGeo. Boston, Perth, Newcastle NSW and 60 others need it. */
  const displayName = disambiguatedName ?? loc.name;
  // A handful of Montreal boroughs overflow 65 even here. Left prefixed: see
  // the personal-trainer sibling — dropping it collided the two families.
  const title = `Hyrox training in ${displayName}`;
  // A race city can say something no UK town page can: the race is here. That
  // belongs in the snippet, because it is the reason someone in Osaka clicks.
  const description = city
    ? `Hyrox training in ${loc.name}, where the race is actually held, from a HYROX Elite 15 athlete. A personalised 12-week programme dated backwards from race day and built around the gym you already use.`
    : `Hyrox training in ${loc.name} from a HYROX Elite 15 athlete. A personalised 12-week programme dated to your race, calibrated to your kit. See your Week 1, then talk it through with Ben on a free consultation.`;
  return {
    title,
    description,
    /* hreflang has to be declared on both sides or Google treats the German
       page as a competing duplicate of the English one rather than its
       alternate. x-default points at English, which is the version to serve a
       reader whose language we do not publish. */
    alternates: {
      canonical: url,
      languages: (() => {
        const country = city?.country ?? loc.region;
        const locales = localesForCountry(country).filter((l) =>
          localisedCities(l).some((c) => c.slug === loc.slug),
        );
        if (!locales.length) return undefined;
        const langs: Record<string, string> = { en: url, "x-default": url };
        for (const l of locales) langs[l] = `${siteUrl()}/${l}/hyrox-training/${loc.slug}`;
        return langs;
      })(),
    },
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

/** Localised versions of this page that actually exist, for the switcher. */
function localeLinksFor(country: string, slug: string) {
  return localesForCountry(country)
    .filter((l) => localisedCities(l).some((c) => c.slug === slug))
    .map((l) => ({
      href: `/${l}/hyrox-training/${slug}`,
      label: LOCALE_CONFIG[l].switcherLabel,
      hrefLang: LOCALE_CONFIG[l].hreflang,
    }));
}

export default async function HyroxTrainingLocationPage({
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
        localeLinks={localeLinksFor(city?.country ?? loc.region, loc.slug)}
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
