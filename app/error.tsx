"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry will pick this up automatically once the DSN is wired in Phase E.
    console.error("[vyrek] runtime error:", error);
  }, [error]);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center py-24">
      <Container>
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <Eyebrow>Error</Eyebrow>
          <h1 className="mt-4 text-3xl font-black leading-tight tracking-[-0.05em] text-vyrek-text md:text-4xl">
            That didn&apos;t work.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
            Something on our side broke. Try again — and if it keeps happening,
            email{" "}
            <a
              href="mailto:hello@vyrek.com"
              className="text-vyrek-text underline-offset-4 hover:underline"
            >
              hello@vyrek.com
            </a>
            .
          </p>
          {error.digest && (
            <Eyebrow className="mt-4 !text-vyrek-text-tertiary">
              REF {error.digest}
            </Eyebrow>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="h-11 rounded-pill bg-vyrek-accent px-5 text-sm font-medium text-[#0A0A0A] transition-colors hover:bg-vyrek-accent-hover"
            >
              Try again
            </button>
            <Link
              href="/"
              className="h-11 px-3 text-sm text-vyrek-text-secondary underline-offset-4 hover:underline"
            >
              Back to home
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}
