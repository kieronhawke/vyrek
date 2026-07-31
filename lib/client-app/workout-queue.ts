/**
 * NEVER LOSE A WORKOUT — docs/build-pack/HARD-RULES §2, spec/11 §6.
 *
 * "Lost workouts are the primary driver of one-star reviews for Runna. There
 * is no reason to repeat that."
 *
 * The rules this module exists to make true:
 *
 *   - **Local-first writes.** Every set lands locally first and syncs after.
 *     The UI never waits on the network and never blocks on failure.
 *   - **Offline by default.** Gyms have terrible signal and basements have
 *     none. A whole session must work with the network off.
 *   - **Idempotent sync** via `client_generated_id`, so a retry after a
 *     half-completed request cannot duplicate a set.
 *
 * This file is the pure part: queue state, ordering, backoff, dedupe and
 * reconciliation. No IndexedDB, no fetch, no timers — so `spec/16 §2`'s
 * scenarios can be tested exhaustively without a browser, and the browser
 * test then only has to prove the wiring.
 */

export type QueueItemStatus = "pending" | "in_flight" | "synced" | "failed";

export type WorkoutSet = {
  /** Idempotency key. Generated on the device, never by the server. */
  clientGeneratedId: string;
  workoutLogId: string;
  exerciseId: string;
  setNumber: number;
  reps?: number;
  weightKg?: number;
  distanceM?: number;
  durationS?: number;
  restS?: number;
  completed: boolean;
  /** Device clock. Used for ordering only, never trusted as truth. */
  recordedAt: number;
};

export type QueueItem = {
  set: WorkoutSet;
  status: QueueItemStatus;
  attempts: number;
  /** Epoch ms before which this item must not be retried. */
  nextAttemptAt: number;
  lastError?: string;
};

export type Queue = {
  items: QueueItem[];
};

export const MAX_ATTEMPTS = 10;

/**
 * Exponential backoff with a ceiling, so a long outage does not turn into a
 * hot loop and a returning network is not hammered by a large backlog.
 * 1s, 2s, 4s ... capped at 5 minutes.
 */
export function backoffMs(attempts: number): number {
  const base = 1000 * 2 ** Math.max(0, attempts - 1);
  return Math.min(base, 5 * 60 * 1000);
}

export function emptyQueue(): Queue {
  return { items: [] };
}

/**
 * Add a set. Idempotent on `clientGeneratedId`: enqueueing the same set twice
 * updates it in place rather than creating a duplicate.
 *
 * This is what makes the UI safe to be optimistic. Tapping "complete set"
 * twice, or a component re-mounting mid-session, cannot produce two rows.
 */
export function enqueue(queue: Queue, set: WorkoutSet, now = 0): Queue {
  const existing = queue.items.findIndex(
    (i) => i.set.clientGeneratedId === set.clientGeneratedId,
  );

  if (existing >= 0) {
    const item = queue.items[existing];
    // Never resurrect something already accepted by the server.
    if (item.status === "synced") return queue;
    const items = [...queue.items];
    items[existing] = { ...item, set, status: "pending", nextAttemptAt: now };
    return { items };
  }

  return {
    items: [
      ...queue.items,
      { set, status: "pending", attempts: 0, nextAttemptAt: now },
    ],
  };
}

/**
 * What should be sent right now: pending or previously failed items whose
 * backoff has elapsed, oldest first so a session syncs in the order it was
 * performed.
 */
export function dueForSync(queue: Queue, now: number): QueueItem[] {
  return queue.items
    .filter(
      (i) =>
        (i.status === "pending" || i.status === "failed") &&
        i.attempts < MAX_ATTEMPTS &&
        i.nextAttemptAt <= now,
    )
    .sort((a, b) => a.set.recordedAt - b.set.recordedAt);
}

export function markInFlight(queue: Queue, ids: string[]): Queue {
  const set = new Set(ids);
  return {
    items: queue.items.map((i) =>
      set.has(i.set.clientGeneratedId) ? { ...i, status: "in_flight" } : i,
    ),
  };
}

/**
 * The server accepted these. Marked synced permanently — a later failure for
 * the same id cannot unmark it, which is what makes at-least-once delivery
 * safe.
 */
export function markSynced(queue: Queue, ids: string[]): Queue {
  const set = new Set(ids);
  return {
    items: queue.items.map((i) =>
      set.has(i.set.clientGeneratedId)
        ? { ...i, status: "synced", lastError: undefined }
        : i,
    ),
  };
}

/** The send failed. Schedules a retry; never drops the data. */
export function markFailed(
  queue: Queue,
  ids: string[],
  now: number,
  error?: string,
): Queue {
  const set = new Set(ids);
  return {
    items: queue.items.map((i) => {
      if (!set.has(i.set.clientGeneratedId)) return i;
      if (i.status === "synced") return i;
      const attempts = i.attempts + 1;
      return {
        ...i,
        status: "failed",
        attempts,
        nextAttemptAt: now + backoffMs(attempts),
        lastError: error,
      };
    }),
  };
}

/**
 * Reconcile against what the server says it holds.
 *
 * Covers the dangerous case: the request succeeded but the response was lost,
 * so the device still thinks the set is pending. Without this the retry would
 * be the only thing standing between the user and a duplicate — and while the
 * server's own idempotency should catch it, relying on one layer for
 * something this important is how workouts go missing.
 */
export function reconcile(queue: Queue, serverIds: string[]): Queue {
  const known = new Set(serverIds);
  return {
    items: queue.items.map((i) =>
      known.has(i.set.clientGeneratedId) && i.status !== "synced"
        ? { ...i, status: "synced", lastError: undefined }
        : i,
    ),
  };
}

/** Sets that exist on the device but the server has never acknowledged. */
export function unsynced(queue: Queue): QueueItem[] {
  return queue.items.filter((i) => i.status !== "synced");
}

/** Items that have exhausted their retries and need surfacing to the user. */
export function stuck(queue: Queue): QueueItem[] {
  return queue.items.filter(
    (i) => i.status !== "synced" && i.attempts >= MAX_ATTEMPTS,
  );
}

/**
 * What the sync indicator shows. The user has to be able to trust that their
 * work is safe, so the states are deliberately plain.
 */
export type SyncState = "synced" | "pending" | "offline" | "stuck";

export function syncState(queue: Queue, online: boolean): SyncState {
  if (stuck(queue).length > 0) return "stuck";
  if (unsynced(queue).length === 0) return "synced";
  return online ? "pending" : "offline";
}

/**
 * Drop synced items older than a cutoff, so the local queue does not grow
 * without bound. Anything unsynced is kept regardless of age — the whole
 * point is that it survives until the server has it.
 */
export function prune(queue: Queue, before: number): Queue {
  return {
    items: queue.items.filter(
      (i) => i.status !== "synced" || i.set.recordedAt >= before,
    ),
  };
}
