import Link from "next/link";
import { Container } from "@/components/shared/container";
import { nearbyTowns } from "@/lib/locations/seo";
import { countySlug, listCountySlugs, regionSlug } from "@/lib/uk-locations";

/**
 * The towns next door.
 *
 * Before this, all 876 location pages were orphans: none linked to another, so
 * a crawler landing on one had nowhere lateral to go and the whole set hung off
 * two hub pages. Six links each turns a flat list into a graph, and the graph
 * is most of what tells a search engine these pages belong to one another.
 *
 * It is also the more useful answer for a reader. Somebody in a town with two
 * gyms often trains in the city twenty minutes away, and had no route to it.
 */
export function GeoNearby({
  slug,
  name,
  region,
  county,
  base,
  items,
  heading,
  parentPath,
}: {
  slug: string;
  name: string;
  region: string;
  county?: string;
  /** "/hyrox-training" or "/personal-trainer" */
  base: string;
  /**
   * Supplied by the international race cities, whose neighbours come from a
   * different catalogue and are hundreds of kilometres apart rather than one
   * town over. Defaults to the UK list, so existing callers are unchanged.
   */
  items?: { slug: string; name: string; km: number }[];
  heading?: string;
  /** Directory this place sits under. Defaults to its UK region. */
  parentPath?: string;
}) {
  const nearby = items ?? nearbyTowns(slug, 6);
  if (!nearby.length) return null;
  // Only counties big enough to have earned a directory page.
  const cSlug = county ? countySlug(county) : null;
  const hasCounty = !items && cSlug ? listCountySlugs().includes(cSlug) : false;
  const regionHref = parentPath ?? `${base}/in/${regionSlug(region)}`;

  return (
    <section
      aria-labelledby="geo-nearby-heading"
      className="border-t border-suth-border-subtle py-14 md:py-16"
    >
      <Container>
        <div className="mx-auto max-w-3xl">
          <h2
            id="geo-nearby-heading"
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary"
          >
            [ Near {name} ]
          </h2>
          <p className="mt-4 text-base leading-relaxed text-suth-text-secondary">
            {heading ??
              "Plenty of people train one town over, whether that is a better gym, a flatter route, or simply the one on the way home from work."}
          </p>
          <ul className="mt-5 flex flex-wrap gap-2.5">
            {nearby.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`${base}/${t.slug}`}
                  className="inline-flex h-10 items-center gap-2 rounded-pill border border-suth-border bg-suth-elevated px-4 text-sm font-medium text-suth-text transition-colors hover:border-suth-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
                >
                  {t.name}
                  <span className="font-mono text-[10px] tabular-nums text-suth-text-tertiary">
                    {t.km} km
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
            {hasCounty ? (
              <Link
                href={`${base}/county/${cSlug}`}
                className="text-sm font-medium text-suth-accent underline decoration-suth-accent/40 underline-offset-4 hover:decoration-suth-accent"
              >
                Every town in {county} →
              </Link>
            ) : null}
            <Link
              href={regionHref}
              className="text-sm font-medium text-suth-accent underline decoration-suth-accent/40 underline-offset-4 hover:decoration-suth-accent"
            >
              Everywhere we cover in {region} →
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
