"use client";

import { useCallback, useEffect, useState } from "react";
import type { RunnaQuizAnswers } from "@/lib/quiz-schema";

/* The v1 quiz writes to `vyrek:quiz:state`. The new flow uses a separate key
 * so the two never collide, the old data may linger harmlessly. */
const STORAGE_KEY = "vyrek:quiz:v2:state";
const UUID_KEY = "vyrek:customer:uuid";

export type RunnaQuizState = {
  uuid: string;
  answers: Partial<RunnaQuizAnswers>;
  /** Index into the *visible* screen list the user last reached */
  screenIndex: number;
  startedAt: string;
  updatedAt: string;
};

function generateUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r: (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readState(): RunnaQuizState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RunnaQuizState;
    // Date stored as ISO string, rehydrate so date math still works.
    if (parsed.answers?.raceDate) {
      parsed.answers.raceDate = new Date(
        parsed.answers.raceDate as unknown as string,
      );
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeState(state: RunnaQuizState) {
  if (typeof window === "undefined") return;
  // Date won't survive JSON.stringify cleanly without being converted to a
  // string. We round-trip via toISOString and rehydrate on read.
  const toStore = {...state,
    answers: {...state.answers,
      raceDate:
        state.answers.raceDate instanceof Date
          ? state.answers.raceDate.toISOString(): state.answers.raceDate,
    },
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  window.localStorage.setItem(UUID_KEY, state.uuid);
}

export function useRunnaQuiz() {
  const [state, setState] = useState<RunnaQuizState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const existing = readState();
    const next =
      existing ??
      (() => {
        const fresh: RunnaQuizState = {
          uuid: generateUuid(),
          answers: {},
          screenIndex: 0,
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        writeState(fresh);
        return fresh;
      })();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(next);
    setHydrated(true);
  }, []);

  const setAnswer = useCallback(
    <K extends keyof RunnaQuizAnswers>(id: K, value: RunnaQuizAnswers[K]) => {
      setState((prev) => {
        if (!prev) return prev;
        const next: RunnaQuizState = {...prev,
          answers: {...prev.answers, [id]: value },
          updatedAt: new Date().toISOString(),
        };
        writeState(next);
        return next;
      });
    },
    [],
  );

  const mergeAnswers = useCallback((patch: Partial<RunnaQuizAnswers>) => {
    setState((prev) => {
      if (!prev) return prev;
      const next: RunnaQuizState = {...prev,
        answers: {...prev.answers,...patch },
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
      const next: RunnaQuizState = {...prev,
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
    const fresh: RunnaQuizState = {
      uuid: generateUuid(),
      answers: {},
      screenIndex: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    writeState(fresh);
    setState(fresh);
  }, []);

  return { state, hydrated, setAnswer, mergeAnswers, setScreenIndex, reset };
}
