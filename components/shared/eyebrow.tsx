import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Technical mono mark in brackets — e.g. `[ BEGINNER / 12 WEEKS ]`.
 * Geist Mono 500, tracking 0.18em, uppercase, secondary text.
 */
export function Eyebrow({
  children,
  className,
  bare = false,
}: {
  children: ReactNode;
  className?: string;
  /** Skip the [ ] brackets — useful when you want plain mono mark text */
  bare?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-block font-mono text-xs font-medium uppercase tracking-[0.18em] text-vyrek-text-tertiary",
        className,
      )}
    >
      {bare ? children : <>[ {children} ]</>}
    </span>
  );
}
