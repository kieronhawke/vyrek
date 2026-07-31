"use client";

/**
 * Back control for the full-bleed screens (the two reassurance
 * interstitials and Meet Ben), which sit outside QuizShell and so don't
 * get its header.
 *
 * Without this they are one-way doors: pressing back from the plan summary
 * lands on Meet Ben with no way to return to the sift. That breaks the
 * "back navigation always" hard rule, and it is the kind of dead end that
 * makes people close the tab rather than hunt for a way out.
 *
 * Positioned and sized to match the shell's own back button so it reads as
 * the same control, and floated over the image with a scrim for contrast.
 */
export function InterstitialBack({ onBack }: { onBack?: () => void }) {
  if (!onBack) return null;
  return (
    <button
      type="button"
      onClick={onBack}
      aria-label="Back"
      className="absolute left-3 top-[max(0.75rem,var(--safe-top))] z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-suth-base/60 text-suth-text-secondary backdrop-blur-sm transition-colors hover:bg-suth-base/80 hover:text-suth-text"
    >
      ←
    </button>
  );
}
