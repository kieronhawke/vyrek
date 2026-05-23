"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ProgressArc } from "@/components/quiz/progress-arc";
import { Eyebrow } from "@/components/shared/eyebrow";

export function QuestionShell({
  current,
  total,
  question,
  helper,
  preview,
  backHref,
  hasAnswers,
  onNext,
  nextDisabled,
  nextLabel = "Next →",
  children,
}: {
  current: number;
  total: number;
  question: string;
  helper?: string;
  preview?: string;
  backHref?: string;
  hasAnswers?: boolean;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  const onClose = () => {
    if (
      hasAnswers &&
      !window.confirm("Leave quiz? Your progress is saved.")
    ) {
      return;
    }
    router.push("/");
  };

  return (
    <div className="flex min-h-svh flex-col bg-vyrek-base pt-[var(--safe-top)]">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 px-5">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Back"
            className="-ml-3 inline-flex h-10 items-center px-3 text-vyrek-text-secondary transition-colors hover:text-vyrek-text"
          >
            ←
          </Link>
        ): (
          <span className="h-10 w-10" />
        )}
        <ProgressArc current={current} total={total} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quiz, back to home"
          className="-mr-3 inline-flex h-10 items-center px-3 text-vyrek-text-secondary transition-colors hover:text-vyrek-text"
        >
          ✕
        </button>
      </header>

      {/* Question area, scrollable if it overflows */}
      <div className="flex-1 overflow-y-auto px-5 pb-32">
        <div className="mx-auto max-w-md pt-4">
          <h1 className="text-2xl font-black leading-tight tracking-[-0.04em] text-vyrek-text md:text-3xl">
            {question}
          </h1>
          {helper && (
            <Eyebrow className="mt-3 block !text-vyrek-text-secondary">
              {helper}
            </Eyebrow>
          )}
          {preview && (
            <div className="mt-5">
              <Eyebrow className="!text-vyrek-text-tertiary">
                {`PROGRAMME MATCHING: ${preview}`}
              </Eyebrow>
            </div>
          )}
          <div className="mt-8">{children}</div>
        </div>
      </div>

      {/* Bottom bar, sticky above safe area */}
      <footer className="sticky bottom-0 border-t border-vyrek-border-subtle bg-vyrek-base/90 pb-[max(1rem,var(--safe-bottom))] pt-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-end gap-3 px-5">
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-pill bg-vyrek-accent px-6 text-base font-medium tracking-tight text-[#0A0A0A] transition-[background,opacity,transform] duration-fast ease-out hover:bg-vyrek-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {nextLabel}
          </button>
        </div>
      </footer>
    </div>
  );
}
