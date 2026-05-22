"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuizAnswers } from "@/lib/quiz-flow";

/**
 * Per-user quiz state for V3. Lives in localStorage under a versioned key so
 * V1 and V2 carry-over data never collide.
 */
const STORAGE_KEY = "vyrek:quiz:v3:state";
const UUID_KEY = "vyrek:customer:uuid";

export type QuizStateV3 = {
  uuid: string;
  answers: QuizAnswers;
  /** Index into the *visible* screen list */
  screenIndex: number;
  /** Whether this hydrate represents a resumed session (for analytics) */
  resumed: boolean;
  startedAt: string;
  updatedAt: string;
};

function generateUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readState(): QuizStateV3 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuizStateV3;
    if (parsed.answers?.raceDate) {
      parsed.answers.raceDate = new Date(
        parsed.answers.raceDate as unknown as string,
      );
    }
    // Ensure intent is always an array (multi-select).
    if (parsed.answers && !Array.isArray(parsed.answers.intent)) {
      parsed.answers.intent = [];
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeState(state: QuizStateV3) {
  if (typeof window === "undefined") return;
  const toStore = {
    ...state,
    answers: {
      ...state.answers,
      raceDate:
        state.answers.raceDate instanceof Date
          ? state.answers.raceDate.toISOString()
          : state.answers.raceDate,
    },
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  window.localStorage.setItem(UUID_KEY, state.uuid);
}

export function useQuizStateV3() {
  const [state, setState] = useState<QuizStateV3 | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const existing = readState();
    const next =
      existing ??
      (() => {
        const fresh: QuizStateV3 = {
          uuid: generateUuid(),
          answers: { intent: [] },
          screenIndex: 0,
          resumed: false,
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        writeState(fresh);
        return fresh;
      })();
    // Mark as resumed if we found an existing record and the user has progress
    if (existing && existing.screenIndex > 0) {
      next.resumed = true;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(next);
    setHydrated(true);
  }, []);

  const setAnswer = useCallback(
    <K extends keyof QuizAnswers>(
      id: K,
      valueOrUpdater:
        | QuizAnswers[K]
        | ((current: QuizAnswers[K] | undefined) => QuizAnswers[K]),
    ) => {
      setState((prev) => {
        if (!prev) return prev;
        const current = prev.answers[id];
        const value =
          typeof valueOrUpdater === "function"
            ? (
                valueOrUpdater as (
                  c: QuizAnswers[K] | undefined,
                ) => QuizAnswers[K]
              )(current)
            : valueOrUpdater;
        const next: QuizStateV3 = {
          ...prev,
          answers: { ...prev.answers, [id]: value },
          updatedAt: new Date().toISOString(),
        };
        writeState(next);
        return next;
      });
    },
    [],
  );

  const mergeAnswers = useCallback((patch: Partial<QuizAnswers>) => {
    setState((prev) => {
      if (!prev) return prev;
      const next: QuizStateV3 = {
        ...prev,
        answers: { ...prev.answers, ...patch },
        updatedAt: new Date().toISOString(),
      };
      writeState(next);
      return next;
    });
  }, []);

  const setScreenIndex = useCallback((index: number) => {
    setState((prev) => {
      if (!prev) return prev;
      if (prev.screenIndex === index) return prev;
      const next: QuizStateV3 = {
        ...prev,
        screenIndex: index,
        updatedAt: new Date().toISOString(),
      };
      writeState(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(UUID_KEY);
    const fresh: QuizStateV3 = {
      uuid: generateUuid(),
      answers: { intent: [] },
      screenIndex: 0,
      resumed: false,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    writeState(fresh);
    setState(fresh);
  }, []);

  return {
    state,
    hydrated,
    setAnswer,
    mergeAnswers,
    setScreenIndex,
    reset,
  };
}

export { STORAGE_KEY as QUIZ_V3_STORAGE_KEY, UUID_KEY };
