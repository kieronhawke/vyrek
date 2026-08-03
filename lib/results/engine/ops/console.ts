/**
 * The operator console's view model.
 *
 * Assembled here rather than in the page so it can be tested, and so the same
 * shape can feed a status endpoint later. The thesis is the site's own: a
 * timing board, not a CRM. Every number is a fact with a timestamp, and every
 * red light says what to do about it.
 *
 * The one rule that shapes the whole thing: **a component is amber when it is
 * not running for a stated reason, and red only when something is wrong.**
 * Ingestion being deliberately gated off is not a fault, and showing it as one
 * trains the operator to ignore red.
 */

import type { ResultsRepository } from "../repository";
import type { EngineAlert, EngineEvent, IngestionRun, QuarantineRow, SyncState } from "../types";
import { ingestionStatus } from "../index";
import { isSourceAuthorised } from "../fetch/fetcher";
import { hasResultsSupabaseConfig, resultsProjectRef } from "../supabase-client";
import { DEFAULT_LIVE_INTERVAL_SECONDS, clampLiveInterval, localStartLabel } from "../sync/live";

export type Health = "green" | "amber" | "red";

export type ComponentHealth = {
  key: "catalog" | "live" | "source" | "database" | "realtime";
  label: string;
  health: Health;
  detail: string;
};

export type JobStatus = {
  mode: IngestionRun["mode"];
  label: string;
  state: "idle" | "running" | "live-polling" | "error" | "paused";
  lastSuccessAt: string | null;
  lastRunAt: string | null;
  nextRunHint: string;
  rowsLastRun: number;
  requestsLastRun: number;
};

export type LivePanelRow = {
  eventSlug: string;
  eventName: string;
  localStart: string | null;
  lastUpdateAt: string | null;
  intervalSeconds: number;
  updatesPaused: boolean;
  consecutiveFailures: number;
};

export type ConsoleModel = {
  dataMode: "demo" | "live";
  ingestion: { canIngest: boolean; reason: string | null };
  components: ComponentHealth[];
  jobs: JobStatus[];
  liveEvents: LivePanelRow[];
  alerts: EngineAlert[];
  quarantine: QuarantineRow[];
  liveIntervalSeconds: number;
  identityReviews: number;
};

/** How stale a catalog sync may be before it counts as a problem. */
const CATALOG_STALE_MS = 3 * 3_600_000;

export async function buildConsoleModel(
  repo: ResultsRepository,
  now: Date = new Date(),
): Promise<ConsoleModel> {
  const [runs, syncStates, alerts, quarantine, reviews, configuredInterval] = await Promise.all([
    repo.listRuns(50),
    repo.listSyncStates(),
    repo.listAlerts({ openOnly: true, limit: 50 }),
    repo.listQuarantine({ openOnly: true, limit: 50 }),
    repo.listMergeReviews({ unresolvedOnly: true }),
    repo.getSetting<number>("live_interval_seconds"),
  ]);

  const status = ingestionStatus();
  const liveInterval = clampLiveInterval(configuredInterval ?? DEFAULT_LIVE_INTERVAL_SECONDS);

  const events = new Map<string, EngineEvent>();
  for (const event of await repo.listEvents()) {
    if (event.sourceEventId) events.set(event.sourceEventId, event);
    events.set(event.slug, event);
  }

  const liveStates = syncStates.filter((s) => s.isLive);

  return {
    dataMode: process.env.NEXT_PUBLIC_DATA_MODE === "live" ? "live" : "demo",
    ingestion: status,
    components: componentHealth({ runs, liveStates, alerts, status, now }),
    jobs: jobStatuses(runs, liveStates),
    liveEvents: liveStates.map((state) => livePanelRow(state, events, liveInterval)),
    alerts,
    quarantine,
    liveIntervalSeconds: liveInterval,
    identityReviews: reviews.length,
  };
}

function componentHealth(input: {
  runs: IngestionRun[];
  liveStates: SyncState[];
  alerts: EngineAlert[];
  status: { canIngest: boolean; reason: string | null };
  now: Date;
}): ComponentHealth[] {
  const { runs, liveStates, alerts, status, now } = input;

  const lastCatalog = runs.find((r) => r.mode === "catalog" && r.status === "ok");
  const catalogAgeMs = lastCatalog
    ? now.getTime() - new Date(lastCatalog.startedAt).getTime()
    : Infinity;

  const parserAlert = alerts.find((a) => a.kind === "parser_shape");
  const sourceAlert = alerts.find((a) => a.kind === "source_unreachable");
  const paused = liveStates.filter((s) => s.updatesPaused);

  return [
    {
      key: "catalog",
      label: "Catalog sync",
      health: !status.canIngest ? "amber" : catalogAgeMs > CATALOG_STALE_MS ? "red" : "green",
      detail: !status.canIngest
        ? "Not running — ingestion is gated off"
        : lastCatalog
          ? `Last success ${relative(lastCatalog.startedAt, now)}`
          : "Never run",
    },
    {
      key: "live",
      label: "Live poller",
      health: paused.length > 0 ? "red" : liveStates.length > 0 ? "green" : "amber",
      detail:
        paused.length > 0
          ? `${paused.length} event${paused.length === 1 ? "" : "s"} paused — source not responding`
          : liveStates.length > 0
            ? `${liveStates.length} event${liveStates.length === 1 ? "" : "s"} armed`
            : "No events armed",
    },
    {
      key: "source",
      label: "Source reachability",
      // Amber, not red: the source is refusing us by policy, which is a
      // decision waiting on a person, not a fault waiting on a retry.
      health: !isSourceAuthorised() ? "amber" : parserAlert ? "red" : sourceAlert ? "red" : "green",
      detail: !isSourceAuthorised()
        ? "Access not authorised (robots.txt Disallow: /) — see SOURCE.md §1"
        : parserAlert
          ? parserAlert.message
          : sourceAlert
            ? sourceAlert.message
            : "Reachable",
    },
    {
      key: "database",
      label: "Database",
      health: hasResultsSupabaseConfig() ? "green" : "amber",
      detail: hasResultsSupabaseConfig()
        ? `Configured — project ${resultsProjectRef() ?? "unknown"}`
        : "Not configured — serving from the in-memory store",
    },
    {
      key: "realtime",
      label: "Realtime fan-out",
      health: liveStates.length > 0 ? "green" : "amber",
      detail:
        liveStates.length > 0
          ? "Publishing to per-event channels"
          : "Idle — nothing live to publish",
    },
  ];
}

