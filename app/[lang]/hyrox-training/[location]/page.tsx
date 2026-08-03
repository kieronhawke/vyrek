import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/lib/blog/jsonld";
import { LocalisedGeoPage } from "@/components/landing/localised-geo";
import { LOCALE_CONFIG, LOCALES, isLocale, type Locale } from "@/lib/i18n/config";
import { de } from "@/lib/i18n/de";
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

const COPY = { de } as const;

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

  return (
    <>
      <JsonLd data={faqLd} />
      <LocalisedGeoPage
        copy={copy}
        locale={locale}
        city={city.name}
        country={city.country}
        seo={geo.seo}
        englishHref={`/hyrox-training/${location}`}
        nearby={localisedNearby(lang as Locale, location, 6)}
      />
    </>
  );
}
