/**
 * Circular progress indicator for the quiz. Top-right of the question shell.
 * Inline SVG, no JS animation needed; CSS transitions on stroke-dashoffset.
 */
export function ProgressArc({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const pct = Math.min(1, Math.max(0, current / total));
  const r = 14;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative flex h-9 w-9 items-center justify-center">
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="var(--vyrek-border-default)"
          strokeWidth="2"
        />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="var(--vyrek-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 18 18)"
          style={{ transition: "stroke-dashoffset 320ms var(--ease-out)" }}
        />
      </svg>
      <span className="absolute font-mono text-[10px] font-medium tabular-nums text-vyrek-text">
        {current}/{total}
      </span>
    </div>
  );
}
