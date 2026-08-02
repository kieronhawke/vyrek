"use client";

/**
 * A real store, with a swappable driver.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every admin module so far renders a fixture and cannot be edited. The reason
 * given each time was "no database", which was true and also an excuse: there
 * is no Supabase key, no Postgres URL and no blob token, but none of that stops
 * an edit from persisting in the browser it was made in.
 *
 * So this is the seam. Modules talk to `useCollection`, never to a fixture and
 * never to localStorage directly. Today the driver writes to localStorage, so
 * an edit survives a reload and the admin genuinely works for one operator on
 * one machine. When a datastore credential arrives, the driver is replaced in
 * this file and every module that uses it becomes multi-user without changing.
 *
 * WHAT IT IS NOT
 * --------------
 * Not shared between people or devices. Ben editing on his laptop will not
 * change what Kieron sees. Everything that renders store data says so, because
 * a console that silently keeps your changes to itself is worse than one that
 * admits it.
 */

import { useCallback, useEffect, useState } from "react";

const PREFIX = "suth.store.v1.";

/** Anything with a stable id can live in a collection. */
export type Entity = { id: string };

type Driver = {
  read<T>(key: string): T | null;
  write<T>(key: string, value: T): void;
};

/**
 * localStorage, guarded. Private browsing and blocked storage both throw on
 * write rather than returning false, and an admin that crashes because a
 * setting could not be saved is worse than one that keeps working in memory.
 */
const browserDriver: Driver = {
  read<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  write<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Out of quota or storage blocked. The in-memory state still updated,
      // so the session keeps working; it just will not survive a reload.
    }
  },
};

const driver: Driver = browserDriver;

/**
 * A persisted collection, seeded from fixtures the first time it is opened.
 *
 * `seed` is only used when the key has never been written. Otherwise edits
 * would be reverted by their own fixtures on every reload, which is the exact
 * failure this replaces.
 */
export function useCollection<T extends Entity>(
  key: string,
  seed: readonly T[],
) {
  const [items, setItems] = useState<T[]>(seed as T[]);
  // Hydration: the server has no localStorage, so the first paint is the seed
  // and the stored value lands on mount. Rendering stored data on the server
  // would mismatch and React would throw it away anyway.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = driver.read<T[]>(key);
    if (stored) setItems(stored);
    setReady(true);
  }, [key]);

  const persist = useCallback(
    (next: T[]) => {
      setItems(next);
      driver.write(key, next);
    },
    [key],
  );

  const update = useCallback(
    (id: string, patch: Partial<T>) =>
      persist(items.map((i) => (i.id === id ? { ...i, ...patch } : i))),
    [items, persist],
  );

  const add = useCallback((item: T) => persist([item, ...items]), [items, persist]);

  const remove = useCallback(
    (id: string) => persist(items.filter((i) => i.id !== id)),
    [items, persist],
  );

  /** Back to fixtures. The way out when a demo has been edited into a mess. */
  const reset = useCallback(() => persist(seed as T[]), [persist, seed]);

  return { items, ready, update, add, remove, reset };
}

/** A stable id without Date.now(), which is unavailable in some contexts. */
export function newId(prefix: string, existing: readonly Entity[]): string {
  let n = existing.length + 1;
  const taken = new Set(existing.map((e) => e.id));
  while (taken.has(`${prefix}_${n}`)) n++;
  return `${prefix}_${n}`;
}
