import Link from "next/link";

export function PostFinalCta() {
  return (
    <section className="mt-16 overflow-hidden rounded-lg border border-vyrek-border-subtle bg-gradient-to-br from-vyrek-elevated via-vyrek-elevated to-vyrek-overlay p-6 md:p-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
        [ YOUR PLAN ]
      </p>
      <h2 className="mt-3 text-balance text-2xl font-black leading-tight tracking-[-0.025em] text-vyrek-text md:text-3xl">
        Want this written into your own 12-week plan?
      </h2>
      <p className="mt-3 max-w-md text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
        Three-minute quiz, real Week 1 before you pay. Built by Elite 15
        coaches, calibrated to your kit and your race date.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href="/quiz"
          className="inline-flex h-12 items-center justify-center rounded-pill bg-vyrek-accent px-6 text-base font-medium tracking-tight text-[#0A0A0A] transition-[background,transform] duration-fast ease-out hover:bg-vyrek-accent-hover active:scale-[0.98]"
        >
          Find your plan →
        </Link>
        <Link
          href="/pricing"
          className="inline-flex h-12 items-center justify-center px-2 text-sm text-vyrek-text-secondary underline-offset-4 hover:underline"
        >
          See pricing
        </Link>
      </div>
    </section>
  );
}
