import type { ReactNode } from "react";
import { Eyebrow } from "@/components/shared/eyebrow";

/**
 * Shared headline+helper block used at the top of any question screen
 * (single-select, multi-select, calendar). Stays a server component, no
 * hooks involved.
 */
export function ScreenQuestion({
  question,
  helper,
  children,
}: {
  question: string;
  helper?: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-black leading-tight tracking-[-0.04em] text-vyrek-text md:text-3xl">
        {question}
      </h1>
      {helper && (
        <Eyebrow className="mt-3 block !text-vyrek-text-secondary">
          {helper}
        </Eyebrow>
      )}
      {children && <div className="mt-8">{children}</div>}
    </div>
  );
}
