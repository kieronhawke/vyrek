"use client";

import { useState } from "react";
import { STATIONS, type StationId, type Verdict } from "@/lib/gym-intel/types";

/**
 * The contribution control, and the reported results.
 *
 * One tap, no account, no email. The bar for contributing has to be lower than
 * the bar for leaving, or nobody contributes and the dataset never exists.
 *
 * What renders is what athletes said, with counts, and how thin the evidence is
 * where it is thin. It never presents a single report as a fact — the whole
 * point of this dataset is that it is more honest than asserting a kit list we
 * have not checked, and it stops being that the moment it overstates.
 */
export function GymIntel({
  place,
  gym,
  verdicts,
}: {
  place: string;
  gym: string;
  verdicts: Verdict[];
}) {
  const [sent, setSent] = useState<Set<StationId>>(new Set());
  const [busy, setBusy] = useState<StationId | null>(null);
  const [failed, setFailed] = useState(false);

  async function report(station: StationId, present: boolean) {
    setBusy(station);
    setFailed(false);
    try {
      const res = await fetch("/api/gym-intel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ place, gym, station, present }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSent((s) => new Set(s).add(station));
    } catch {
      // Say so. A control that silently does nothing teaches people to stop
      // using it, and this only works if people keep using it.
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  const unanswered = STATIONS.filter(
    (s) => !sent.has(s.id) && !verdicts.some((v) => v.station === s.id && v.confident),
  );

  return (
    <div className="mt-4 rounded-lg border border-suth-border bg-suth-base p-4">
      {verdicts.length > 0 && (
        <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5">
          {verdicts.map((v) => (
            <li key={v.station} className="text-xs text-suth-text-secondary">
              <span className={v.present ? "text-suth-accent" : "text-suth-text-tertiary"}>
                {v.present === null ? "?" : v.present ? "✓" : "✗"}
              </span>{" "}
              {v.label}
              <span className="ml-1 font-mono text-[10px] text-suth-text-tertiary">
                {v.confident
                  ? `${v.yes}/${v.yes + v.no}`
                  : `${v.yes + v.no} report${v.yes + v.no === 1 ? "" : "s"}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {unanswered.length > 0 ? (
        <>
          <p className="text-xs text-suth-text-tertiary">
            Train here? Tell the next person what it has. One tap, no account.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {unanswered.slice(0, 3).map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5">
                <span className="text-xs text-suth-text-secondary">{s.label}</span>
                <button
                  type="button"
                  disabled={busy === s.id}
                  onClick={() => report(s.id, true)}
                  className="rounded-pill border border-suth-border px-2.5 py-1 text-xs text-suth-text transition-colors hover:border-suth-accent disabled:opacity-50"
                >
                  yes
                </button>
                <button
                  type="button"
                  disabled={busy === s.id}
                  onClick={() => report(s.id, false)}
                  className="rounded-pill border border-suth-border px-2.5 py-1 text-xs text-suth-text transition-colors hover:border-suth-accent disabled:opacity-50"
                >
                  no
                </button>
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-suth-text-tertiary">
          Thanks — that helps the next person planning a session here.
        </p>
      )}

      {failed && (
        <p className="mt-2 text-xs text-suth-text-tertiary">
          That did not save. Worth trying again in a moment.
        </p>
      )}
    </div>
  );
}
