import { cn } from "@/lib/utils";
import { formatTime, formatSplit, formatDelta, flagEmoji, nationCode } from "@/lib/results/format";
import type { EventStatus } from "@/lib/results/types";
import type { RankBand } from "@/lib/results/percentiles";

/* ─── Numerals ────────────────────────────────────────────────────
   Every number in this section goes through one of these. The brief allows
   no exceptions on tabular figures, and centralising it is how that stays
   true six months from now. */

export function Time({
  seconds, style = "clock", className,
}: {
  seconds: number;
  style?: "clock" | "minutes";
  className?: string;
}) {
  return (
    <span className={cn("results-num", className)}>
      {style === "minutes" ? formatSplit(seconds) : formatTime(seconds)}
    </span>
  );
}

/**
 * A signed delta against a reference. Chartreuse faster, amber slower — but
 * the sign carries the meaning on its own, so this reads correctly in
 * greyscale and with any colour vision.
 */
export function Delta({
  seconds, className, showZero = true,
}: {
  seconds: number;
  className?: string;
  showZero?: boolean;
}) {
  if (!showZero && Math.round(seconds) === 0) return null;
  const rounded = Math.round(seconds);
  const tone =
    rounded < 0 ? "text-results-faster"
    : rounded > 0 ? "text-results-slower"
    : "text-suth-text-tertiary";
  return (
    <span className={cn("results-num", tone, className)}>
      {formatDelta(seconds)}
    </span>
  );
}

export function MicroLabel({
  children, className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatTile({
  label, value, sub, tone = "default", className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "default" | "accent";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-suth-border-subtle bg-suth-elevated px-4 py-3",
        className,
      )}
    >
      <MicroLabel>{label}</MicroLabel>
      <div
        className={cn(
          "results-num mt-1.5 text-2xl leading-none md:text-[28px]",
          tone === "accent" ? "text-suth-accent" : "text-suth-text",
        )}
      >
        {value}
      </div>
      {sub ? (
        <div className="mt-1.5 text-xs text-suth-text-secondary">{sub}</div>
      ) : null}
    </div>
  );
}

/* ─── Status ──────────────────────────────────────────────────────── */

const STATUS_TEXT: Record<EventStatus, string> = {
  upcoming: "UPCOMING",
  live: "LIVE",
  finished: "FINAL",
};

export function StatusBadge({ status, className }: { status: EventStatus; className?: string }) {
  if (status === "live") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-pill bg-results-live/15 px-2.5 py-1",
          "font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-results-live",
          className,
        )}
      >
        <span className="results-live-dot size-1.5 rounded-full bg-results-live" aria-hidden />
        LIVE
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-1 font-mono text-[11px]",
        "font-medium uppercase tracking-[0.14em]",
        status === "upcoming"
          ? "bg-suth-accent/12 text-suth-accent"
          : "bg-suth-overlay text-suth-text-secondary",
        className,
      )}
    >
      {STATUS_TEXT[status]}
    </span>
  );
}

export function Nationality({ iso, withCode = false }: { iso: string; withCode?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="text-sm leading-none">{flagEmoji(iso)}</span>
      <span className="sr-only">{nationCode(iso)}</span>
      {withCode ? (
        <span className="results-num text-[11px] text-suth-text-tertiary">{nationCode(iso)}</span>
      ) : null}
    </span>
  );
}

/* ─── Percentile shading ──────────────────────────────────────────── */

const BAND_CLASS: Record<RankBand, string> = {
  "top-1": "results-band-top-1",
  "top-5": "results-band-top-5",
  "top-10": "results-band-top-10",
  "top-25": "results-band-top-25",
  "top-50": "results-band-top-50",
  field: "results-band-field",
};

export function bandClass(band: RankBand): string {
  return BAND_CLASS[band];
}

/* ─── Loading ─────────────────────────────────────────────────────
   Skeletons shaped like the content that is coming, never spinners. */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("results-skeleton rounded-sm", className)} aria-hidden />;
}

export function SkeletonRows({ rows = 8, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-px", className)} role="status" aria-label="Loading results">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

/* ─── Empty and error ─────────────────────────────────────────────── */

export function EmptyState({
  title, body, action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed border-suth-border px-6 py-14 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
        [ NOTHING HERE ]
      </p>
      <h3 className="mt-3 text-lg font-semibold text-suth-text">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-suth-text-secondary">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-suth-danger/30 bg-suth-danger/5 px-6 py-12 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-suth-danger">
        [ SOMETHING BROKE ]
      </p>
      <h3 className="mt-3 text-lg font-semibold text-suth-text">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-suth-text-secondary">{body}</p>
    </div>
  );
}
