"use client";

/**
 * A real store, with a swappable driver.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every admin module rendered a fixture and could not be edited. The reason
 * given each time was "no database", which was true and also an excuse: there
 * is no Supabase key, no Postgres URL and no blob token, but none of that stops
 * an edit from persisting in the browser it was made in.
 *
 * So this is the seam. Modules talk to `useCollection` and `useRecord`, never
 * to a fixture and never to localStorage directly. Today the driver writes to
 * localStorage, so an edit survives a reload and the admin genuinely works for
 * one operator on one machine. When a datastore credential arrives, the driver
 * is replaced in this file and every module built on these hooks becomes
 * multi-user without changing.
 *
 * WHAT IT IS NOT
 * --------------
 * Not shared between people or devices. Ben editing on his laptop will not
 * change what Kieron sees. Everything that renders store data says so, because
 * a console that silently keeps your changes to itself is worse than one that
 * admits it.
 *
 * WHY useSyncExternalStore
 * ------------------------
 * The obvious shape — useState plus a useEffect that reads storage — sets state
 * synchronously inside an effect, which cascades renders and is the exact
 * pattern the repo already has six lint errors for. localStorage is an external
 * store, and React has a primitive for subscribing to one with a separate
 * server snapshot, which is also what keeps hydration honest: the server always
 * renders the seed, the client swaps to stored data after mount.
 */

import { useCallback, useMemo, useSyncExternalStore } from "react";

const PREFIX = "suth.store.v1.";

/** Anything with a stable id can live in a collection. */
export type Entity = { id: string };

type Driver = {
  read(key: string): string | null;
  write(key: string, raw: string): void;
};

/**
 * localStorage, guarded. Private browsing and blocked storage both throw rather
 * than returning false, and an admin that crashes because a setting could not
 * be saved is worse than one that keeps working in memory.
 */
const browserDriver: Driver = {
  read(key) {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(PREFIX + key);
    } catch {
      return null;
    }
  },
  write(key, raw) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PREFIX + key, raw);
    } catch {
      /* quota or storage blocked; the in-memory value still updated */
    }
  },
};

const driver: Driver = browserDriver;

/** Same-tab listeners. `storage` only fires cross-tab, which is not enough. */
const listeners = new Map<string, Set<() => void>>();

function subscribe(key: string, fn: () => void) {
  const set = listeners.get(key) ?? new Set();
  set.add(fn);
  listeners.set(key, set);
  return () => set.delete(fn);
}

function emit(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

/**
 * Cache the parsed value per key so the snapshot is referentially stable.
 * useSyncExternalStore re-renders forever if getSnapshot returns a new object
 * each call, and JSON.parse always does.
 */
const cache = new Map<string, { raw: string | null; parsed: unknown }>();

function snapshot<T>(key: string, seed: T): T {
  const raw = driver.read(key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.parsed as T;

  let parsed: T = seed;
  if (raw !== null) {
    try {
      parsed = JSON.parse(raw) as T;
    } catch {
      parsed = seed;
    }
  }
  cache.set(key, { raw, parsed });
  return parsed;
}

function write<T>(key: string, value: T) {
  const raw = JSON.stringify(value);
  driver.write(key, raw);
  cache.set(key, { raw, parsed: value });
  emit(key);
}

/**
 * A single persisted record. The server renders `seed`; the client swaps to
 * stored data on hydration.
 */
export function useRecord<T>(key: string, seed: T) {
  const sub = useCallback((fn: () => void) => subscribe(key, fn), [key]);
  const get = useCallback(() => snapshot<T>(key, seed), [key, seed]);
  const getServer = useCallback(() => seed, [seed]);

  const value = useSyncExternalStore(sub, get, getServer);

  const save = useCallback((next: T) => write(key, next), [key]);
  const reset = useCallback(() => write(key, seed), [key, seed]);

  return { value, save, reset, ready: true };
}

/**
 * A persisted collection, seeded from fixtures the first time it is opened.
 *
 * `seed` is only used when the key has never been written; otherwise edits
 * would be reverted by their own fixtures on every reload, which is the exact
 * failure this replaces.
 */
export function useCollection<T extends Entity>(
  key: string,
  seed: readonly T[],
) {
  const seedArray = useMemo(() => seed as T[], [seed]);
  const { value: items, save, reset, ready } = useRecord<T[]>(key, seedArray);

  const update = useCallback(
    (id: string, patch: Partial<T>) =>
      save(items.map((i) => (i.id === id ? { ...i, ...patch } : i))),
    [items, save],
  );

  const add = useCallback((item: T) => save([item, ...items]), [items, save]);

  const remove = useCallback(
    (id: string) => save(items.filter((i) => i.id !== id)),
    [items, save],
  );

  return { items, ready, update, add, remove, reset };
}

/** A stable id without Date.now(), which is unavailable in some contexts. */
export function newId(prefix: string, existing: readonly Entity[]): string {
  let n = existing.length + 1;
  const taken = new Set(existing.map((e) => e.id));
  while (taken.has(`${prefix}_${n}`)) n++;
  return `${prefix}_${n}`;
}
