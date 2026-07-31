"use client";

import { useEffect } from "react";

/**
 * Registers the Train service worker, scoped to /train only.
 *
 * spec/11 §9 requires full offline capability for workout logging. The
 * queue survives in IndexedDB regardless, but without a cached shell the
 * app cannot be *opened* offline to reach it.
 */
export function RegisterTrainSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/train-sw.js", { scope: "/train" })
      .catch(() => {
        // Unsupported or blocked (private mode, insecure origin). The app
        // still works online, and the queue is still durable.
      });
  }, []);
  return null;
}
