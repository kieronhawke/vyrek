"use client";

/**
 * Media storage — form videos from the athlete, voice notes from Ben.
 *
 * IndexedDB, because these are megabytes and localStorage caps at about five.
 * There is no blob-store credential yet, so a file lives in the browser it was
 * recorded in; every surface that shows one says so rather than implying Ben
 * can already see it.
 *
 * The open() call is bounded, for the reason lib/client-app/local-store.ts
 * documents and this project has already been bitten by once: indexedDB.open()
 * has a third outcome besides success and error — never settling, which is what
 * a connection left behind by a killed page causes. An unbounded await there
 * left the workout player on "Loading your session…" forever.
 */

const DB_NAME = "suth-media";
const DB_VERSION = 1;
const STORE = "media";
const OPEN_TIMEOUT_MS = 2000;

export type MediaKind = "form-video" | "voice-note";

export type MediaMeta = {
  id: string;
  kind: MediaKind;
  /** What it is about: a session slot key, or a week id for a voice note. */
  subject: string;
  /** Athlete-supplied, so Ben knows what he is looking at. */
  label: string;
  mimeType: string;
  bytes: number;
  durationSec: number | null;
  /** Ben's reply. Empty until he writes one. */
  coachFeedback: string;
};

export type MediaRecord = MediaMeta & { blob: Blob };

function available(): boolean {
  return typeof indexedDB !== "undefined" && indexedDB !== null;
}

function open(): Promise<IDBDatabase | null> {
  if (!available()) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const done = (db: IDBDatabase | null) => {
      if (!settled) {
        settled = true;
        resolve(db);
      }
    };

    // The third outcome: neither success nor error.
    const timer = setTimeout(() => done(null), OPEN_TIMEOUT_MS);

    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      clearTimeout(timer);
      return done(null);
    }

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("subject", "subject", { unique: false });
      }
    };
    req.onsuccess = () => {
      clearTimeout(timer);
      done(req.result);
    };
    req.onerror = () => {
      clearTimeout(timer);
      done(null);
    };
    req.onblocked = () => {
      clearTimeout(timer);
      done(null);
    };
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return open().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const t = db.transaction(STORE, mode);
          const req = run(t.objectStore(STORE));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
          t.oncomplete = () => db.close();
        } catch {
          resolve(null);
        }
      }),
  );
}

/** True when a file can actually be kept. Surfaces say so when it is false. */
export function storageAvailable(): boolean {
  return available();
}

export async function saveMedia(record: MediaRecord): Promise<boolean> {
  const res = await tx("readwrite", (s) => s.put(record) as IDBRequest<unknown>);
  return res !== null;
}

export async function listMedia(subject?: string): Promise<MediaRecord[]> {
  const all = (await tx<MediaRecord[]>("readonly", (s) => s.getAll())) ?? [];
  return subject ? all.filter((m) => m.subject === subject) : all;
}

export async function deleteMedia(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id) as IDBRequest<undefined>);
}

export async function setFeedback(id: string, feedback: string): Promise<void> {
  const existing = (await tx<MediaRecord>("readonly", (s) => s.get(id))) ?? null;
  if (!existing) return;
  await saveMedia({ ...existing, coachFeedback: feedback });
}

/** Human file size, because "13421772 bytes" tells an athlete nothing. */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(sec: number | null): string {
  if (sec === null || !Number.isFinite(sec)) return "";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Ids without Date.now(), which is unavailable in some contexts here. */
let seq = 0;
export function mediaId(kind: MediaKind): string {
  seq += 1;
  return `${kind}-${seq}-${Math.round(performance.now())}`;
}
