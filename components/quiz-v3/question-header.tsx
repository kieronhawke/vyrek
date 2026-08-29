"use client";

import type { ReactNode } from "react";
import { useCopy } from "@/components/quiz-v3/copy-context";

/**
 * Standard question header, title + optional helper text. Sits at the top
 * of every single-select/multi-select/input screen, above the options.
 *
 * It is also where an edited question arrives. The props stay the shipped
 * default and an override for this screen wins — one lookup here makes
 * every screen that uses this header editable, including ones written
 * later that never think about it.
 */
export function QuestionHeader({
  question,
  helper,
}: {
  question: string;
  helper?: ReactNode;
}) {
  const editedQuestion = useCopy("question", question);
  const editedHelper = useCopy("helper", undefined);

  return (
    <header className="mb-6 lg:mb-5">
      <h1 className="text-balance text-2xl font-bold leading-tight tracking-[-0.02em] text-suth-text md:text-3xl lg:text-[1.6rem] xl:text-3xl">
        {editedQuestion}
      </h1>
      {editedHelper ?? helper ? (
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-suth-text-secondary md:text-base lg:text-sm">
          {editedHelper ?? helper}
        </p>
      ): null}
    </header>
  );
}
