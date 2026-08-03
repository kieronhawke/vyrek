"use client";

/**
 * The one client interaction on an otherwise fully server-rendered report.
 *
 * `window.print()` needs a handler, and this is the only thing on the page that
 * does — so it stays a five-line island rather than pulling the whole report
 * across the client boundary. The report itself has no state and nothing to
 * hydrate, which is why it loads as fast as it does.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      data-inline-tap
      className="inline-flex min-h-[40px] items-center rounded-sm bg-suth-accent px-4 text-xs
                 font-semibold text-suth-base transition-colors hover:bg-suth-accent-hover
                 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
    >
      Save as PDF
    </button>
  );
}
