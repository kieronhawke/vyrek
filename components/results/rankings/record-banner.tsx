import Link from "next/link";
import { Trophy } from "lucide-react";
import type { RecordRow } from "@/lib/results/records";
import { announce } from "@/lib/results/records";
import { formatTime } from "@/lib/results/format";

/**
 * "New world record set."
 *
 * A record falling is the only moment most people ever look at a record book,
 * so it gets announced on the pages they are already on rather than waiting to
 * be discovered. It appears by itself — no state, no dismiss button, no
 * localStorage — because it disappears on its own after a fortnight and a
 * dismissible banner that returns tomorrow is worse than one that does not.
 *
 * The wording comes from `announce()`, which is scope-accurate: calling a
 * national record a world record is the one mistake this feature cannot make.
 */
export function RecordBanner({
  rows, countryName,
}: {
  rows: RecordRow[];
  countryName?: string;
}) {
  if (rows.length === 0) return null;

  const [headline, ...rest] = rows;

  return (
    <aside
      className="rounded-md border border-suth-accent/45 bg-suth-accent/[0.06] p-4"
      aria-label="Recently set records"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center
                     rounded-full bg-suth-accent/15 text-suth-accent"
        >
          <Trophy className="size-3.5" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-accent">
            {headline.scope === "world" ? "New world record" : "New record"}
          </p>
          <p className="mt-1 text-sm text-suth-text">
            {announce(headline, countryName)}
          </p>
          <p className="mt-1 text-xs text-suth-text-secondary">
            {formatTime(headline.holder.finishSeconds)} ·{" "}
            <Link
              href={`/report/${headline.holder.resultId}`}
              data-inline-tap
              className="text-suth-accent hover:underline"
            >
              read the race report
            </Link>
            {rest.length > 0 ? (
              <>
                {" · "}
                <Link
                  href="/rankings/records"
                  data-inline-tap
                  className="text-suth-accent hover:underline"
                >
                  {rest.length} more {rest.length === 1 ? "record" : "records"} just set
                </Link>
              </>
            ) : (
              <>
                {" · "}
                <Link
                  href="/rankings/records"
                  data-inline-tap
                  className="text-suth-accent hover:underline"
                >
                  every record
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </aside>
  );
}
