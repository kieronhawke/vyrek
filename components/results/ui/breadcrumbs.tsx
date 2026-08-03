import Link from "next/link";
import { breadcrumbList, jsonLd } from "@/lib/results/structured-data";
import { siteUrl } from "@/lib/blog/urls";
import { cn } from "@/lib/utils";

/**
 * The trail, rendered and marked up from one array.
 *
 * Ten pages had grown their own copy of this `<ol>`, and half the section had
 * no trail at all — so a reader landing on a ranking from search had no way to
 * find out what it belonged to. Worse, the pages that *did* have a trail had to
 * remember to emit the matching `BreadcrumbList` separately, and several did
 * not, so the visible trail and the structured data disagreed.
 *
 * One array drives both. The last crumb is the current page: it is not a link,
 * and the schema omits its `item`, which is what Google requires.
 */
export type Crumb = { name: string; path: string };

export function Breadcrumbs({
  trail, className,
}: {
  /** Root first, current page last. */
  trail: Crumb[];
  className?: string;
}) {
  if (trail.length === 0) return null;
  const last = trail.length - 1;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbList(siteUrl(), trail)) }}
      />
      {/* The trail owns its own bottom spacing. Eight pages had it added at
          once and none of them carried a margin, so the crumbs sat flush
          against the heading below — overridable, but correct by default. */}
      <nav aria-label="Breadcrumb" className={cn("mb-3", className)}>
        <ol className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
          {trail.map((crumb, i) => (
            <li key={crumb.path} className="flex items-center gap-1.5">
              {i === last ? (
                <span aria-current="page" className="text-suth-text-secondary">
                  {crumb.name}
                </span>
              ) : (
                <>
                  <Link
                    href={crumb.path}
                    className="hover:text-suth-accent focus-visible:outline-2 focus-visible:outline-suth-accent"
                  >
                    {crumb.name}
                  </Link>
                  <span aria-hidden>/</span>
                </>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
