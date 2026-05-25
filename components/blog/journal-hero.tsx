import Link from "next/link";

/**
 * Top of /blog, eyebrow + headline + sub + dual CTA. Establishes the
 * editorial tone before the featured post card.
 */
export function JournalHero({ postCount }: { postCount: number }) {
  return (
    <section aria-labelledby="journal-hero-heading" className="mt-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
        [ THE JOURNAL · {postCount.toString().padStart(2, "0")} GUIDES ]
      </p>
      <h1
        id="journal-hero-heading"
        className="mt-4 text-balance text-4xl font-black leading-[1.02] tracking-[-0.045em] text-vyrek-text md:text-6xl lg:text-7xl"
      >
        Hyrox, written by{" "}
        <span className="relative whitespace-nowrap">
          <span className="relative z-10">the people</span>
          <span
            aria-hidden
            className="absolute inset-x-0 -bottom-1 h-3 -skew-x-12 bg-vyrek-accent/30 md:h-4"
          />
        </span>{" "}
        who race it.
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-vyrek-text-secondary md:text-xl">
        Practical training plans, station-by-station technique, race-day
        pacing, recovery science. Written by the Elite 15 coach who
        programme our 12-week plans. Plain English, no fluff.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/quiz"
          className="inline-flex h-12 items-center justify-center rounded-pill bg-vyrek-accent px-6 text-base font-medium tracking-tight text-[#0A0A0A] transition-[background,transform] duration-fast ease-out hover:bg-vyrek-accent-hover active:scale-[0.98]"
        >
          Find your plan →
        </Link>
        <a
          href="/blog/rss.xml"
          className="inline-flex h-12 items-center gap-2 rounded-pill border border-vyrek-border bg-vyrek-elevated px-5 text-sm font-medium text-vyrek-text transition-colors hover:border-vyrek-border-strong"
        >
          <svg
            aria-hidden
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-vyrek-accent"
          >
            <path d="M4 11a9 9 0 0 1 9 9" />
            <path d="M4 4a16 16 0 0 1 16 16" />
            <circle cx="5" cy="19" r="1" />
          </svg>
          <span>Subscribe via RSS</span>
        </a>
      </div>
    </section>
  );
}
