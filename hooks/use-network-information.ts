"use client";

import { useSyncExternalStore } from "react";

type Connection = {
  saveData?: boolean;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  addEventListener?: (type: "change", cb: () => void) => void;
  removeEventListener?: (type: "change", cb: () => void) => void;
};

function getConnection(): Connection | undefined {
  const nav = navigator as Navigator & { connection?: Connection };
  return nav.connection;
}

function readServe(): boolean {
  const conn = getConnection();
  if (!conn) return true;
  const slow =
    conn.saveData === true ||
    conn.effectiveType === "slow-2g" ||
    conn.effectiveType === "2g";
  return !slow;
}

/**
 * Tells callers whether to skip heavy assets (hero video, autoplaying media).
 * SSR-safe, defaults to "serve" until we know otherwise so the markup is
 * deterministic; the hook upgrades on the client via `useSyncExternalStore`.
 */
export function useShouldServeHeavyAssets(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const conn = getConnection();
      if (!conn?.addEventListener) return () => {};
      conn.addEventListener("change", cb);
      return () => conn.removeEventListener?.("change", cb);
    },
    readServe,
    () => true,
  );
}
