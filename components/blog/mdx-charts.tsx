"use client";

/**
 * Data-visualisation blocks for blog MDX.
 *
 * Palette note: the site surface is dark (#141414 elevated). The categorical
 * slots below were validated with the dataviz validator against that surface
 * (lightness band, chroma floor, CVD separation, normal-vision floor,
 * contrast) and all five checks pass. Adjacent tritan ΔE is 7.1, inside the
 * 6–8 floor band, which is legal ONLY with secondary encoding — so every
 * categorical chart here ships direct labels AND a 2px surface gap. Do not
 * add a fifth slot without re-running the validator.
 *
 * Mark specs are fixed: bars cap at 24px, 4px rounded data-end square at the
 * baseline, hairline solid gridlines, no number on every point, and text
 * always wears text tokens rather than the series colour.
 *
 *   <BarChart>      magnitude comparison; `emphasis` highlights one bar
 *   <StatTile>      a single number that is the whole story
 *   <Meter>         one ratio against a limit
 *   <Breakdown>     labelled component breakdown with a total
 *   <Checklist>     tickable list, persists per post in localStorage
 */

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useHydrated, readStored } from "@/hooks/use-hydrated";

/** Referentially stable so it never invalidates a memo downstream. */
const EMPTY_TICKS: Record<string, boolean> = Object.freeze({});

// Validated categorical slots. Assign in fixed order, never cycle.
export const SERIES = ["#65A30D", "#0284C7", "#EA580C", "#7C3AED"] as const;
const ACCENT = "#A3E635"; // brand accent — emphasis + single-series only
const MUTED = "#3D3D3D"; // de-emphasis gray

function fmt(n: number, unit?: string) {
  const s = Number.isInteger(n) ? n.toLocaleString("en-GB") : n.toFixed(1);
  return unit ? `${s}${unit}` : s;
}

// ─────────────────────────────────────────────────────────────
// BarChart — horizontal magnitude comparison
// ─────────────────────────────────────────────────────────────

export type Bar = { label: string; value: number; note?: string };

