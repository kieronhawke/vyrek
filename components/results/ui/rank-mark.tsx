import { cn } from "@/lib/utils";

/**
 * Rank marks for the top three.
 *
 * The reference site stylises its podium numerals into a custom glyph set —
 * it is a small thing that makes their boards feel designed rather than
 * printed. This is our own answer to the same problem, not a copy of theirs:
 * the numeral stays a plain tabular numeral (a leaderboard where you cannot
 * read the rank is a failed leaderboard) and the *frame* around it carries the
 * meaning.
 *
 * First takes a filled chartreuse chip; second and third take the bracket
 * motif already used for the section's micro-labels, weighted differently.
 * Everything below the podium is an unadorned numeral so the top three read
 * instantly on a board of three thousand.
 *
 * Colour is never the only signal — position, weight and frame all differ, so
 * this survives greyscale and any colour vision.
 */
export function RankMark({
  rank, className, size = "sm",
}: {
  rank: number;
  className?: string;
  size?: "sm" | "lg";
}) {
  const dimensions = size === "lg" ? "h-7 min-w-7 text-sm" : "h-5 min-w-5 text-xs";

  if (rank === 1) {
    return (
      <span
        className={cn(
          "results-num inline-flex items-center justify-center rounded-sm px-1",
          "bg-suth-accent font-semibold text-suth-base",
          dimensions,
          className,
        )}
      >
        {rank}
      </span>
    );
  }

  if (rank === 2 || rank === 3) {
    return (
      <span
        className={cn(
          "results-num inline-flex items-center justify-center rounded-sm px-1",
          "border text-suth-text",
          rank === 2
            ? "border-suth-accent/50 bg-suth-accent/10"
            : "border-suth-border-strong bg-suth-overlay",
          dimensions,
          className,
        )}
      >
        {rank}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "results-num inline-flex items-center justify-center text-suth-text-tertiary",
        dimensions,
        className,
      )}
    >
      {rank}
    </span>
  );
}
