import { describe, expect, it } from "vitest";
import {
  MAX_ATTEMPTS,
  backoffMs,
  dueForSync,
  emptyQueue,
  enqueue,
  markFailed,
  markInFlight,
  markSynced,
  prune,
  reconcile,
  stuck,
  syncState,
  unsynced,
  type WorkoutSet,
} from "@/lib/client-app/workout-queue";

/**
 * HARD-RULES §2 and spec/16 §2. The offline test is described as "the most
 * important in the suite" and must pass on every commit; these are the same
 * scenarios at the unit level, where every edge can actually be reached.
 */

const set = (id: string, over: Partial<WorkoutSet> = {}): WorkoutSet => ({
  clientGeneratedId: id,
  workoutLogId: "w1",
  exerciseId: "e1",
  setNumber: 1,
  reps: 10,
  weightKg: 24,
  completed: true,
  recordedAt: 1000,
  ...over,
});

describe("local-first writes", () => {
  it("accepts a set with no network involved", () => {
    const q = enqueue(emptyQueue(), set("a"));
    expect(q.items).toHaveLength(1);
    expect(q.items[0].status).toBe("pending");
  });

  it("keeps twelve sets across four exercises, the spec/16 §2 scenario", () => {
    let q = emptyQueue();
    for (let e = 1; e <= 4; e++) {
      for (let s = 1; s <= 3; s++) {
        q = enqueue(
          q,
          set(`e${e}s${s}`, { exerciseId: `e${e}`, setNumber: s, recordedAt: e * 10 + s }),
        );
      }
    }
    expect(q.items).toHaveLength(12);
    expect(unsynced(q)).toHaveLength(12);
  });
});

describe("idempotency — the rule that prevents duplicates", () => {
  it("does not duplicate on re-enqueue of the same id", () => {
    let q = enqueue(emptyQueue(), set("a"));
    q = enqueue(q, set("a", { reps: 12 }));
    expect(q.items).toHaveLength(1);
    expect(q.items[0].set.reps).toBe(12);
  });

  it("refuses to resurrect an already-synced set", () => {
    // A component remounting after sync must not re-send.
    let q = enqueue(emptyQueue(), set("a"));
    q = markSynced(q, ["a"]);
    q = enqueue(q, set("a", { reps: 99 }));
    expect(q.items[0].status).toBe("synced");
    expect(q.items[0].set.reps).toBe(10);
  });

  it("treats distinct ids as distinct sets", () => {
    let q = enqueue(emptyQueue(), set("a"));
    q = enqueue(q, set("b"));
    expect(q.items).toHaveLength(2);
  });
});

describe("what gets sent, and when", () => {
  it("sends oldest first, so a session syncs in the order it happened", () => {
    let q = emptyQueue();
    q = enqueue(q, set("late", { recordedAt: 300 }));
    q = enqueue(q, set("early", { recordedAt: 100 }));
    q = enqueue(q, set("mid", { recordedAt: 200 }));
    expect(dueForSync(q, 1000).map((i) => i.set.clientGeneratedId)).toEqual([
      "early",
      "mid",
      "late",
    ]);
  });

  it("does not re-send something already in flight", () => {
    let q = enqueue(emptyQueue(), set("a"));
    q = markInFlight(q, ["a"]);
    expect(dueForSync(q, 1000)).toEqual([]);
  });

  it("does not re-send something synced", () => {
    let q = enqueue(emptyQueue(), set("a"));
    q = markSynced(q, ["a"]);
    expect(dueForSync(q, 1000)).toEqual([]);
  });

  it("respects backoff before retrying", () => {
    let q = enqueue(emptyQueue(), set("a"));
    q = markFailed(q, ["a"], 0, "offline");
    expect(dueForSync(q, 500)).toEqual([]);
    expect(dueForSync(q, 1000)).toHaveLength(1);
  });
});

describe("backoff", () => {
  it("grows exponentially from one second", () => {
    expect(backoffMs(1)).toBe(1000);
    expect(backoffMs(2)).toBe(2000);
    expect(backoffMs(3)).toBe(4000);
  });

  it("caps at five minutes so a long outage is not a hot loop", () => {
    expect(backoffMs(50)).toBe(300_000);
  });

  it("never returns a negative or zero delay", () => {
    for (const n of [-5, 0, 1]) expect(backoffMs(n)).toBeGreaterThan(0);
  });
});

