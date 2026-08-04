"use client";

import { createContext, useContext, useMemo } from "react";
import { interpolate } from "@/lib/quiz-copy/registry";
import type { CopyField } from "@/lib/quiz-copy/registry";

/**
 * THE OVERRIDE LAYER, WIRED IN AT TWO POINTS RATHER THAN TWENTY.
 *
 * Every question screen already renders its text through `QuestionHeader`
 * and its button through `ContinueButton`. So instead of threading an edited
 * string through twenty-odd components — and inevitably missing three — the
 * quiz publishes the overrides once and those two components look up their
 * own screen's entry. A screen added tomorrow is editable the moment it uses
 * the standard header, with nothing else to remember.
 *
 * THE PROP IS THE FALLBACK, ALWAYS. The component keeps its literal text and
 * that is what renders when no override exists, when the database is down,
 * and in every test. Editing is additive; it can never leave a screen blank.
 */

type CopyValue = { overrides: Record<string, string>; kind: string; tokens: Record<string, string | undefined> };

const CopyContext = createContext<CopyValue>({
  overrides: {},
  kind: "",
  tokens: {},
});

/** Wraps the whole quiz; the overrides come from the server on page load. */
export function QuizCopyProvider({
  overrides,
  children,
}: {
  overrides: Record<string, string>;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ overrides, kind: "", tokens: {} }),
    [overrides],
  );
  return <CopyContext.Provider value={value}>{children}</CopyContext.Provider>;
}

/**
 * Wraps one screen, so the header inside it knows which entry is its own.
 * `tokens` are the per-person words a screen's copy may name — their first
 * name, the injury they picked — kept out of the stored text so an edit
 * cannot accidentally hard-code one visitor's answer.
 */
export function ScreenCopyScope({
  kind,
  tokens,
  children,
}: {
  kind: string;
  tokens?: Record<string, string | undefined>;
  children: React.ReactNode;
}) {
  const outer = useContext(CopyContext);
  const value = useMemo(
    () => ({ overrides: outer.overrides, kind, tokens: tokens ?? {} }),
    [outer.overrides, kind, tokens],
  );
  return <CopyContext.Provider value={value}>{children}</CopyContext.Provider>;
}

/** The edited text for this screen's field, or the shipped default. */
export function useCopy(field: CopyField, fallback: string): string;
export function useCopy(
  field: CopyField,
  fallback: string | undefined,
): string | undefined;
export function useCopy(field: CopyField, fallback?: string) {
  const { overrides, kind, tokens } = useContext(CopyContext);
  if (!kind) return fallback;
  const edited = overrides[`${kind}.${field}`];
  if (!edited) return fallback;
  return interpolate(edited, tokens);
}
