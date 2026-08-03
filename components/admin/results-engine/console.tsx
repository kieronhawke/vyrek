"use client";

import { useState, useTransition } from "react";
import type { ConsoleModel } from "@/lib/results/engine/ops/console";
import { relative } from "@/lib/results/engine/ops/relative";
import { MIN_LIVE_INTERVAL_SECONDS } from "@/lib/results/engine/sync/live";

/**
 * Operator Mode for the results engine.
 *
 * A status console, not a CRM: tabular mono numbers, a status lamp per
 * component, and every control one click from the thing it acts on. Destructive
 * or source-touching actions confirm first, because "force sync" during a live
 * race is a real request to a third party.
 *
 * Copy-for-fix is a first-class button on every error and every quarantined
 * row. The alternative is an operator screenshotting a red line and the context
 * being gone by the time anyone can act on it.
 */

const LAMP: Record<string, string> = {
  green: "bg-suth-accent",
  amber: "bg-amber-400",
  red: "bg-red-500",
};

type Props = { model: ConsoleModel; copyBlocks: Record<string, string> };

export function ResultsEngineConsole({ model, copyBlocks }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [interval, setIntervalSeconds] = useState(model.liveIntervalSeconds);
  const [copied, setCopied] = useState<string | null>(null);

  async function act(payload: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setMessage(null);
    const response = await fetch("/api/admin/results-engine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    setMessage(response.ok ? "Done." : (body.error ?? "Failed."));
    if (response.ok) startTransition(() => window.location.reload());
  }

  async function copy(key: string) {
    await navigator.clipboard.writeText(copyBlocks[key] ?? "");
    setCopied(key);
    window.setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
            [ RESULTS ENGINE ]
          </h1>
          <p className="mt-1 text-sm text-suth-text-secondary">
            Ingestion, live polling and data health.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-suth-text-tertiary">
            Serving
          </span>
          <span
            className={`font-mono text-[11px] uppercase tracking-[0.2em] px-2 py-1 border ${
              model.dataMode === "live"
                ? "border-suth-accent text-suth-accent"
                : "border-suth-border-subtle text-suth-text-tertiary"
            }`}
          >
            {model.dataMode} data
          </span>
        </div>
      </header>

      {!model.ingestion.canIngest && (
        <div className="border border-amber-400/40 bg-amber-400/5 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400">
            Ingestion paused
          </p>
          <p className="mt-2 text-sm text-suth-text-secondary">{model.ingestion.reason}</p>
        </div>
      )}

      {message && (
        <p className="font-mono text-xs text-suth-text-secondary" role="status">
          {message}
        </p>
      )}

      {/* Component health */}
      <section>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Component health
        </h2>
        <ul className="mt-3 divide-y divide-suth-border-subtle border-y border-suth-border-subtle">
          {model.components.map((component) => (
            <li key={component.key} className="flex items-start gap-3 py-3">
              <span
                aria-hidden
                className={`mt-1.5 size-2 rounded-full ${LAMP[component.health]}`}
              />
              <span className="sr-only">{component.health}</span>
              <span className="w-44 shrink-0 text-sm text-suth-text">{component.label}</span>
              <span className="text-sm text-suth-text-secondary">{component.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Jobs */}
      <section>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Jobs
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-suth-border-subtle text-left">
                <th className="py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-suth-text-tertiary">Job</th>
                <th className="py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-suth-text-tertiary">State</th>
                <th className="py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-suth-text-tertiary">Last success</th>
                <th className="py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-suth-text-tertiary tabular-nums">Rows</th>
                <th className="py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-suth-text-tertiary tabular-nums">Requests</th>
                <th className="py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-suth-text-tertiary">Next</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-suth-border-subtle">
              {model.jobs.map((job) => (
                <tr key={job.mode}>
                  <td className="py-3 text-suth-text">{job.label}</td>
                  <td className="py-3 font-mono text-xs text-suth-text-secondary">{job.state}</td>
                  <td className="py-3 font-mono text-xs tabular-nums text-suth-text-secondary">
                    {relative(job.lastSuccessAt)}
                  </td>
                  <td className="py-3 font-mono text-xs tabular-nums text-suth-text-secondary">
                    {job.rowsLastRun}
                  </td>
                  <td className="py-3 font-mono text-xs tabular-nums text-suth-text-secondary">
                    {job.requestsLastRun}
                  </td>
                  <td className="py-3 text-xs text-suth-text-tertiary">{job.nextRunHint}</td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        act(
                          { action: "run-job", mode: job.mode },
                          `Run ${job.label} now? This contacts the source.`,
                        )
                      }
                      className="font-mono text-[10px] uppercase tracking-[0.2em] text-suth-accent hover:underline disabled:opacity-40"
                    >
                      Run now
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Live events */}
      <section>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Live events
        </h2>
        {model.liveEvents.length === 0 ? (
          <p className="mt-3 text-sm text-suth-text-tertiary">Nothing armed.</p>
        ) : (
          <ul className="mt-3 divide-y divide-suth-border-subtle border-y border-suth-border-subtle">
            {model.liveEvents.map((event) => (
              <li key={event.eventSlug} className="flex flex-wrap items-center gap-4 py-3">
                <span className="w-56 text-sm text-suth-text">{event.eventName}</span>
                <span className="font-mono text-xs tabular-nums text-suth-text-secondary">
                  updated {relative(event.lastUpdateAt)}
                </span>
                <span className="font-mono text-xs tabular-nums text-suth-text-tertiary">
                  {event.intervalSeconds}s interval
                </span>
                {event.localStart && (
                  <span className="font-mono text-xs tabular-nums text-suth-text-tertiary">
                    local start {event.localStart}
                  </span>
                )}
                {event.updatesPaused && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-500">
                    updates paused
                  </span>
                )}
                <span className="ml-auto flex gap-4">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      act(
                        { action: "force-sync", eventSlug: event.eventSlug },
                        `Force a full re-sync of ${event.eventName}? This refetches every division from the source.`,
                      )
                    }
                    className="font-mono text-[10px] uppercase tracking-[0.2em] text-suth-accent hover:underline disabled:opacity-40"
                  >
                    Force sync
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      act(
                        { action: "disarm-live", eventSlug: event.eventSlug },
                        `Disarm live polling for ${event.eventName}? The board stops updating.`,
                      )
                    }
                    className="font-mono text-[10px] uppercase tracking-[0.2em] text-suth-text-secondary hover:underline disabled:opacity-40"
                  >
                    Disarm
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Live interval */}
      <section>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Live refresh interval
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <input
            type="number"
            min={MIN_LIVE_INTERVAL_SECONDS}
            max={300}
            value={interval}
            onChange={(e) => setIntervalSeconds(Number(e.target.value))}
            aria-label="Live refresh interval in seconds"
            className="w-24 border border-suth-border-subtle bg-transparent px-3 py-2 font-mono text-sm tabular-nums text-suth-text"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => act({ action: "set-interval", seconds: interval })}
            className="border border-suth-accent px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-suth-accent disabled:opacity-40"
          >
            Save
          </button>
          <p className="text-xs text-suth-text-tertiary">
            Floor is {MIN_LIVE_INTERVAL_SECONDS}s, enforced server-side. The floor exists so the
            fetcher cannot be tuned into getting us blocked.
          </p>
        </div>
      </section>

      {/* Alerts */}
      <section>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Open alerts ({model.alerts.length})
        </h2>
        {model.alerts.length === 0 ? (
          <p className="mt-3 text-sm text-suth-text-tertiary">Nothing outstanding.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {model.alerts.map((alert) => (
              <li key={alert.id} className="border border-suth-border-subtle p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.2em] ${
                      alert.severity === "critical" ? "text-red-500" : "text-amber-400"
                    }`}
                  >
                    {alert.kind}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-suth-text-tertiary">
                    {relative(alert.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-suth-text">{alert.message}</p>
                <div className="mt-3 flex gap-4">
                  <button
                    type="button"
                    onClick={() => copy(`alert:${alert.id}`)}
                    className="font-mono text-[10px] uppercase tracking-[0.2em] text-suth-accent hover:underline"
                  >
                    {copied === `alert:${alert.id}` ? "Copied" : "Copy report"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => act({ action: "acknowledge-alert", id: alert.id })}
                    className="font-mono text-[10px] uppercase tracking-[0.2em] text-suth-text-secondary hover:underline disabled:opacity-40"
                  >
                    Acknowledge
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Quarantine */}
      <section>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Quarantined rows ({model.quarantine.length})
        </h2>
        {model.quarantine.length === 0 ? (
          <p className="mt-3 text-sm text-suth-text-tertiary">Nothing quarantined.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {model.quarantine.map((row) => (
              <li key={row.id} className="border border-suth-border-subtle p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400">
                    {row.reason}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-suth-text-tertiary">
                    {relative(row.createdAt)}
                  </span>
                  <span className="font-mono text-xs text-suth-text-tertiary">
                    {row.sourceDivisionId ?? "—"} · {row.sourceResultId ?? "—"}
                  </span>
                </div>
                <div className="mt-3 flex gap-4">
                  <button
                    type="button"
                    onClick={() => copy(`quarantine:${row.id}`)}
                    className="font-mono text-[10px] uppercase tracking-[0.2em] text-suth-accent hover:underline"
                  >
                    {copied === `quarantine:${row.id}` ? "Copied" : "Copy report"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      act(
                        { action: "reprocess-quarantine", id: row.id },
                        "Reprocess this row? It will be re-validated on the next sync.",
                      )
                    }
                    className="font-mono text-[10px] uppercase tracking-[0.2em] text-suth-text-secondary hover:underline disabled:opacity-40"
                  >
                    Reprocess
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {model.identityReviews > 0 && (
        <section>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
            Athlete identity
          </h2>
          <p className="mt-3 text-sm text-suth-text-secondary">
            {model.identityReviews} uncertain match
            {model.identityReviews === 1 ? "" : "es"} waiting on a human. These are people who
            might be the same person; nothing is merged automatically.
          </p>
        </section>
      )}
    </div>
  );
}