describe("failure never loses data", () => {
  it("keeps the set after a failed send", () => {
    let q = enqueue(emptyQueue(), set("a"));
    q = markFailed(q, ["a"], 0, "network");
    expect(q.items).toHaveLength(1);
    expect(q.items[0].set.reps).toBe(10);
    expect(q.items[0].lastError).toBe("network");
  });

  it("cannot unmark something the server already accepted", () => {
    // A late failure response for an id the server confirmed must not
    // reopen it, or the retry would duplicate.
    let q = enqueue(emptyQueue(), set("a"));
    q = markSynced(q, ["a"]);
    q = markFailed(q, ["a"], 0, "late error");
    expect(q.items[0].status).toBe("synced");
  });

  it("surfaces an item once it exhausts its retries", () => {
    let q = enqueue(emptyQueue(), set("a"));
    for (let i = 0; i < MAX_ATTEMPTS; i++) q = markFailed(q, ["a"], 0);
    expect(stuck(q)).toHaveLength(1);
    expect(dueForSync(q, Number.MAX_SAFE_INTEGER)).toEqual([]);
  });
});

describe("reconciliation — the lost-response case", () => {
  it("marks synced anything the server says it holds", () => {
    // The request landed but the response was lost, so the device still
    // thinks it is pending. Without this the retry is the only thing
    // between the user and a duplicate.
    let q = enqueue(emptyQueue(), set("a"));
    q = markInFlight(q, ["a"]);
    q = reconcile(q, ["a"]);
    expect(q.items[0].status).toBe("synced");
  });

  it("leaves genuinely unknown sets alone", () => {
    let q = enqueue(emptyQueue(), set("a"));
    q = reconcile(q, ["someone-elses-id"]);
    expect(q.items[0].status).toBe("pending");
  });

  it("is safe to run repeatedly", () => {
    let q = enqueue(emptyQueue(), set("a"));
    q = reconcile(q, ["a"]);
    q = reconcile(q, ["a"]);
    expect(q.items.filter((i) => i.status === "synced")).toHaveLength(1);
  });
});

describe("the sync indicator", () => {
  it("says synced when nothing is outstanding", () => {
    const q = markSynced(enqueue(emptyQueue(), set("a")), ["a"]);
    expect(syncState(q, true)).toBe("synced");
  });

  it("distinguishes offline from merely pending", () => {
    const q = enqueue(emptyQueue(), set("a"));
    expect(syncState(q, false)).toBe("offline");
    expect(syncState(q, true)).toBe("pending");
  });

  it("reports stuck above everything, even offline", () => {
    let q = enqueue(emptyQueue(), set("a"));
    for (let i = 0; i < MAX_ATTEMPTS; i++) q = markFailed(q, ["a"], 0);
    expect(syncState(q, false)).toBe("stuck");
  });

  it("says synced for an empty queue", () => {
    expect(syncState(emptyQueue(), true)).toBe("synced");
  });
});

describe("pruning", () => {
  it("drops old synced items to bound local storage", () => {
    let q = enqueue(emptyQueue(), set("old", { recordedAt: 10 }));
    q = markSynced(q, ["old"]);
    expect(prune(q, 100).items).toHaveLength(0);
  });

  it("never drops anything unsynced, however old", () => {
    // The entire promise of the module: it survives until the server has it.
    const q = enqueue(emptyQueue(), set("ancient", { recordedAt: 1 }));
    expect(prune(q, Number.MAX_SAFE_INTEGER).items).toHaveLength(1);
  });
});

describe("network flapping — spec/16 §2's second scenario", () => {
  it("loses nothing and duplicates nothing across repeated drops", () => {
    let q = emptyQueue();
    const ids: string[] = [];
    let now = 0;

    for (let i = 0; i < 12; i++) {
      const id = `s${i}`;
      ids.push(id);
      q = enqueue(q, set(id, { recordedAt: i }), now);

      // Network drops every other set.
      if (i % 2 === 0) {
        const due = dueForSync(q, now).map((x) => x.set.clientGeneratedId);
        q = markInFlight(q, due);
        q = markFailed(q, due, now, "flap");
      }
      now += 2000;
    }

    // Network returns and stays up.
    now += 600_000;
    let guard = 0;
    while (unsynced(q).length > 0 && guard++ < 50) {
      const due = dueForSync(q, now).map((x) => x.set.clientGeneratedId);
      if (due.length === 0) break;
      q = markInFlight(q, due);
      q = markSynced(q, due);
    }

    expect(q.items).toHaveLength(12);
    expect(unsynced(q)).toHaveLength(0);
    expect(new Set(q.items.map((i) => i.set.clientGeneratedId)).size).toBe(12);
    expect(q.items.map((i) => i.set.clientGeneratedId).sort()).toEqual(ids.sort());
  });
});
