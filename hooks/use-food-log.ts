"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { isoDate, type LoggedFood } from "@/lib/member/food";

/**
 * WHERE THE FOOD LOG ACTUALLY LIVES.
 *
 * The old component held its entries in `useState`, so everything typed in
 * vanished on the next navigation. Persisting it is the whole fix.
 *
 * ── WHY LOCAL STORAGE, AND WHAT THAT COSTS ──────────────────────────────
 * This should end up on the account — Ben needs to see what an athlete is
 * eating, and that is the point of logging it inside a coaching app rather
 * than in MyFitnessPal. But member writes need a Supabase session, and
 * onboarding does not currently create one, so a server-backed version would
 * mean touching the sign-in/email path that is explicitly not mine to touch.
 *
 * So: local first, with the storage shape already matching what a row would
 * look like. Swapping the two `read`/`write` calls for `fetch` is the entire
 * migration. Nothing above this hook needs to know.
 *
 * The real cost is honest and worth stating: the log lives on one device and
 * one browser. Clearing site data loses it. That is a genuine limitation, not
 * a detail — but it is strictly better than the current behaviour, where the
 * data is lost in thirty seconds instead of on a browser reset.
 *
 * ── WHY A STORE RATHER THAN `useState` PER COMPONENT ────────────────────
 * The nutrition screen shows totals; the log shows rows; the quick-add sheet
 * writes. Three `useState`s over the same storage key would drift apart the
 * moment one of them wrote. One external store, three subscribers.
 *
 * `useSyncExternalStore` also solves the hydration half: the server has no
 * storage, so `getServerSnapshot` returns a frozen empty array — a stable
 * reference, because returning `[]` inline re-renders forever.
 */

const KEY = "suth:food-log";

/** Server snapshot. Must be referentially stable or React loops. */
const EMPTY: LoggedFood[] = Object.freeze([] as LoggedFood[]) as LoggedFood[];

let cache: LoggedFood[] | null = null;
const listeners = new Set<() => void>();

function read(): LoggedFood[] {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    // Storage is user-writable and survives deploys, so anything shaped wrong
    // gets dropped rather than crashing the nutrition tab on load.
    cache = Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function isEntry(value: unknown): value is LoggedFood {
  if (!value || typeof value !== "object") return false;
  const e = value as Partial<LoggedFood>;
  return (
    typeof e.id === "string"
    && typeof e.date === "string"
    && typeof e.at === "number"
    && typeof e.macros === "object"
    && e.macros !== null
  );
}

function write(next: LoggedFood[]): void {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode, or the quota is full. The in-memory cache still updated,
    // so the session keeps working; only the persistence is lost. Failing the
    // whole action here would be a worse trade.
  }
  for (const l of listeners) l();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Another tab writing should update this one. Same-tab writes never fire
  // `storage`, which is why the listener set exists alongside it.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useFoodLog(date = isoDate(new Date())) {
  const all = useSyncExternalStore(subscribe, read, () => EMPTY);

  const entries = useMemo(
    () => all.filter((e) => e.date === date).sort((a, b) => a.at - b.at),
    [all, date],
  );

  const add = useCallback((entry: LoggedFood) => {
    write([...read(), entry]);
  }, []);

  const remove = useCallback((id: string) => {
    write(read().filter((e) => e.id !== id));
  }, []);

  const update = useCallback((id: string, patch: Partial<LoggedFood>) => {
    write(read().map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  return { entries, all, add, remove, update };
}

/** Test seam — the store is module state, so it has to be resettable. */
export function __resetFoodLog(): void {
  cache = null;
}
