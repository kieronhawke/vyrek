import Link from "next/link";
import { Container } from "@/components/shared/container";
import { CtaButton } from "@/components/shared/cta-button";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import type { UkLocation } from "@/lib/uk-locations";
/* resolveGeo, not getGeoSeo: the latter only knows the UK registry, so the
   country directories — which list race cities and expanded-market cities —
   aggregated zero and kept rendering the thin version. The resolver is the
   thing that knows every catalogue. */
import { resolveGeo } from "@/lib/geo-page";
import { JsonLd } from "@/lib/blog/jsonld";
import { siteUrl } from "@/lib/blog/urls";

/**
 * One region, every town in it, for a single page family.
 *
 * The middle layer of the geo tree. Without it the hub had to carry all 879
 * towns itself, which meant a 600 KB page and 1,748 links: slow, and link
 * equity divided into slivers. Now the hub links to 12 regions and each region
 * carries its own towns, none of them over ~140 links.
 */
export function GeoRegionDirectory({
  region,
  locations,
  base,
  title,
  intro,
  children,
}: {
  region: string;
  locations: UkLocation[];
  /** "/hyrox-training" or "/personal-trainer" */
  base: string;
  title: string;
  intro: string;
  /** Rendered under the place list. The USA directory uses it for states. */
  children?: React.ReactNode;
}) {
  const label =
    base === "/hyrox-training" ? "Hyrox training" : "Personal training";

  /* A crawl of the built site found 63 of 64 county directories and 35 of 36
     country directories under 250 words: a heading, an intro and a list of
     names. That is the doorway shape — a page whose whole content is links to
     other pages — and these are exactly the pages that must not look like it,
     because "personal trainer kent" is the evidenced query they exist for.
     Noindexing them would have defeated their purpose, so they carry the data
     instead. All of it is aggregated from places already loaded on this page;
     nothing here is fetched or invented. */
  const stats = (() => {
    let gyms = 0, parkruns = 0, withData = 0, biggest = 0;
    const chains = new Map<string, number>();
    let nearestRace: { city: string; km: number } | null = null;
    for (const l of locations) {
      const seo = resolveGeo(l.slug)?.seo;
      if (!seo) continue;
      gyms += seo.gyms.length;
      parkruns += seo.parkruns.length;
      if (seo.gyms.length || seo.parkruns.length) withData++;
      for (const c of seo.chains) chains.set(c, (chains.get(c) ?? 0) + 1);
      if ((l.populationK ?? 0) > biggest) biggest = l.populationK ?? 0;
      const r = seo.nearestRace;
      if (r && (!nearestRace || r.straightLineKm < nearestRace.km))
        nearestRace = { city: r.city, km: r.straightLineKm };
    }
    const topChains = [...chains.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    return { gyms, parkruns, withData, topChains, nearestRace };
  })();
  // A directory page is an ItemList of the pages it links to, plus the
  // breadcrumb that puts it between the hub and the towns. Without these the
  // 26 region pages carried no structured data at all.
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${label} in ${region}`,
    numberOfItems: locations.length,
    itemListElement: locations.map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteUrl()}${base}/${l.slug}`,
      name: `${label} in ${l.name}`,
    })),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
      { "@type": "ListItem", position: 2, name: label, item: `${siteUrl()}${base}` },
      { "@type": "ListItem", position: 3, name: region },
    ],
  };

  return (
    <>
      <JsonLd data={itemList} />
      <JsonLd data={breadcrumb} />
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <nav
            aria-label="Breadcrumb"
            className="mb-8 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary"
          >
            <Link href="/" className="hover:text-suth-text">
              Home
            </Link>
            <span aria-hidden className="mx-2">
              /
            </span>
            <Link href={base} className="hover:text-suth-text">
              {base === "/hyrox-training" ? "Hyrox training" : "Personal training"}
            </Link>
            <span aria-hidden className="mx-2">
              /
            </span>
            <span className="text-suth-text">{region}</span>
          </nav>

          <header className="mx-auto max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
              [ {region} ]
            </p>
            <h1 className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-[44px]">
              {title}
            </h1>
            <p className="mt-6 text-base leading-relaxed text-suth-text-secondary md:text-lg">
              {intro}
            </p>
            <div className="mt-8">
              <CtaButton href="/quiz" size="md">
                Start the 3-minute quiz →
              </CtaButton>
            </div>
          </header>

          {stats.gyms > 0 ? (
            <section
              aria-label={`Training in ${region} by the numbers`}
              className="mx-auto mt-12 max-w-4xl border-t border-suth-border-subtle pt-10"
            >
              <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
                [ Training across {region} ]
              </h2>
              <p className="mt-4 text-base leading-relaxed text-suth-text-secondary">
                {stats.gyms.toLocaleString("en-GB")} named gyms and sports
                centres are listed across {locations.length}{" "}
                {locations.length === 1 ? "place" : "places"} in {region}
                {stats.topChains.length
                  ? `, and ${stats.topChains
                      .map(([name, n]) => `${name} appears in ${n}`)
                      .join(", ")} of them`
                  : ""}
                .{" "}
                {stats.parkruns > 0
                  ? `${stats.parkruns} parkrun ${stats.parkruns === 1 ? "course" : "courses"} sit within reach, which is where the measured running happens.`
                  : "There is no parkrun within reach of most of these, so benchmarking means a repeatable loop of your own."}
              </p>
              {stats.nearestRace ? (
                <p className="mt-4 text-base leading-relaxed text-suth-text-secondary">
                  The closest race to anywhere in {region} is{" "}
                  {stats.nearestRace.city}, about{" "}
                  {stats.nearestRace.km.toLocaleString("en-GB")} km in a
                  straight line from the nearest of them. Whichever you enter,
                  the programme is dated backwards from that weekend.
                </p>
              ) : null}
              {stats.withData < locations.length ? (
                <p className="mt-4 text-[11px] leading-relaxed text-suth-text-tertiary">
                  {locations.length - stats.withData} of these have no gym or
                  terrain data yet and are not in the index until they do. They
                  are listed because the page should show the whole area, not
                  the flattering half of it.
                </p>
              ) : null}
            </section>
          ) : null}

          <section
            aria-label={`Towns and cities in ${region}`}
            className="mx-auto mt-14 max-w-4xl border-t border-suth-border-subtle pt-10"
          >
            <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
              [ {locations.length} places in {region} ]
            </h2>
            <ul className="mt-5 flex flex-wrap gap-2.5">
              {locations.map((l) => (
                <li key={l.slug}>
                  <Link
                    href={`${base}/${l.slug}`}
                    className="inline-flex h-10 items-center rounded-pill border border-suth-border bg-suth-elevated px-4 text-sm font-medium text-suth-text transition-colors hover:border-suth-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
                  >
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          {children}
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
