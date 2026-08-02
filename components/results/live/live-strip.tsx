"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Time, Delta, MicroLabel, Nationality, Skeleton } from "../ui/primitives";
import type { RankingRow } from "@/lib/results/source";

/**
 * LIVE strip — brief §6.1.
 *
 * Polls every 20 seconds and animates rank changes with FLIP, via motion's
 * layout animation. `prefers-reduced-motion` turns the movement off but keeps
 * the data updating, which is the part that matters.
 *
 * "Updated Xs ago" ticks every second so a stalled feed is visible rather than
 * silently stale — a board that has quietly stopped is worse than no board.
 */

const POLL_MS = 20_000;

type Board = {
  divisionCode: string;
  label: string;
  finisherCount: number;
  rows: RankingRow[];
};

export function LiveStrip({ eventSlug, eventName }: { eventSlug: string; eventName: string }) {
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [failed, setFailed] = useState(false);
  const reduceMotion = useReducedMotion();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();

    const load = async () => {
      try {
        const res = await fetch(`/api/results/live/${eventSlug}`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { boards: Board[] };
        if (!mounted.current) return;
        setBoards(data.boards);
        setUpdatedAt(Date.now());
        setFailed(false);
      } catch (err) {
        if ((err as Error).name !== "AbortError" && mounted.current) setFailed(true);
      }
    };

    load();
    const poll = setInterval(load, POLL_MS);
    return () => {
      mounted.current = false;
      controller.abort();
      clearInterval(poll);
    };
  }, [eventSlug]);

  useEffect(() => {
    if (!updatedAt) return;
    const tick = setInterval(() => setSecondsAgo(Math.floor((Date.now() - updatedAt) / 1000)), 1000);
    return () => clearInterval(tick);
  }, [updatedAt]);

  if (failed && !boards) {
    return (
      <div className="rounded-md border border-suth-border bg-suth-elevated p-5 text-sm text-suth-text-secondary">
        The live board is unavailable right now. Results are unaffected —{" "}
        <Link href={`/event/${eventSlug}`} className="text-suth-accent underline">
          open the event page
        </Link>
        .
      </div>
    );
  }

  if (!boards) {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-md border border-suth-border-subtle bg-suth-elevated p-4">
            <Skeleton className="h-3 w-24" />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 5 }, (_, r) => <Skeleton key={r} className="h-6 w-full" />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-3">
        {boards.map((board) => (
          <div
            key={board.divisionCode}
            className="rounded-md border border-suth-border-subtle bg-suth-elevated p-4"
          >
            <div className="flex items-baseline justify-between">
              <MicroLabel>{board.label.replace("HYROX ", "")}</MicroLabel>
              <span className="results-num text-[10px] text-suth-text-tertiary">
                {board.finisherCount} in
              </span>
            </div>

            <ol className="mt-3 space-y-1">
              {board.rows.map((row) => (
                <motion.li
                  key={row.id}
                  layout={!reduceMotion}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-baseline gap-2.5 text-xs"
                >
                  <span className="results-num w-4 shrink-0 text-suth-text-tertiary">
                    {row.rank}
                  </span>
                  <Nationality iso={row.countryIso} />
                  <Link
                    href={`/result/${row.id}`}
                    className="min-w-0 flex-1 truncate text-suth-text hover:text-suth-accent
                               focus-visible:outline-2 focus-visible:outline-suth-accent"
                  >
                    {row.athleteName}
                  </Link>
                  <Time seconds={row.finishSeconds} className="shrink-0" />
                  {row.rank > 1 ? (
                    <Delta seconds={row.gapToLeaderSeconds} className="w-14 shrink-0 text-right text-[11px]" />
                  ) : (
                    <span className="w-14 shrink-0" aria-hidden />
                  )}
                </motion.li>
              ))}
            </ol>

            <Link
              href={`/ranking/${eventSlug}-${board.divisionCode}`}
              className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.16em]
                         text-suth-text-tertiary hover:text-suth-accent
                         focus-visible:outline-2 focus-visible:outline-suth-accent"
            >
              Full board →
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-2.5 flex items-center gap-2 text-xs text-suth-text-tertiary">
        <span className="sr-only">{eventName} live board.</span>
        <span aria-live="polite" className="results-num">
          {failed
            ? "Reconnecting…"
            : `Updated ${secondsAgo}s ago`}
        </span>
      </p>
    </div>
  );
}
