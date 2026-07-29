import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Page header used at the top of every /admin/* page. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-suth-border-subtle pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
            [ {eyebrow} ]
          </p>
        ) : null}
        <h1 className="mt-2 text-2xl font-black tracking-[-0.02em] text-suth-text md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm text-suth-text-secondary md:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </header>
  );
}

/** Stat tile for overview-style dashboards. */
export function Stat({
  label,
  value,
  delta,
  hint,
  sparkline,
}: {
  label: string;
  value: string | number;
  delta?: string;
  hint?: string;
  sparkline?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-suth-border-subtle bg-suth-elevated p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          {label}
        </p>
        {sparkline ? <div className="shrink-0">{sparkline}</div> : null}
      </div>
      <p className="mt-3 text-3xl font-black tracking-[-0.02em] text-suth-text tabular-nums md:text-4xl">
        {value}
      </p>
      {delta ? (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-suth-accent">
          {delta}
        </p>
      ) : null}
      {hint ? (
        <p className="mt-2 text-xs text-suth-text-tertiary">{hint}</p>
      ) : null}
    </div>
  );
}

/** Coloured pill for statuses (trialing / paid / cancelled / etc.). */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "accent";
}) {
  const tones: Record<string, string> = {
    neutral:
      "border-suth-border-subtle bg-suth-elevated text-suth-text-secondary",
    good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    warn: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    bad: "border-red-500/30 bg-red-500/10 text-red-300",
    accent:
      "border-suth-accent/30 bg-suth-accent/10 text-suth-accent",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

/** Card surface used everywhere a section needs visual grouping. */
export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-suth-border-subtle bg-suth-elevated p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Table primitives. Keep it minimal, server-component-friendly. */
export function Table({
  headers,
  rows,
  empty = "No rows.",
}: {
  headers: ReactNode[];
  rows: ReactNode[][];
  empty?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-suth-border-subtle bg-suth-elevated/40 p-8 text-center text-sm text-suth-text-tertiary">
        {empty}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-suth-border-subtle">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-suth-elevated">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="border-b border-suth-border-subtle px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-suth-border-subtle last:border-b-0 hover:bg-suth-elevated/60"
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-4 py-3 align-top text-suth-text"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Inline error / not-yet state used when a query fails or table is missing. */
export function NoticeCard({
  title,
  body,
}: {
  title: string;
  body: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">
        [ {title} ]
      </p>
      <div className="mt-2 text-sm text-suth-text-secondary">{body}</div>
    </div>
  );
}
