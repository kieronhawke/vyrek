"use client";

import type { ReactNode } from "react";

/**
 * Standard question header, title + optional helper text. Sits at the top
 * of every single-select/multi-select/input screen, above the options.
 */
export function QuestionHeader({
  question,
  helper,
}: {
  question: string;
  helper?: ReactNode;
}) {
  return (
    <header className="mb-6 lg:mb-5">
      <h1 className="text-balance text-2xl font-bold leading-tight tracking-[-0.02em] text-suth-text md:text-3xl">
        {question}
      </h1>
      {helper ? (
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-suth-text-secondary md:text-base lg:text-sm">
          {helper}
        </p>
      ): null}
    </header>
  );
}
