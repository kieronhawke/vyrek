/**
 * Dead-man's switch.
 *
 * Error tracking catches the sync that *ran and threw*. Nothing catches the
 * sync that stopped running — a cron that was disabled, a deploy that dropped
 * the schedule, a queue that quietly emptied. That failure is invisible from
 * the inside, because from the inside nothing happened at all.
 *
 * So the check is inverted and lives outside our infrastructure: every
 * successful run pings an external monitor, and the monitor alerts when the
 * ping does not arrive. Silence becomes the alarm (brief §10).
 *
 * Free tier of any of cron-job.org, Better Stack or UptimeRobot is fine. Set
 * `HEARTBEAT_URL_CATALOG`; unset simply no-ops, so local and CI runs are quiet.
 */

export type HeartbeatJob = "catalog" | "live" | "backfill" | "reconcile";

const ENV_KEYS: Record<HeartbeatJob, string> = {
  catalog: "HEARTBEAT_URL_CATALOG",
  live: "HEARTBEAT_URL_LIVE",
  backfill: "HEARTBEAT_URL_BACKFILL",
  reconcile: "HEARTBEAT_URL_RECONCILE",
};

export type HeartbeatDeps = {
  fetchImpl?: (url: string, init?: unknown) => Promise<{ ok: boolean; status: number }>;
  env?: Record<string, string | undefined>;
};

/**
 * Never throws. A monitor being down must not fail an otherwise good sync —
 * that would turn an observability outage into a data outage.
 */
export async function pingHeartbeat(
  job: HeartbeatJob,
  deps: HeartbeatDeps = {},
): Promise<{ pinged: boolean; reason?: string }> {
  const env = deps.env ?? process.env;
  const url = env[ENV_KEYS[job]];
  if (!url) return { pinged: false, reason: "no heartbeat url configured" };

  const doFetch =
    deps.fetchImpl ??
    ((u: string) => fetch(u, { method: "GET" }) as unknown as Promise<{ ok: boolean; status: number }>);

  try {
    const response = await doFetch(url);
    return response.ok
      ? { pinged: true }
      : { pinged: false, reason: `monitor returned ${response.status}` };
  } catch (error) {
    return { pinged: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
