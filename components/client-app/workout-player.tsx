"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Num } from "@/components/control/num";
import {
  loadQueue,
  newClientGeneratedId,
  saveQueue,
} from "@/lib/client-app/local-store";
import {
  dueForSync,
  emptyQueue,
  enqueue,
  markFailed,
  markInFlight,
  markSynced,
  reconcile,
  syncState,
  unsynced,
  type Queue,
} from "@/lib/client-app/workout-queue";

/**
 * THE WORKOUT PLAYER — docs/build-pack/spec/11 §6. P0.
 *
 * "Lost workouts are the primary driver of one-star reviews for Runna."
 *
 * Every rule from the spec is a specific decision here:
 *
 *   - **Local-first.** Tapping a set writes to the queue and to IndexedDB
 *     before anything touches the network. The UI never awaits a request.
 *   - **Offline by default.** With the network off the whole session works;
 *     the queue drains when it returns.
 *   - **Optimistic UI.** The set is logged the instant it is tapped.
 *   - **Big targets, no keyboards mid-set.** Steppers, not inputs.
 *   - **Last session's numbers as the default**, so the common case is one tap.
 *   - **Screen wake lock**, because a screen dimming between sets is one of
 *     the most irritating things a training app can do.
 *   - **A visible sync indicator**, so the trust is earned rather than asked for.
 */

type Exercise = {
  id: string;
  name: string;
  targetSets: number;
  targetReps: number;
  lastWeightKg?: number;
  lastReps?: number;
};

/** Stand-in session. Phase D replaces this with the real plan. */
const SESSION: { workoutLogId: string; title: string; exercises: Exercise[] } = {
  workoutLogId: "sample-session",
  title: "Strength + intervals",
  exercises: [
    { id: "ex_wallball", name: "Wall balls", targetSets: 3, targetReps: 15, lastWeightKg: 6, lastReps: 15 },
    { id: "ex_sled", name: "Sled push", targetSets: 3, targetReps: 25, lastWeightKg: 100, lastReps: 25 },
    { id: "ex_row", name: "Row", targetSets: 3, targetReps: 500, lastWeightKg: 0, lastReps: 500 },
    { id: "ex_lunge", name: "Sandbag lunges", targetSets: 3, targetReps: 20, lastWeightKg: 20, lastReps: 20 },
  ],
};

const SYNC_COPY: Record<string, { label: string; tone: string }> = {
  synced: { label: "All saved", tone: "var(--text-muted)" },
  pending: { label: "Saving…", tone: "var(--text-muted)" },
  offline: { label: "Offline — saved on this device", tone: "var(--warn)" },
  stuck: { label: "Couldn't sync — your sets are still safe here", tone: "var(--danger)" },
};

