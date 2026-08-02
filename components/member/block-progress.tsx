import { DEMO_TODAY, DEMO_WEEKS } from "@/lib/member/demo";

/**
 * Week 4 of 12, with a ring, in the chrome of every screen.
 *
 * Runna keeps this in the top bar of the whole app and it is the single most
 * useful piece of context it shows (docs/design/app-references.md §1.1). Ours
 * lived on the Plan screen only, so five of the six screens gave the athlete no
 * sense of where they were in the block Ben had written.
 */
export function BlockProgress({ compact = false }: { compact?: boolean }) {
  const total = DEMO_WEEKS.length;
  const current = DEMO_TODAY.weekNumber;
  const pct = Math.round((current / total) * 100);
  const r = 8;
  const circ = 2 * Math.PI * r;

  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
      title={`Week ${current} of ${total} of your training block`}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
        <circle cx="10" cy="10" r={r} fill="none" stroke="var(--border-strong)" strokeWidth="2.5" />
        <circle
          cx="10"
          cy="10"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${(circ * pct) / 100} ${circ}`}
          transform="rotate(-90 10 10)"
        />
      </svg>
      <span
        style={{
          fontSize: "var(--text-xs)",
          fontWeight: 650,
          color: "var(--text)",
          whiteSpace: "nowrap",
        }}
      >
        {compact ? `${current}/${total}` : `Week ${current} of ${total}`}
      </span>
      <span className="sr-only">of your training block</span>
    </span>
  );
}
