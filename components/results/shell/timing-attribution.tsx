import { getDataMode } from "@/lib/results";

/**
 * Source credit for every results view (engine brief §2).
 *
 * The facts on these pages — times, splits, ranks — are timed and published by
 * mika:Timing for HYROX. We normalise, analyse and present them; we do not
 * produce them, and a results site that reads as though it timed the race is
 * taking credit it has not earned.
 *
 * Renders only in `live` mode, and that is deliberate: in demo mode the numbers
 * are 76,000 invented races, and crediting a real timing provider for invented
 * data would be worse than no credit at all. The "Demo data" pill covers that
 * case instead.
 */
export function TimingAttribution({ officialUrl }: { officialUrl?: string } = {}) {
  if (getDataMode() !== "live") return null;

  return (
    <aside className="border-t border-[var(--results-hairline)] px-4 py-6 md:px-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--results-text-tertiary)]">
        Results data timed and published by mika:Timing for HYROX.{" "}
        {officialUrl ? (
          <a
            href={officialUrl}
            rel="noopener noreferrer"
            target="_blank"
            className="underline underline-offset-4 hover:text-[var(--results-accent)]"
          >
            Official results
          </a>
        ) : (
          <a
            href="https://results.hyrox.com/"
            rel="noopener noreferrer"
            target="_blank"
            className="underline underline-offset-4 hover:text-[var(--results-accent)]"
          >
            Official results
          </a>
        )}
      </p>
    </aside>
  );
}
