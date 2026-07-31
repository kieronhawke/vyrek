import { Num } from "@/components/control/num";
import type { PlanSession } from "@/lib/client-app/member-fixtures";

const TONE: Record<PlanSession["status"], string> = {
  done: "var(--accent)",
  today: "var(--accent)",
  upcoming: "var(--border-strong)",
  missed: "var(--danger)",
};

/**
 * A session, as a card. The Home tab's version is the signature element of
 * the client app (spec/14 §7): one primary object, unmissable, one tap to
 * start.
 */
export function SessionCard({
  session,
  hero = false,
}: {
  session: PlanSession;
  hero?: boolean;
}) {
  const rest = session.type === "Rest";
  return (
    <article
      style={{
        background: hero ? "var(--surface)" : "var(--surface)",
        border: `1px solid ${hero ? "var(--accent)" : "var(--border)"}`,
        borderLeft: hero ? undefined : `3px solid ${TONE[session.status]}`,
        borderRadius: "var(--radius-card)",
        padding: hero ? "var(--space-3)" : "var(--space-2)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "var(--space-2)",
        }}
      >
        <span className="eyebrow">
          {session.day} · {session.date}
        </span>
        {!rest ? (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            <Num align="left">{session.durationMin}</Num> min
          </span>
        ) : null}
      </div>

      <h3
        style={{
          fontSize: hero ? "var(--text-xl)" : "var(--text-base)",
          fontWeight: hero ? 800 : 600,
          letterSpacing: hero ? "-0.02em" : undefined,
          margin: "var(--space-1) 0 0",
        }}
      >
        {session.title}
      </h3>

      {session.exercises.length > 0 ? (
        <ul
          role="list"
          style={{
            listStyle: "none",
            margin: "var(--space-2) 0 0",
            padding: 0,
            display: "grid",
            gap: 4,
          }}
        >
          {session.exercises.map((e) => (
            <li
              key={e.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "var(--space-2)",
                fontSize: "var(--text-sm)",
                color: "var(--text-muted)",
              }}
            >
              <span>{e.name}</span>
              <span className="num" style={{ color: "var(--text)" }}>
                {e.detail}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p
          style={{
            margin: "var(--space-1) 0 0",
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
          }}
        >
          Rest day. Genuinely part of the plan.
        </p>
      )}
    </article>
  );
}
