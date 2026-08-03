/**
 * Nation flags as inline SVG.
 *
 * Emoji flags look fine on macOS and iOS and render as **bare letter pairs on
 * Windows** — Chrome and Edge there ship no flag glyphs at all, so a British
 * athlete showed up as "GB" in a box. That is most desktop visitors seeing a
 * broken-looking table.
 *
 * These are simple geometric approximations, drawn to read correctly at 16px
 * in a dense row rather than to be heraldically exact. Each is a handful of
 * rects and paths, inlined, so there is no sprite to fetch and no layout shift
 * when it arrives.
 *
 * Adding a nation: add a case here and to NATION_CODE in format.ts. Anything
 * unmapped falls back to the three-letter code in a chip, which is honest and
 * still readable — never a blank space.
 */

import { nationCode } from "@/lib/results/format";

const VIEW = "0 0 24 16";

/** Union flag, simplified: the diagonals are drawn as plain crossbars. */
function GB() {
  return (
    <>
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0l24 16M24 0L0 16" stroke="#fff" strokeWidth="3.2" />
      <path d="M0 0l24 16M24 0L0 16" stroke="#C8102E" strokeWidth="1.6" />
      <path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="5.4" />
      <path d="M12 0v16M0 8h24" stroke="#C8102E" strokeWidth="3.2" />
    </>
  );
}

function tricolour(a: string, b: string, c: string, vertical = true) {
  return vertical ? (
    <>
      <rect width="8" height="16" fill={a} />
      <rect x="8" width="8" height="16" fill={b} />
      <rect x="16" width="8" height="16" fill={c} />
    </>
  ) : (
    <>
      <rect width="24" height="5.34" fill={a} />
      <rect y="5.34" width="24" height="5.33" fill={b} />
      <rect y="10.67" width="24" height="5.33" fill={c} />
    </>
  );
}

function nordicCross(field: string, cross: string) {
  return (
    <>
      <rect width="24" height="16" fill={field} />
      <rect x="7" width="3.2" height="16" fill={cross} />
      <rect y="6.4" width="24" height="3.2" fill={cross} />
    </>
  );
}

const FLAGS: Record<string, () => React.ReactElement> = {
  gb: GB,
  ie: () => tricolour("#169B62", "#fff", "#FF883E"),
  de: () => tricolour("#000", "#DD0000", "#FFCE00", false),
  es: () => (
    <>
      <rect width="24" height="16" fill="#AA151B" />
      <rect y="4" width="24" height="8" fill="#F1BF00" />
    </>
  ),
  nl: () => tricolour("#AE1C28", "#fff", "#21468B", false),
  se: () => nordicCross("#006AA7", "#FECC00"),
  us: () => (
    <>
      <rect width="24" height="16" fill="#fff" />
      {[0, 2, 4, 6].map((i) => (
        <rect key={i} y={i * 2.46} width="24" height="1.23" fill="#B31942" />
      ))}
      {[1, 3, 5].map((i) => (
        <rect key={i} y={i * 2.46} width="24" height="1.23" fill="#B31942" />
      ))}
      <rect width="10" height="8.6" fill="#0A3161" />
    </>
  ),
  in: () => (
    <>
      {tricolour("#FF9933", "#fff", "#138808", false)}
      <circle cx="12" cy="8" r="2.1" fill="none" stroke="#000088" strokeWidth="0.7" />
    </>
  ),
  hk: () => (
    <>
      <rect width="24" height="16" fill="#DE2910" />
      <circle cx="12" cy="8" r="3.4" fill="#fff" />
    </>
  ),
  sg: () => (
    <>
      <rect width="24" height="16" fill="#fff" />
      <rect width="24" height="8" fill="#ED2939" />
      <circle cx="6" cy="4" r="2.4" fill="#fff" />
      <circle cx="7.4" cy="4" r="2.4" fill="#ED2939" />
    </>
  ),
};

export function Flag({ iso, className }: { iso: string; className?: string }) {
  const code = (iso || "").toLowerCase();
  const Draw = FLAGS[code];

  if (!Draw) {
    // Unmapped nation: the code itself, which is more use than a blank box.
    return (
      <span
        aria-hidden
        className={
          "inline-flex h-4 w-6 shrink-0 items-center justify-center rounded-[2px] "
          + "border border-suth-border bg-suth-overlay font-mono text-[8px] "
          + "leading-none text-suth-text-tertiary "
          + (className ?? "")
        }
      >
        {nationCode(code).slice(0, 3)}
      </span>
    );
  }

  return (
    <svg
      viewBox={VIEW}
      aria-hidden
      focusable="false"
      className={
        "inline-block h-4 w-6 shrink-0 rounded-[2px] ring-1 ring-inset ring-white/15 "
        + (className ?? "")
      }
    >
      <Draw />
    </svg>
  );
}
