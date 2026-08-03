/**
 * Meta descriptions that fit.
 *
 * Written 2026-08-03 after a crawl of all 294 non-location pages found 84
 * descriptions past 160 characters, the worst at 233. Google truncates
 * around 155-160, and what gets cut is always the end, which is where the
 * useful part of ours tends to be.
 *
 * Clipping mid-word reads like a bug, so this prefers a sentence boundary,
 * falls back to a word boundary, and only then gives up and hard-cuts.
 * It never appends an ellipsis to a sentence that ended cleanly.
 */
const MAX = 158;

export function clampDescription(text: string, max: number = MAX): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;

  // Prefer the last sentence that ends inside the budget.
  const window = clean.slice(0, max + 1);
  const lastSentence = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? "),
  );
  // Only worth it if it keeps nearly all of the budget. At a lower bar this
  // quietly binned the second sentence of every event description whose
  // first sentence happened to clear it, which is how the most useful half
  // of a dozen of them disappeared. Losing a clause to a word boundary beats
  // losing a whole sentence.
  if (lastSentence >= max * 0.85) return clean.slice(0, lastSentence + 1);

  const lastSpace = window.lastIndexOf(" ");
  const cut = lastSpace > 0 ? lastSpace : max;
  return `${clean.slice(0, cut).replace(/[,;:]$/, "")}…`;
}
