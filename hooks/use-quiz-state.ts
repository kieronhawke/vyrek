"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuizAnswers } from "@/lib/quiz-schema";

const STORAGE_KEY = "vyrek:quiz:state";
const UUID_KEY = "vyrek:customer:uuid";

export type QuizState = {
  uuid: string;
  answers: QuizAnswers;
  startedAt: string;
  updatedAt: string;
};

function generateUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback (older Safari), RFC4122 v4 from Math.random
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r: (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readState(): QuizState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as QuizState;
  } catch {
    return null;
  }
}

function writeState(state: QuizState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.localStorage.setItem(UUID_KEY, state.uuid);
}

export function useQuizState() {
  const [state, setState] = useState<QuizState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const existing = readState();
    const next =
      existing ??
      (() => {
        const fresh: QuizState = {
          uuid: generateUuid(),
          answers: {},
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        writeState(fresh);
        return fresh;
      })();
    // One-shot hydration from localStorage on mount. The React ESLint rule
    // discourages setState-in-effect, but this is the canonical pattern for
    // syncing client-only storage with React state at hydration time
    // (useSyncExternalStore would suit a fully external store, not our
    // write-through cache).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(next);
    setHydrated(true);
  }, []);

  const setAnswer = useCallback(
    (id: string, value: QuizAnswers[string]) => {
      setState((prev) => {
        if (!prev) return prev;
        const next: QuizState = {...prev,
          answers: {...prev.answers, [id]: value },
          updatedAt: new Date().toISOString(),
        };
        writeState(next);
        return next;
      });
    },
    [],
  );

  const setAnswers = useCallback((patch: QuizAnswers) => {
    setState((prev) => {
      if (!prev) return prev;
      const next: QuizState = {...prev,
        answers: {...prev.answers,...patch },
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
    const fresh: QuizState = {
      uuid: generateUuid(),
      answers: {},
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    writeState(fresh);
    setState(fresh);
  }, []);

  return { state, hydrated, setAnswer, setAnswers, reset };
}
