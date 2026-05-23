"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const SESSION_KEY = "vyrek:presence:sid";
const HEARTBEAT_MS = 30_000;

function sid(): string {
  if (typeof window === "undefined") return "";
  let v = sessionStorage.getItem(SESSION_KEY);
  if (v) return v;
  v = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  sessionStorage.setItem(SESSION_KEY, v);
  return v;
}

/**
 * Lightweight presence beacon. Mounts once in the root layout and:
 * - pings /api/presence/ping on mount + on every pathname change
 * - keeps pinging every 30s while the tab is visible
 * - pauses while the tab is hidden (saves ~70% of pings, matches what
 *   real users care about — they're not actively on the site)
 * - sends a beacon DELETE on pagehide so the count drops immediately
 *
 * Renders nothing. Failures are silent — presence is not load-bearing.
 */
export function PresencePing() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const intervalRef = useRef<number | null>(null);

  pathRef.current = pathname;

  useEffect(() => {
    const s = sid();
    if (!s) return;

    const ping = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState !== "visible") return;
      // fetch with keepalive so it survives page navigations
      fetch("/api/presence/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sid: s, path: pathRef.current || "/" }),
        keepalive: true,
        credentials: "same-origin",
      }).catch(() => {});
    };

    ping();
    intervalRef.current = window.setInterval(ping, HEARTBEAT_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") ping();
    };
    const onPageHide = () => {
      const url = `/api/presence/ping?sid=${encodeURIComponent(s)}`;
      // sendBeacon is POST-only; use fetch+keepalive for our DELETE.
      fetch(url, { method: "DELETE", keepalive: true }).catch(() => {});
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  // Pathname change = an additional immediate ping so the new path
  // shows up on /admin/live without waiting for the heartbeat tick.
  useEffect(() => {
    const s = sid();
    if (!s) return;
    fetch("/api/presence/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sid: s, path: pathname || "/" }),
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {});
  }, [pathname]);

  return null;
}
