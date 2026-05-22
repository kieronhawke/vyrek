"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { CtaButton } from "@/components/shared/cta-button";
import { SplitHeading } from "@/components/shared/split-heading";
import { useQuizState } from "@/hooks/use-quiz-state";
import { matchProgramme } from "@/lib/quiz-schema";

const PROGRAMME_LABEL: Record<string, string> = {
  "first-race": "First Race",
  "sub-90": "Sub-90",
  doubles: "Doubles",
  pro: "Pro",
};

export default function QuizDone() {
  const { state, hydrated } = useQuizState();

  const programme = useMemo(() => {
    if (!state) return null;
    return matchProgramme(state.answers);
  }, [state]);

  // Demo cinematic — slight pulse on the dot for a few seconds.
  useEffect(() => {
    const id = window.setTimeout(() => undefined, 100);
    return () => window.clearTimeout(id);
  }, []);

  if (!hydrated) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-vyrek-text-tertiary">
          One moment.
        </span>
      </main>
    );
  }

  return (
    <main className="flex min-h-svh flex-col">
      <div className="flex h-14 shrink-0 items-center px-5 pt-[var(--safe-top)]">
        <Link
          href="/"
          aria-label="Back to home"
          className="-ml-3 inline-flex h-10 items-center px-3 text-vyrek-text-secondary transition-colors hover:text-vyrek-text"
        >
          ←
        </Link>
      </div>

      <Container className="flex flex-1 flex-col items-center justify-center pb-12 text-center">
        <div className="relative size-16">
          <span className="absolute inset-0 animate-ping rounded-full bg-vyrek-accent/30" />
          <span className="absolute inset-3 rounded-full bg-vyrek-accent" />
        </div>
        <Eyebrow className="mt-10">Your matched programme</Eyebrow>
        <SplitHeading
          as="h1"
          key={programme ?? "calibrating"}
          className="mt-3 text-3xl font-black leading-tight tracking-[-0.05em] text-vyrek-text md:text-4xl lg:text-5xl"
        >
          {programme ? PROGRAMME_LABEL[programme] : "Calibrating"}
        </SplitHeading>
        <p className="mt-5 max-w-md text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
          Your dated Week 1 is ready. Weeks 2–12 unlock with your membership —
          first week free.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <CtaButton href="/plan">See your plan →</CtaButton>
          <Link
            href="/pricing"
            className="h-11 px-3 text-sm text-vyrek-text-secondary underline-offset-4 hover:underline"
          >
            See pricing
          </Link>
        </div>
      </Container>
    </main>
  );
}
