import type { LoggedSession } from "@/lib/member/demo";

function rpeTone(rpe: number): string {
  if (rpe <= 4) return "border-[color:var(--border)] bg-[var(--surface-raised)] text-[color:var(--ok)]";
  if (rpe <= 7) return "border-[color:var(--accent)]/30 bg-[var(--accent)]/10 text-[color:var(--accent)]";
  return "border-[color:var(--border)] bg-[var(--surface-raised)] text-[color:var(--danger)]";
}

export function RecentSessionList({ sessions }: { sessions: LoggedSession[] }) {
  return (
    <ul role="list" className="space-y-2">
      {sessions.map((s) => (
        <li
          key={s.id}
          className="rounded-lg border border-[color:var(--border)] bg-[var(--surface)]/60 p-4"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-[color:var(--text)]">{s.title}</p>
            <span className="shrink-0 font-mono text-[12px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
              {s.date}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
              {s.durationMin} min
            </span>
            <span
              className={`inline-flex items-center rounded-pill border px-2 py-0.5 font-mono text-[12px] uppercase tracking-[0.18em] ${rpeTone(s.rpe)}`}
            >
              RPE {s.rpe}
            </span>
            {s.splitVsPrev ? (
              <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-[color:var(--accent)]">
                {s.splitVsPrev} vs prior
              </span>
            ) : null}
          </div>
          {s.notes ? (
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--text-muted)]">
              {s.notes}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
