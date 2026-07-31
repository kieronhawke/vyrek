"use client";

import {
  emptyQueue,
  type Queue,
  type QueueItem,
} from "@/lib/client-app/workout-queue";

/**
 * Durable local storage for the workout queue.
 *
 * IndexedDB rather than localStorage, for three reasons that matter here:
 * it survives more aggressive eviction, it is not capped at ~5MB, and it
 * does not block the main thread — which matters when a write happens on
 * every tapped set mid-session.
 *
 * localStorage is kept as a fallback rather than a nicety: Safari private
 * browsing has historically refused IndexedDB, and "your browser is in
 * private mode so we lost your session" is exactly the failure HARD-RULES §2
 * forbids.
 */

const DB_NAME = "suth-client";
const DB_VERSION = 1;
const STORE = "workout-queue";
const FALLBACK_KEY = "suth:workout-queue:v1";
const RECORD_ID = "queue";

function hasIndexedDB(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

/**
 * How long the IndexedDB path gets before we stop waiting on it.
 *
 * `indexedDB.open()` has a third outcome besides success and error: it can
 * simply never settle. A connection left open by a page that was killed
 * rather than closed will block the next open, and `onblocked` may never
 * fire either. The offline test caught exactly this — force-close the app
 * mid-session, reopen, and the read never resolved, so the player sat on
 * "Loading your session…" forever with twelve logged sets stranded on the
 * device behind it.
 *
 * That is the failure HARD-RULES §2 exists to prevent, and it is worse than
 * it looks: the data was safe, but unreachable, which the athlete cannot
 * tell apart from lost. So the read is bounded, and a stall falls through to
 * the localStorage mirror — which is why the mirror is written on every set.
 */
const IDB_TIMEOUT_MS = 1500;

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    work,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("indexeddb timed out")), ms),
    ),
  ]);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    // An older connection is still holding the database. Say so rather than
    // waiting on an event that may never arrive.
    req.onblocked = () => reject(new Error("indexeddb blocked"));
  });
}

/** Read the queue. Never throws: a failed read returns an empty queue. */
export async function loadQueue(): Promise<Queue> {
  if (hasIndexedDB()) {
    try {
      const items = await withTimeout(
        (async () => {
          const db = await openDb();
          try {
            return await new Promise<QueueItem[] | undefined>((resolve, reject) => {
              const tx = db.transaction(STORE, "readonly");
              const req = tx.objectStore(STORE).get(RECORD_ID);
              req.onsuccess = () =>
                resolve(
                  (req.result as { id: string; items: QueueItem[] } | undefined)
                    ?.items,
                );
              req.onerror = () => reject(req.error);
            });
          } finally {
            // Closed even when the read throws, so a failure here cannot
            // become the blocked connection that stalls the next open.
            db.close();
          }
        })(),
        IDB_TIMEOUT_MS,
      );
      if (items) return { items };
    } catch {
      // Fall through to localStorage rather than losing the session.
    }
  }

  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    if (raw) return JSON.parse(raw) as Queue;
  } catch {
    /* ignore */
  }
  return emptyQueue();
}

/**
 * Persist the queue. Writes to IndexedDB and mirrors to localStorage.
 *
 * The mirror is deliberate belt-and-braces: it is small, it costs a
 * millisecond, and it means an IndexedDB corruption or an eviction between
 * sessions still leaves the sets recoverable.
 */
export async function saveQueue(queue: Queue): Promise<void> {
  let stored = false;

  if (hasIndexedDB()) {
    try {
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put({ id: RECORD_ID, items: queue.items });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      db.close();
      stored = true;
    } catch {
      /* fall through */
    }
  }

  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(queue));
    stored = true;
  } catch {
    // Quota exceeded, most likely. Surfaced by the caller's sync indicator
    // rather than thrown, because throwing here would break the session.
  }

  if (!stored && process.env.NODE_ENV !== "production") {
    console.warn("[workout-queue] no durable storage available");
  }
}

/** Wipe local state. Used after a confirmed full sync, and by tests. */
export async function clearQueue(): Promise<void> {
  if (hasIndexedDB()) {
    try {
      const db = await openDb();
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(RECORD_ID);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
      db.close();
    } catch {
      /* ignore */
    }
  }
  try {
    localStorage.removeItem(FALLBACK_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * A device-unique, collision-resistant id for a set.
 *
 * `crypto.randomUUID` where available; a UUID-shaped fallback otherwise,
 * because this value is the idempotency key and a collision would silently
 * discard someone's set.
 */
export function newClientGeneratedId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
