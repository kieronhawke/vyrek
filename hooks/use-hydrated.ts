"use client";

import { useSyncExternalStore } from "react";

/**
 * "HAS THIS COMPONENT HYDRATED YET?"
 *
 * The pattern this replaces appeared four times in the codebase, each written
 * slightly differently, each tripping the repo's cascading-render lint rule:
 *
 *     const [mounted, setMounted] = useState(false);
 *     useEffect(() => setMounted(true), []);
 *
 * It works, and it is the answer most people reach for, but it costs every
 * instance a second render of its whole subtree immediately after hydration.
 * On the member walkthrough that is a full-screen dialog; on the blog checklist
 * it is every list on the page.
 *
 * `useSyncExternalStore` expresses the same thing without the extra render.
 * The server snapshot is `false` and the client snapshot is `true`, so React
 * renders the server value during hydration — matching the HTML exactly, which
 * is the whole point of the flag — and switches afterwards without a state
 * update. The store never notifies, because hydration happens once.
 *
 * ── WHAT IT IS FOR ─────────────────────────────────────────────────────
 *
 * Deferring anything that depends on browser-only state: `localStorage`,
 * `sessionStorage`, `matchMedia`, anything read from `window`. Render the
 * server-safe version until this returns true, then render the real one.
 *
 * ── WHAT IT IS NOT FOR ─────────────────────────────────────────────────
 *
 * Values that change over time. A media query needs its own subscription so it
 * updates when the viewport does; this only ever flips once.
 */

/** Hydration happens once, so there is nothing to subscribe to. */
function subscribe(): () => void {
  return () => {};
}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/**
 * Read a JSON value out of web storage once, safely.
 *
 * Every caller of this was writing the same six lines: a try/catch, a
 * `JSON.parse`, and a fallback for private mode. Storage is also user-writable
 * and survives deploys, so a value that no longer parses has to degrade to the
 * fallback rather than throw during render.
 *
 * Intended for a `useState` lazy initialiser. Returns the fallback on the
 * server, which means the initial client render matches the server HTML only
 * if the component is also gated on `useHydrated()` — do both.
 */
export function readStored<T>(
  key: string,
  fallback: T,
  storage: "local" | "session" = "local",
): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = (storage === "local" ? window.localStorage : window.sessionStorage)
      .getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
