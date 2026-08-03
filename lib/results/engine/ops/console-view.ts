/**
 * Console types and pure view helpers.
 *
 * Split out of `console.ts` because the admin console is a client
 * component: importing even a *type* from that module pulled its whole
 * runtime into the browser graph, and through it the engine, the demo data
 * source and `node:fs` — which failed the production build outright.
 *
 * Nothing here touches the filesystem, the database or `server-only`, so it
 * is safe on either side of the boundary.
 */

import type { EngineAlert, IngestionRun, QuarantineRow } from "../types";

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
