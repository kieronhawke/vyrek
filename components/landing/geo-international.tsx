import Link from "next/link";
import { countriesByContinent, RACE_CITIES } from "@/lib/race-cities";

/**
 * The international half of the geo programme, on the two hub pages.
 *
 * Both hubs listed 12 UK regions and stopped there, which left 72 country
 * directories and 182 race-city pages reachable only from the sitemap. A
 * sitemap gets a page crawled; internal links are what say the pages belong to
 * each other and carry any authority between them. This is the same fix
 * `nearbyTowns` made for the UK towns when all 876 of them were orphans.
 *
 * Countries rather than cities, deliberately. Listing all 91 cities here would
 * put ~180 more links on a page that already carries a couple of hundred, for
 * the same reason the UK side lists regions instead of 1,882 towns. Two hops —
 * continent, country, city — keeps every page small and every city two clicks
 * from the hub.
 */
export function GeoInternational({ base }: { base: "/personal-trainer" | "/hyrox-training" }) {
  const groups = countriesByContinent();
  const cityCount = RACE_CITIES.length;
  const countryCount = groups.reduce((n, g) => n + g.countries.length, 0);

  const heading =
    base === "/hyrox-training"
      ? "Hyrox training where the races are"
      : "Coaching beyond the UK";

  return (
    <section
      aria-labelledby="geo-international-heading"
      className="mx-auto mt-16 max-w-4xl border-t border-suth-border-subtle pt-12"
    >
      <h2
        id="geo-international-heading"
        className="text-2xl font-black tracking-[-0.03em] text-suth-text md:text-3xl"
      >
        {heading}
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-suth-text-secondary">
        {cityCount} cities across {countryCount} countries have hosted a HYROX.
        Each has its own page with the venue, the date, and the gyms near the
        centre. The coaching is online and in English, so the programme works
        the same wherever you race.
      </p>

      <div className="mt-10 space-y-8">
        {groups.map((g) => (
          <div key={g.continent}>
            <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
              [ {g.continent} ]
            </h3>
            <ul className="mt-4 flex flex-wrap gap-2.5">
              {g.countries.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`${base}/country/${c.slug}`}
                    className="inline-flex h-10 items-center gap-2 rounded-pill border border-suth-border bg-suth-elevated px-4 text-sm font-medium text-suth-text transition-colors hover:border-suth-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
                  >
                    {c.name}
                    <span className="font-mono text-[10px] tabular-nums text-suth-text-tertiary">
                      {c.cities}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
