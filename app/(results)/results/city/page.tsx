import type { Metadata } from "next";
import Link from "next/link";
import { getResultsSource } from "@/lib/results";
import { siteUrl } from "@/lib/blog/urls";
import { groupEventsByCity } from "@/lib/results/city";
import { breadcrumbList, jsonLd } from "@/lib/results/structured-data";
import { formatCount } from "@/lib/results/format";
import { FaqSection } from "@/components/results/ui/faq-section";
import { MicroLabel, Nationality, EmptyState } from "@/components/results/ui/primitives";

/**
 * `/results/city` — the index of every city HYROX has raced in.
 *
 * This exists as much for crawlers as for readers. City hubs are otherwise
 * reachable only from the events they contain, which buries them; one flat
 * index puts every hub a single click from `/results` and gives the whole
 * section a spine.
 *
 * Grouped by country, because that is how someone scans for their own race,
 * and because it produces a second layer of on-page keywords ("HYROX United
 * Kingdom", "HYROX Germany") without a word of filler.
 */

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "HYROX Results by City: Every Race Location Worldwide",
  description:
    "Every city HYROX has raced in, with full results, finish times and "
    + "division rankings for each. Browse by country or jump straight to your "
    + "race — free and without an account.",
  alternates: { canonical: "/results/city" },
  openGraph: { url: `${siteUrl()}/results/city`, type: "website" },
};

const FAQS = [
  {
    q: "How do I find my HYROX result?",
    a: "Pick your city below, then the edition you raced. Every finisher is "
      + "listed by division with their finish time, overall and age-group rank, "
      + "and a full station-by-station breakdown against the division average. "
      + "No account and no sign-up.",
  },
  {
    q: "How many cities has HYROX raced in?",
    a: "HYROX runs a global calendar spanning Europe, North America, Asia-Pacific "
      + "and the Middle East, and returns to most host cities every season. Every "
      + "city with a result in our database has a hub page below, covering every "
      + "edition it has hosted.",
  },
  {
    q: "Are HYROX finish times comparable between cities?",
    a: "Broadly, but not exactly. The distance, the stations and the weights are "
      + "identical everywhere, so a time means the same thing wherever it was set. "
      + "Venue layout still moves the clock — roxzone length, floor surface, lap "
      + "configuration and hall temperature all cost or save time. Our course "
      + "speed index measures how much.",
  },
];

export default async function CityIndexPage() {
  const events = await getResultsSource().listEvents().catch(() => []);
  const cities = groupEventsByCity(events);

  const byCountry = new Map<string, typeof cities>();
  for (const city of cities) {
    const key = city.country || "Other";
    if (!byCountry.has(key)) byCountry.set(key, []);
    byCountry.get(key)!.push(city);
  }
  // Countries with the most host cities first — the useful scan order.
  const countries = [...byCountry.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  );

  const crumbsLd = breadcrumbList(siteUrl(), [
    { name: "Results", path: "/results" },
    { name: "Cities", path: "/results/city" },
  ]);

  const listLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${siteUrl()}/results/city#collection`,
    name: "HYROX results by city",
    description: metadata.description as string,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: cities.length,
      itemListElement: cities.slice(0, 200).map((city, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${siteUrl()}/results/city/${city.slug}`,
        name: `HYROX ${city.city}`,
      })),
    },
  };

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(listLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbsLd) }} />

      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
          <li><Link href="/results" className="hover:text-suth-accent">Results</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-suth-text-secondary">Cities</li>
        </ol>
      </nav>

      <header className="mt-3">
        <MicroLabel>[ WORLDWIDE ]</MicroLabel>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.02em] text-suth-text md:text-4xl">
          HYROX Results by City
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-suth-text-secondary">
          {cities.length > 0 ? (
            <>
              {cities.length} host {cities.length === 1 ? "city" : "cities"} across{" "}
              {countries.length} {countries.length === 1 ? "country" : "countries"},
              covering {formatCount(events.length)} races. Every edition, every
              division, every finisher — free and without an account.
            </>
          ) : (
            <>Race locations appear here as results are published.</>
          )}
        </p>
      </header>

      {cities.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No cities yet"
            body="City hubs build themselves from published results."
            action={<Link href="/events" className="text-sm text-suth-accent underline">See the calendar</Link>}
          />
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {countries.map(([country, group]) => (
            <section key={country} aria-labelledby={`c-${country.replace(/\W/g, "")}`}>
              <h2
                id={`c-${country.replace(/\W/g, "")}`}
                className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary"
              >
                <Nationality iso={group[0].countryIso} />
                HYROX {country}
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.map((city) => (
                  <li key={city.slug}>
                    <Link
                      href={`/results/city/${city.slug}`}
                      className="flex items-baseline justify-between gap-3 rounded-md border
                                 border-suth-border-subtle bg-suth-elevated px-3 py-2.5
                                 hover:border-suth-accent/40 hover:bg-suth-overlay
                                 focus-visible:outline-2 focus-visible:outline-offset-2
                                 focus-visible:outline-suth-accent"
                    >
                      <span className="truncate text-sm font-semibold text-suth-text">
                        {city.city}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-suth-text-tertiary">
                        {city.editions} {city.editions === 1 ? "race" : "races"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <FaqSection faqs={FAQS} title="Finding your race" />
    </div>
  );
}
