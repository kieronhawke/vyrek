"use client";

import Link from "next/link";

/**
 * Lower-half blur wall — applied to Results pages after the gate fires
 * AND the user dismisses without signing up. The page content above
 * the wall is fully visible (free tier preview); content below is
 * blurred behind a sign-up prompt.
 *
 * Sprint 1: presentational. The decision to actually mount it lives in
 * the page (which reads the gate state). Sprint 2 binds to the server-
 * side Upstash heartbeat.
 */
export function BlurWall() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-1/2"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-vyrek-base via-vyrek-base/90 to-transparent backdrop-blur-md" />
      <div className="pointer-events-auto absolute inset-x-0 bottom-1/3 px-5">
        <div className="mx-auto max-w-md rounded-2xl border border-vyrek-accent/40 bg-vyrek-elevated/90 p-6 text-center backdrop-blur-xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
            [ KEEP ANALYSING ]
          </p>
          <h2 className="mt-3 text-xl font-black tracking-[-0.02em] text-vyrek-text md:text-2xl">
            Sign up free to see the rest
          </h2>
          <p className="mt-2 text-sm text-vyrek-text-secondary">
            Free account unlocks everything on the Results hub. Pro
            analytics arrive with the course.
          </p>
          <div className="mt-4">
            <Link
              href="/quiz"
              className="inline-flex h-12 w-full items-center justify-center rounded-pill bg-vyrek-accent px-5 text-base font-semibold text-[#0A0A0A] hover:bg-vyrek-accent-hover"
            >
              Create free account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