export function BarChart({
  title,
  caption,
  data,
  unit = "",
  emphasis,
  source,
}: {
  title: string;
  caption?: string;
  data: Bar[];
  unit?: string;
  /** Label of the bar to highlight; all others recede to gray. */
  emphasis?: string;
  source?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  const rows = Array.isArray(data) ? data.filter((d) => d && typeof d.value === "number") : [];
  const max = useMemo(() => Math.max(...rows.map((r) => r.value), 0), [rows]);
  const tableId = useId();
  if (!rows.length || max <= 0) return null;

  return (
    <figure className="mt-10 overflow-hidden rounded-lg border border-suth-border-subtle bg-suth-elevated">
      <figcaption className="border-b border-suth-border-subtle px-5 py-4 md:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
          [ BREAKDOWN ]
        </p>
        <p className="mt-1 text-base font-bold text-suth-text md:text-lg">{title}</p>
        {caption ? (
          <p className="mt-1 text-sm leading-relaxed text-suth-text-secondary">{caption}</p>
        ) : null}
      </figcaption>

      {/* Bars. Grid of label / track so bars share one baseline. */}
      <div className="px-5 py-5 md:px-6">
        <ul className="flex flex-col gap-3">
          {rows.map((r) => {
            const pct = Math.max((r.value / max) * 100, 1.5);
            const on = !emphasis || r.label === emphasis;
            return (
              // Mobile stacks label above the bar so long labels are never
              // truncated and bars get the full width; from `sm` the label
              // moves into its own column.
              <li
                key={r.label}
                className="sm:grid sm:grid-cols-[minmax(0,11rem)_1fr] sm:items-center sm:gap-x-3 sm:gap-y-1"
              >
                <span className="block text-[13px] font-medium text-suth-text-secondary sm:min-w-0 sm:truncate">
                  {r.label}
                </span>
                <div className="mt-1.5 flex min-w-0 items-center gap-2.5 sm:mt-0">
                  {/* Track. Bar height capped at 24px per mark spec. */}
                  <div className="h-[18px] min-w-0 flex-1 rounded-[2px] bg-suth-overlay">
                    <div
                      className="h-full rounded-r-[4px] transition-[width] duration-500 motion-reduce:transition-none"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: on ? (emphasis ? ACCENT : SERIES[0]) : MUTED,
                      }}
                    />
                  </div>
                  {/* Direct label at the tip — mandated secondary encoding. */}
                  <span className="shrink-0 font-mono text-[13px] font-bold tabular-nums text-suth-text">
                    {fmt(r.value, unit)}
                  </span>
                </div>
                {r.note ? (
                  <span className="mt-1 block text-xs leading-relaxed text-suth-text-tertiary sm:col-start-2 sm:mt-0">
                    {r.note}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-suth-border-subtle px-5 py-3 md:px-6">
        {source ? (
          <p className="text-xs text-suth-text-tertiary">Source: {source}</p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          aria-controls={tableId}
          className="rounded-sm text-xs font-medium text-suth-text-secondary underline decoration-suth-border-strong underline-offset-4 transition-colors hover:text-suth-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
        >
          {showTable ? "Hide data table" : "View as table"}
        </button>
      </div>

      {showTable ? (
        <div id={tableId} className="overflow-x-auto border-t border-suth-border-subtle">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{title} — data table</caption>
            <thead>
              <tr className="border-b border-suth-border-subtle">
                <th scope="col" className="px-5 py-2.5 font-semibold text-suth-text-secondary md:px-6">
                  Item
                </th>
                <th scope="col" className="px-5 py-2.5 text-right font-semibold text-suth-text-secondary md:px-6">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-suth-border-subtle last:border-0">
                  <th scope="row" className="px-5 py-2.5 font-normal text-suth-text md:px-6">
                    {r.label}
                  </th>
                  <td className="px-5 py-2.5 text-right font-mono tabular-nums text-suth-text md:px-6">
                    {fmt(r.value, unit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// StatTile — the number IS the chart
// ─────────────────────────────────────────────────────────────

export function StatTile({
  value,
  label,
  context,
  source,
}: {
  value: string;
  label: string;
  context?: string;
  source?: string;
}) {
  return (
    <figure className="mt-10 rounded-lg border border-suth-border-subtle bg-suth-elevated px-5 py-6 md:px-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
        [ THE NUMBER ]
      </p>
      <p className="mt-3 text-[44px] font-black leading-none tracking-[-0.03em] text-suth-text md:text-[56px]">
        {value}
      </p>
      <figcaption className="mt-2">
        <p className="text-base font-bold text-suth-text">{label}</p>
        {context ? (
          <p className="mt-1.5 text-sm leading-relaxed text-suth-text-secondary">{context}</p>
        ) : null}
        {source ? (
          <p className="mt-2 text-xs text-suth-text-tertiary">Source: {source}</p>
        ) : null}
      </figcaption>
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// Meter — one ratio against a limit
// ─────────────────────────────────────────────────────────────

export function Meter({
  label,
  value,
  max,
  unit = "",
  note,
}: {
  label: string;
  value: number;
  max: number;
  unit?: string;
  note?: string;
}) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div className="mt-8 rounded-lg border border-suth-border-subtle bg-suth-elevated px-5 py-4 md:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-suth-text">{label}</p>
        <p className="font-mono text-sm font-bold tabular-nums text-suth-text">
          {fmt(value, unit)} <span className="text-suth-text-tertiary">/ {fmt(max, unit)}</span>
        </p>
      </div>
      <div
        className="mt-3 h-[10px] w-full overflow-hidden rounded-[2px] bg-suth-overlay"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className="h-full rounded-r-[4px]"
          style={{ width: `${pct}%`, backgroundColor: ACCENT }}
        />
      </div>
      {note ? (
        <p className="mt-2 text-xs leading-relaxed text-suth-text-tertiary">{note}</p>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Breakdown — labelled components with a total
// ─────────────────────────────────────────────────────────────

export function Breakdown({
  title,
  items,
  total,
  totalLabel = "Total",
  footnote,
}: {
  title: string;
  items: { label: string; value: string; detail?: string }[];
  total?: string;
  totalLabel?: string;
  footnote?: string;
}) {
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) return null;
  return (
    <figure className="mt-10 overflow-hidden rounded-lg border border-suth-border-subtle bg-suth-elevated">
      <figcaption className="border-b border-suth-border-subtle px-5 py-4 md:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
          [ BREAKDOWN ]
        </p>
        <p className="mt-1 text-base font-bold text-suth-text md:text-lg">{title}</p>
      </figcaption>
      <dl className="divide-y divide-suth-border-subtle">
        {rows.map((it) => (
          <div key={it.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3 md:px-6">
            <dt className="min-w-0 flex-1 text-sm text-suth-text">
              {it.label}
              {it.detail ? (
                <span className="mt-0.5 block text-xs leading-relaxed text-suth-text-tertiary">
                  {it.detail}
                </span>
              ) : null}
            </dt>
            <dd className="shrink-0 font-mono text-sm font-bold tabular-nums text-suth-text">
              {it.value}
            </dd>
          </div>
        ))}
      </dl>
      {total ? (
        <div className="flex items-baseline justify-between gap-4 border-t border-suth-border-default bg-suth-overlay px-5 py-3.5 md:px-6">
          <p className="text-sm font-bold uppercase tracking-wide text-suth-text">{totalLabel}</p>
          <p className="font-mono text-lg font-black tabular-nums text-suth-accent">{total}</p>
        </div>
      ) : null}
      {footnote ? (
        <p className="border-t border-suth-border-subtle px-5 py-3 text-xs leading-relaxed text-suth-text-tertiary md:px-6">
          {footnote}
        </p>
      ) : null}
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// Checklist — tickable, persists per post
// ─────────────────────────────────────────────────────────────

export function Checklist({
  title,
  items,
  storageKey,
}: {
  title: string;
  items: string[];
  storageKey?: string;
}) {
  const rows = Array.isArray(items) ? items : [];
  const key = storageKey ? `suth:checklist:${storageKey}` : null;
  /*
   * Ticked items are read out of storage as the initial state rather than
   * through an effect that then calls `setDone` and `setReady`.
   *
   * The effect version cost two synchronous state updates on mount, and a long
   * post can carry several of these lists — so a reader paid a re-render of
   * every checklist on the page immediately after hydration, and watched their
   * own ticks appear a frame late.
   *
   * `useHydrated` covers the SSR half: `readStored` returns `{}` on the server,
   * and nothing renders as ticked until hydration, so the first client render
   * still matches the server HTML.
   */
  const ready = useHydrated();
  const [doneState, setDone] = useState<Record<string, boolean>>(() =>
    key ? readStored<Record<string, boolean>>(key, {}) : {},
  );

  /*
   * ⚠️ Nothing is ticked until hydration is finished.
   *
   * The state initialiser runs during the hydration render as well, so a
   * stored tick would have rendered a checked box against server HTML that
   * said unchecked — a React #418 mismatch. Rendering the server's view for
   * that one pass and the real ticks straight after avoids it, and still
   * costs no extra render because `useHydrated` is a store read rather than
   * a state update.
   */
  const done = ready ? doneState : EMPTY_TICKS;

  const toggle = useCallback(
    (item: string) => {
      setDone((prev) => {
        const next = { ...prev, [item]: !prev[item] };
        if (key) {
          try {
            window.localStorage.setItem(key, JSON.stringify(next));
          } catch {
            /* ignore quota / private mode */
          }
        }
        return next;
      });
    },
    [key],
  );

  if (!rows.length) return null;
  const count = rows.filter((r) => done[r]).length;

  return (
    <div className="mt-10 overflow-hidden rounded-lg border border-suth-border-subtle bg-suth-elevated">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-suth-border-subtle px-5 py-4 md:px-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
            [ CHECKLIST ]
          </p>
          <p className="mt-1 text-base font-bold text-suth-text md:text-lg">{title}</p>
        </div>
        <p className="font-mono text-sm tabular-nums text-suth-text-secondary">
          {ready ? `${count}/${rows.length}` : `${rows.length} items`}
        </p>
      </div>
      <ul className="divide-y divide-suth-border-subtle">
        {rows.map((item) => (
          <li key={item}>
            <label className="flex cursor-pointer items-start gap-3 px-5 py-3 transition-colors hover:bg-suth-overlay md:px-6">
              <input
                type="checkbox"
                checked={Boolean(done[item])}
                onChange={() => toggle(item)}
                className="mt-0.5 size-[18px] shrink-0 cursor-pointer accent-suth-accent"
              />
              <span
                className={
                  done[item]
                    ? "text-sm leading-relaxed text-suth-text-tertiary line-through"
                    : "text-sm leading-relaxed text-suth-text"
                }
              >
                {item}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="border-t border-suth-border-subtle px-5 py-2.5 text-xs text-suth-text-tertiary md:px-6">
        Ticks save on this device only.
      </p>
    </div>
  );
}