function jobStatuses(runs: IngestionRun[], liveStates: SyncState[]): JobStatus[] {
  const specs: { mode: IngestionRun["mode"]; label: string; hint: string }[] = [
    { mode: "catalog", label: "Catalog sync", hint: "Hourly, at 17 past" },
    { mode: "live", label: "Live poller", hint: "Every minute; polls what is due" },
    { mode: "reconcile", label: "Post-race reconcile", hint: "Every 6 hours" },
    { mode: "backfill", label: "Backfill", hint: "Every 20 minutes, 2 events per run" },
  ];

  return specs.map((spec) => {
    const forMode = runs.filter((r) => r.mode === spec.mode);
    const latest = forMode[0] ?? null;
    const lastSuccess = forMode.find((r) => r.status === "ok") ?? null;

    let state: JobStatus["state"] = "idle";
    if (latest?.status === "running") state = "running";
    else if (latest?.status === "error") state = "error";
    if (spec.mode === "live" && liveStates.some((s) => s.isLive && !s.updatesPaused)) {
      state = "live-polling";
    }
    if (spec.mode === "live" && liveStates.some((s) => s.updatesPaused)) state = "paused";

    return {
      mode: spec.mode,
      label: spec.label,
      state,
      lastSuccessAt: lastSuccess?.startedAt ?? null,
      lastRunAt: latest?.startedAt ?? null,
      nextRunHint: spec.hint,
      rowsLastRun: latest?.rowsUpserted ?? 0,
      requestsLastRun: latest?.requestsMade ?? 0,
    };
  });
}

function livePanelRow(
  state: SyncState,
  events: Map<string, EngineEvent>,
  fallbackInterval: number,
): LivePanelRow {
  const event = events.get(state.sourceEventId);
  return {
    eventSlug: event?.slug ?? state.sourceEventId,
    eventName: event?.name ?? state.sourceEventId,
    localStart: event ? localStartLabel(event) : null,
    lastUpdateAt: state.lastSuccessAt ?? state.lastPolledAt ?? null,
    intervalSeconds: state.liveIntervalSeconds || fallbackInterval,
    updatesPaused: state.updatesPaused,
    consecutiveFailures: state.consecutiveFailures,
  };
}

/** "14s ago". The console's only unit of time. */
export function relative(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "never";
  const deltaMs = now.getTime() - new Date(iso).getTime();
  if (deltaMs < 0) return "just now";
  const seconds = Math.floor(deltaMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Copy-for-fix.
 *
 * One block that carries everything a developer or an assistant needs to act:
 * what broke, where, with which identifiers, and the raw payload. A first-class
 * feature, because the alternative is an operator screenshotting a red row and
 * the context being gone by the time anyone looks (brief §12).
 */
export function copyForFix(input: {
  kind: "alert" | "quarantine";
  alert?: EngineAlert;
  row?: QuarantineRow;
}): string {
  const lines: string[] = [];
  lines.push("# Suth Performance — results engine issue report");
  lines.push("");

  if (input.kind === "alert" && input.alert) {
    const a = input.alert;
    lines.push(`**Type:** alert / ${a.kind}`);
    lines.push(`**Severity:** ${a.severity}`);
    lines.push(`**Raised:** ${a.createdAt}`);
    lines.push(`**Source event:** ${a.sourceEventId ?? "—"}`);
    lines.push("");
    lines.push("## Message");
    lines.push(a.message);
    lines.push("");
    lines.push("## Detail");
    lines.push("```json");
    lines.push(JSON.stringify(a.detail, null, 2));
    lines.push("```");
  }

  if (input.kind === "quarantine" && input.row) {
    const r = input.row;
    lines.push(`**Type:** quarantined row`);
    lines.push(`**Reason:** ${r.reason}`);
    lines.push(`**Created:** ${r.createdAt}`);
    lines.push(`**Event:** ${r.sourceEventId ?? "—"}`);
    lines.push(`**Division:** ${r.sourceDivisionId ?? "—"}`);
    lines.push(`**Result:** ${r.sourceResultId ?? "—"}`);
    lines.push("");
    lines.push("## Validation detail");
    lines.push("```json");
    lines.push(JSON.stringify(r.detail, null, 2));
    lines.push("```");
    lines.push("");
    lines.push("## Raw payload as parsed");
    lines.push("```json");
    lines.push(JSON.stringify(r.rawPayload, null, 2));
    lines.push("```");
  }

  lines.push("");
  lines.push("## Where to look");
  lines.push("- Parser: `lib/results/engine/source/mika-parse.ts`");
  lines.push("- Normaliser: `lib/results/engine/normalise/normaliser.ts`");
  lines.push("- Validation bounds: `lib/results/engine/validate/validate.ts`");
  lines.push("- Source notes: `docs/results/SOURCE.md`");
  return lines.join("\n");
}