export function WorkoutPlayer() {
  const [queue, setQueue] = useState<Queue>(emptyQueue());
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [index, setIndex] = useState(0);
  const [weight, setWeight] = useState(
    () => SESSION.exercises[0]?.lastWeightKg ?? 0,
  );
  const [reps, setReps] = useState(
    () => SESSION.exercises[0]?.lastReps ?? SESSION.exercises[0]?.targetReps ?? 0,
  );

  const exercise = SESSION.exercises[index];

  /**
   * Move exercise and reset the steppers together. Done here rather than in
   * an effect on `index`: an effect would render once with the previous
   * exercise's numbers still showing, which is a real flash of wrong data
   * on a screen someone is reading mid-set.
   */
  const goToExercise = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(SESSION.exercises.length - 1, next));
    const ex = SESSION.exercises[clamped];
    setIndex(clamped);
    setWeight(ex?.lastWeightKg ?? 0);
    setReps(ex?.lastReps ?? ex?.targetReps ?? 0);
  }, []);

  // Rehydrate whatever the device already holds. Until this resolves we do
  // not render controls, so a fast tap cannot race the restore and lose sets.
  useEffect(() => {
    let cancelled = false;
    void loadQueue().then((q) => {
      if (cancelled) return;
      setQueue(q);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // Screen wake lock for the duration of the session. spec/11 §6.
  useEffect(() => {
    let sentinel: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    void nav.wakeLock
      ?.request("screen")
      .then((s) => {
        sentinel = s;
      })
      .catch(() => {
        // Unsupported or denied. Not worth telling the user about.
      });
    return () => {
      void sentinel?.release().catch(() => undefined);
    };
  }, []);

  const persist = useCallback((next: Queue) => {
    setQueue(next);
    // Fire and forget: the UI must never wait on storage either.
    void saveQueue(next);
  }, []);

  /** The whole point. Writes locally, returns immediately. */
  const logSet = useCallback(
    (setNumber: number) => {
      const next = enqueue(
        queue,
        {
          clientGeneratedId: newClientGeneratedId(),
          workoutLogId: SESSION.workoutLogId,
          exerciseId: exercise.id,
          setNumber,
          reps,
          weightKg: weight,
          completed: true,
          recordedAt: Date.now(),
        },
        Date.now(),
      );
      persist(next);
      if (navigator.vibrate) navigator.vibrate(12);
    },
    [queue, exercise, reps, weight, persist],
  );

  // Drain the queue whenever there is something to send and a network to
  // send it on. Errors mark for retry; nothing is ever dropped.
  const syncing = useRef(false);
  useEffect(() => {
    if (!ready || !online || syncing.current) return;
    const due = dueForSync(queue, Date.now());
    if (due.length === 0) return;

    const ids = due.map((i) => i.set.clientGeneratedId);
    const inFlight = markInFlight(queue, ids);
    syncing.current = true;

    void (async () => {
      try {
        const res = await fetch("/api/client/workout-sets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sets: due.map((i) => i.set) }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { acceptedIds?: string[] };
        // Reconcile on the server's answer rather than assuming, which
        // covers the request landing but the response being lost.
        persist(reconcile(markSynced(inFlight, ids), body.acceptedIds ?? ids));
      } catch (err) {
        persist(
          markFailed(
            inFlight,
            ids,
            Date.now(),
            err instanceof Error ? err.message : "failed",
          ),
        );
      } finally {
        syncing.current = false;
      }
    })();
  }, [ready, online, queue, persist]);

  const state = syncState(queue, online);
  const outstanding = unsynced(queue).length;
  const loggedForExercise = queue.items.filter(
    (i) => i.set.exerciseId === exercise?.id,
  ).length;

  if (!ready || !exercise) {
    return (
      <p style={{ color: "var(--text-muted)" }} aria-live="polite">
        Loading your session…
      </p>
    );
  }

  return (
    <div data-testid="workout-player">
      <p className="eyebrow">{SESSION.title}</p>

      <div
        aria-live="polite"
        data-testid="sync-state"
        data-sync={state}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-1)",
          margin: "var(--space-1) 0 var(--space-3)",
          fontSize: "var(--text-xs)",
          color: SYNC_COPY[state].tone,
        }}
      >
        <span aria-hidden style={{ fontSize: 10 }}>
          ●
        </span>
        {SYNC_COPY[state].label}
        {outstanding > 0 ? (
          <>
            {" · "}
            <Num align="left" tone="muted">
              {outstanding}
            </Num>{" "}
            waiting
          </>
        ) : null}
      </div>

      {/* One exercise at a time, large type, readable from a bench. */}
      <h1
        style={{
          fontSize: "var(--text-2xl)",
          lineHeight: "var(--text-2xl-lh)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          margin: "0 0 var(--space-1)",
        }}
      >
        {exercise.name}
      </h1>
      <p style={{ color: "var(--text-muted)", margin: "0 0 var(--space-4)" }}>
        <Num align="left">{loggedForExercise}</Num> of{" "}
        <Num align="left">{exercise.targetSets}</Num> sets ·{" "}
        {exercise.lastWeightKg ? (
          <>
            last time <Num align="left">{exercise.lastWeightKg}</Num>kg ×{" "}
            <Num align="left">{exercise.lastReps}</Num>
          </>
        ) : (
          "first time"
        )}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--space-2)",
          marginBottom: "var(--space-3)",
        }}
      >
        <Stepper label="Weight (kg)" value={weight} step={2} onChange={setWeight} />
        <Stepper label="Reps" value={reps} step={1} onChange={setReps} />
      </div>

      <button
        type="button"
        data-testid="log-set"
        onClick={() => logSet(loggedForExercise + 1)}
        style={{
          width: "100%",
          minHeight: 56,
          background: "var(--accent)",
          color: "#0A0A0A",
          border: "none",
          borderRadius: "var(--radius-button)",
          fontSize: "var(--text-lg)",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Log set {loggedForExercise + 1}
      </button>

      <div
        style={{
          display: "flex",
          gap: "var(--space-2)",
          marginTop: "var(--space-3)",
        }}
      >
        <NavButton
          label="Previous"
          disabled={index === 0}
          onClick={() => goToExercise(index - 1)}
        />
        <NavButton
          label="Next exercise"
          disabled={index >= SESSION.exercises.length - 1}
          onClick={() => goToExercise(index + 1)}
        />
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="eyebrow" style={{ marginBottom: 4 }}>
        {label}
      </p>
      <div style={{ display: "flex", alignItems: "stretch", gap: 4 }}>
        <StepButton label={`Decrease ${label}`} onClick={() => onChange(Math.max(0, value - step))}>
          −
        </StepButton>
        <output
          aria-label={label}
          className="num"
          style={{
            flex: 1,
            minHeight: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            fontSize: "var(--text-xl)",
          }}
        >
          {value}
        </output>
        <StepButton label={`Increase ${label}`} onClick={() => onChange(value + step)}>
          +
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        minWidth: 56,
        minHeight: 56,
        background: "var(--surface-raised)",
        color: "var(--text)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-button)",
        fontSize: "var(--text-xl)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        minHeight: 48,
        background: "transparent",
        color: disabled ? "var(--text-faint)" : "var(--text)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-button)",
        fontSize: "var(--text-sm)",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );
}
