import { getDataMode } from "@/lib/results";

/**
 * The "Demo data" pill, brief §2.
 *
 * Fixed to the corner of every Results page while `NEXT_PUBLIC_DATA_MODE`
 * is `demo`. Disappears entirely on `live` — no conditional styling to
 * remember, the component simply renders nothing.
 *
 * Deliberately unmissable but not obstructive: this data is synthetic and
 * anyone reading a leaderboard deserves to know that without hunting.
 */
export function DemoDataPill() {
  if (getDataMode() === "live") return null;

  return (
    <div
      className="pointer-events-none fixed bottom-[calc(var(--safe-bottom)+4.75rem)] right-3 z-40 md:bottom-4 md:right-4"
      role="note"
    >
      <span
        className="inline-flex items-center gap-1.5 rounded-pill border border-suth-accent/30
                   bg-suth-base/85 px-2.5 py-1 font-mono text-[10px] uppercase
                   tracking-[0.16em] text-suth-accent backdrop-blur-sm"
      >
        <span className="size-1.5 rounded-full bg-suth-accent" aria-hidden />
        Demo data
      </span>
    </div>
  );
}
