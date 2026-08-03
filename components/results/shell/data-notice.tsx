import { getDataMode } from "@/lib/results";
import { liveSourceDegradation } from "@/lib/results/live-source";

/**
 * Tells a visitor when they are not looking at current data.
 *
 * The resilience layer means a database outage no longer breaks the results
 * section — it quietly serves the last good answer, or the seeded dataset. That
 * is the right behaviour, and it creates an obligation: an athlete checking
 * their time must not be shown a stale number as though it were current, and
 * must never be shown synthetic data believing it is real.
 *
 * So the fallback is announced. Quietly — a thin strip, not a modal — because
 * most of the page is still correct and the visitor is here to read a
 * leaderboard, not to be interrupted.
 *
 * Renders nothing at all when everything is healthy, which is almost always.
 */
export function DataNotice() {
  // In demo mode the "Demo data" pill already says everything there is to say,
  // and two notices arguing about the same thing helps nobody.
  if (getDataMode() !== "live") return null;

  const { tier, since, reason } = liveSourceDegradation();
  if (tier === "live") return null;

  const isDemo = tier === "demo";

  return (
    <aside
      role="status"
      className={`border-y px-4 py-3 md:px-8 ${
        isDemo
          ? "border-amber-400/40 bg-amber-400/[0.06]"
          : "border-[var(--results-hairline)] bg-[var(--results-elevated)]"
      }`}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--results-text-secondary)]">
        {isDemo ? (
          <>
            <span className="text-amber-400">Sample data.</span> Live results are
            temporarily unavailable, so this page is showing example figures. These are
            not real race results.
          </>
        ) : (
          <>
            <span className="text-[var(--results-accent)]">Last known results.</span>{" "}
            Live updates are paused while we reconnect
            {since ? <> · since {new Date(since).toUTCString().slice(17, 22)} UTC</> : null}.
            Times shown were correct when last retrieved.
          </>
        )}
      </p>
      {/* The cause is for us, not for them — but it costs nothing to carry and
          saves a support round trip when somebody screenshots this. */}
      {reason ? <span className="sr-only">Reason: {reason}</span> : null}
    </aside>
  );
}
