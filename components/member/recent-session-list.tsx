import type { LoggedSession } from "@/lib/member/demo";

function rpeTone(rpe: number): string {
  if (rpe <= 4) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (rpe <= 7) return "border-vyrek-accent/30 bg-vyrek-accent/10 text-vyrek-accent";
  return "border-red-500/30 bg-red-500/10 text-red-300";
}

export function RecentSessionList({ sessions }: { sessions: LoggedSession[] }) {
  return (
    <ul role="list" className="space-y-2">
      {sessions.map((s) => (
        <li
          key={s.id}
          className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated/60 p-4"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-vyrek-text">{s.title}</p>
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
              {s.date}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
              {s.durationMin} min
            </span>
            <span
              className={`inline-flex items-center rounded-pill border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${rpeTone(s.rpe)}`}
            >
              RPE {s.rpe}
            </span>
            {s.splitVsPrev ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-accent">
                {s.splitVsPrev} vs prior
              </span>
            ) : null}
          </div>
          {s.notes ? (
            <p className="mt-2 text-sm leading-relaxed text-vyrek-text-secondary">
              {s.notes}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
