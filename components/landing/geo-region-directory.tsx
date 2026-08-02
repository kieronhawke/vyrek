import Link from "next/link";
import { Container } from "@/components/shared/container";
import { CtaButton } from "@/components/shared/cta-button";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import type { UkLocation } from "@/lib/uk-locations";
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
