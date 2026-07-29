import Link from "next/link";

export function PostFinalCta() {
  return (
    <section className="mt-16 overflow-hidden rounded-lg border border-suth-border-subtle bg-gradient-to-br from-suth-elevated via-suth-elevated to-suth-overlay p-6 md:p-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
        [ YOUR PLAN ]
      </p>
      <h2 className="mt-3 text-balance text-2xl font-black leading-tight tracking-[-0.025em] text-suth-text md:text-3xl">
        Want this written into your own 12-week plan?
      </h2>
      <p className="mt-3 max-w-md text-base leading-relaxed text-suth-text-secondary md:text-lg">
        Three-minute quiz, real Week 1 before you pay. Built by an Elite 15
        coach, calibrated to your kit and your race date.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href="/quiz"
          className="inline-flex h-12 items-center justify-center rounded-pill bg-suth-accent px-6 text-base font-medium tracking-tight text-[#0A0A0A] transition-[background,transform] duration-fast ease-out hover:bg-suth-accent-hover active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-text"
        >
          See your Week 1 free →
        </Link>
        <Link
          href="/pricing"
          className="inline-flex h-12 items-center justify-center rounded-pill border border-suth-border bg-transparent px-5 text-base font-medium text-suth-text transition-colors duration-fast ease-out hover:border-suth-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
        >
          See pricing
        </Link>
      </div>
    </section>
  );
}
