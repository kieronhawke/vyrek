import Link from "next/link";
import { STATIONS, type StationDef } from "@/lib/hyrox-stations";

/**
 * THE DESKTOP RAIL ON A STATION GUIDE.
 *
 * These pages were built as one 768px column repeated eleven times — every
 * section carried `mx-auto max-w-3xl`. On a phone that is correct and it is
 * why it was never noticed; on a 1440px screen it is a narrow ribbon of text
 * with 340px of empty page down either side, which is what "not optimised for
 * desktop" looks like in practice.
 *
 * The fix is not to widen the text. A 90-character measure is harder to read,
 * not easier, so the reading column stays roughly where it was and the
 * recovered width goes to something useful instead.
 *
 * What earns the space, in the order somebody needs it:
 *
 *   • **The spec.** "What weight is the men's sled again" is the single most
 *     common reason anybody opens one of these pages, and it was previously
 *     one item in a list you had to scroll to. On desktop it is now always on
 *     screen.
 *   • **Contents.** Ten sections is long enough that arriving from search
 *     means guessing where your answer is. Jump links remove the guess.
 *   • **The other stations.** Somebody reading about the sled push is quite
 *     likely to want the sled pull next, and the only route to it was the very
 *     bottom of the page.
 *
 * Rendered `lg:` and up only. Below that the page keeps the single-column
 * order it already had, where all of this is reachable by scrolling and a
 * sticky rail would just eat the screen.
 */

export type RailSection = { id: string; label: string };

export function StationRail({
  station,
  sections,
}: {
  station: StationDef;
  sections: RailSection[];
}) {
  const index = STATIONS.findIndex((x) => x.slug === station.slug);

  return (
    /*
     * `top-28` clears the fixed site header — a sticky element that tucks
     * under a fixed nav is a classic and very visible bug. `max-h` plus
     * `overflow-y-auto` so the rail scrolls internally rather than being
     * clipped on a short laptop screen.
     */
    <aside
      aria-label="Station reference"
      className="hidden lg:block"
    >
      <div className="sticky top-28 max-h-[calc(100vh-8rem)] space-y-8 overflow-y-auto pb-8">
        <section>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
            Race spec
          </h2>
          <dl className="mt-3 space-y-2 border-l border-suth-accent/40 pl-4">
            <SpecRow label="Men's open" value={station.spec.mensOpen} accent />
            <SpecRow label="Women's open" value={station.spec.womensOpen} />
            {station.spec.distance ? (
              <SpecRow label="Distance" value={station.spec.distance} />
            ) : null}
            {station.spec.reps ? <SpecRow label="Reps" value={station.spec.reps} /> : null}
            <SpecRow
              label="Order"
              value={`Station ${String(station.order).padStart(2, "0")} of 8`}
            />
          </dl>
        </section>

        {sections.length > 0 ? (
          <nav aria-label="On this page">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
              On this page
            </h2>
            <ul className="mt-3 space-y-1.5">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    /*
                     * `data-inline-tap` is the repo's existing opt-out from the
                     * global 48px tap-target floor in globals.css. Without it
                     * every link in this list is 48px tall and ten of them make
                     * a 480px column of mostly empty space — which is how a
                     * contents list ends up taller than the content it indexes.
                     * A dense desktop rail wants ~30px rows; the floor exists
                     * for thumbs on a phone, and this rail is `lg:` and up.
                     */
                    data-inline-tap
                    className="block py-1 text-sm leading-6 text-suth-text-secondary transition-colors hover:text-suth-accent"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <nav aria-label="All stations">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
            All eight stations
          </h2>
          <ol className="mt-3 space-y-1">
            {STATIONS.map((other, i) => {
              const here = other.slug === station.slug;
              return (
                <li key={other.slug}>
                  {here ? (
                    /* The current page is not a link. A nav item that reloads
                       the page you are on reads as broken. */
                    <span
                      aria-current="page"
                      className="flex items-baseline gap-2 text-sm font-semibold text-suth-accent"
                    >
                      <span className="font-mono text-[10px] tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {other.name}
                    </span>
                  ) : (
                    <Link
                      href={`/hyrox/stations/${other.slug}`}
                      data-inline-tap
                      className="flex items-baseline gap-2 py-1 text-sm leading-6 text-suth-text-secondary transition-colors hover:text-suth-text"
                    >
                      <span className="font-mono text-[10px] tabular-nums text-suth-text-tertiary">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {other.name}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="rounded-lg border border-suth-border-subtle bg-suth-elevated p-4">
          <p className="text-sm leading-relaxed text-suth-text-secondary">
            Every station gets explicit progression in a Suth programme, scaled
            to your own standards.
          </p>
          <Link
            href="/quiz"
            /* This one keeps the full tap target — it is an action, not an
               index entry, and it is the only conversion point on the rail. */
            className="mt-3 inline-flex items-center text-sm font-semibold text-suth-accent hover:underline"
          >
            Build my plan →
          </Link>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
          {index >= 0 ? `Guide ${index + 1} of ${STATIONS.length}` : null}
        </p>
      </div>
    </aside>
  );
}

function SpecRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-suth-text-tertiary">{label}</dt>
      <dd
        className={
          "text-right font-mono text-xs tabular-nums "
          + (accent ? "text-suth-accent" : "text-suth-text")
        }
      >
        {value}
      </dd>
    </div>
  );
}
