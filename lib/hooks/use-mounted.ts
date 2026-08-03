"use client";

import { useSyncExternalStore } from "react";

/**
 * False on the server and during hydration, true from the first client render
 * after it.
 *
 * For components whose output legitimately differs between server and browser
 * — anything gated on IndexedDB, MediaRecorder, or a stored preference. React
 * treats that difference as a hydration mismatch and throws away the *whole*
 * server tree, taking any client state set before that point with it. That is
 * not a warning you can live with: it silently reverted every edit made in the
 * plan builder before hydration finished.
 *
 * useSyncExternalStore rather than `useState` + `useEffect`, because setting
 * state synchronously inside an effect cascades renders — the pattern this
 * repo lints against, and the reason lib/control/store.ts is built the same
 * way. The store here never changes, so `subscribe` has nothing to do.
 */
const noop = () => () => {};
const onClient = () => true;
const onServer = () => false;

export function useMounted(): boolean {
  return useSyncExternalStore(noop, onClient, onServer);
}
