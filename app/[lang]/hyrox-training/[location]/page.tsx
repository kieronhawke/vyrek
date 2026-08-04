import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/lib/blog/jsonld";
import { LocalisedGeoPage } from "@/components/landing/localised-geo";
import { LOCALE_CONFIG, LOCALES, isLocale, localCountry, type Locale } from "@/lib/i18n/config";
import { de } from "@/lib/i18n/de";
import { fr } from "@/lib/i18n/fr";
import { es } from "@/lib/i18n/es";
import { localisedCities, localisedNearby } from "@/lib/i18n/cities";
import { resolveGeo } from "@/lib/geo-page";
import { siteUrl } from "@/lib/blog/urls";

/**
 * A location page in the reader's own language.
 *
 * Only the Hyrox family is localised. "hyrox training berlin" is a brand-led
 * query a German reader will type in German; "personal trainer berlin" is
 * answered by German sites and is not a query an English-speaking UK coach
 * should expect to win, translated page or not.
 *
 * The locale segment is static-only (`dynamicParams = false`, params limited to
 * the configured locales), and Next matches literal segments before dynamic
 * ones, so /blog and /hyrox are unaffected by this route existing.
 */
export const revalidate = 86400;
export const dynamicParams = false;

const COPY = { de, fr, es } as const;

export async function generateStaticParams() {
  return LOCALES.flatMap((lang) =>
    localisedCities(lang).map((c) => ({ lang, location: c.slug })),
  );
}

function resolve(lang: string, location: string) {
  if (!isLocale(lang)) return null;
  const city = localisedCities(lang).find((c) => c.slug === location);
  if (!city) return null;
  const geo = resolveGeo(location);
  if (!geo) return null;
  return { locale: LOCALE_CONFIG[lang], copy: COPY[lang], city, geo };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; location: string }>;
}): Promise<Metadata> {
  const { lang, location } = await params;
  const r = resolve(lang, location);
  if (!r) return { title: "Not found" };
  const { locale, copy, city, geo } = r;
  const url = `${siteUrl()}/${locale.code}/hyrox-training/${location}`;
  const englishUrl = `${siteUrl()}/hyrox-training/${location}`;
  const title = copy.title(city.name);
  const description = copy.description(city.name, geo.seo);
  return {
    title,
    description,
    alternates: {
      canonical: url,
      // Both directions declared, plus x-default on the English page, which is
      // what stops the two being read as duplicates of each other.
      languages: { en: englishUrl, [locale.hreflang]: url, "x-default": englishUrl },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Suth Performance",
      type: "website",
      locale: locale.ogLocale,
      images: [{ url: "/media/images/track/og-default.jpg", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: geo.seo.indexable, follow: true },
  };
}

export default async function LocalisedHyroxTrainingPage({
  params,
}: {
  params: Promise<{ lang: string; location: string }>;
}) {
  const { lang, location } = await params;
  const r = resolve(lang, location);
  if (!r) notFound();
  const { locale, copy, city, geo } = r;

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale.hreflang,
    mainEntity: copy.faqs(city.name, geo.seo).map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  /* The English page emits Service and BreadcrumbList alongside the FAQ; the
     localised one shipped with only the FAQ, so the German, French and Spanish
     pages described themselves to a crawler less completely than the version
     they are meant to outrank in that market. inLanguage is set on each, which
     the English pair does not need and these do. */
  const base = `${siteUrl()}/${locale.code}/hyrox-training`;
  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    inLanguage: locale.hreflang,
    name: copy.title(city.name),
    serviceType: "Hyrox coaching",
    url: `${base}/${location}`,
    areaServed: {
      "@type": "City",
      name: city.name,
      containedInPlace: { "@type": "Country", name: city.country },
    },
    provider: {
      "@type": "Organization",
      name: "Suth Performance",
      url: siteUrl(),
      founder: { "@type": "Person", name: "Ben Sutherland" },
    },
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: `${siteUrl()}/quiz`,
      // The funnel past this page is English; saying otherwise in markup would
      // be a claim the site does not honour.
      availableLanguage: "en",
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    inLanguage: locale.hreflang,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
      { "@type": "ListItem", position: 2, name: copy.h1(city.name), item: `${base}/${location}` },
    ],
  };

  return (
    <>
      <JsonLd data={faqLd} />
      <JsonLd data={serviceLd} />
      <JsonLd data={breadcrumbLd} />
      <LocalisedGeoPage
        copy={copy}
        locale={locale}
        city={city.name}
        country={localCountry(lang as Locale, city.country)}
        seo={geo.seo}
        englishHref={`/hyrox-training/${location}`}
        nearby={localisedNearby(lang as Locale, location, 6)}
      />
    </>
  );
}
