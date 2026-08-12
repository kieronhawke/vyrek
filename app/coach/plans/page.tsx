import Link from "next/link";
import {
  listRealCoachClients,
  sortForCoachToday,
} from "@/lib/coach/data";

export const dynamic = "force-dynamic";

/**
 * PLANS — the queue, worst first: never-programmed at the top, then
 * overdue, then whoever runs out soonest. Tap a person, write the week,
 * press send.
 */
export default async function CoachPlansPage() {
  const clients = sortForCoachToday(await listRealCoachClients());

  return (
    <>
      <h1
        style={{
          fontSize: "var(--text-xl)",
          lineHeight: "var(--text-xl-lh)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          margin: "0 0 var(--space-3)",
        }}
      >
        Plans
      </h1>

      <ul
        role="list"
        style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--space-2)" }}
      >
        {clients.length === 0 ? (
          <li style={{ color: "var(--text-muted)" }}>No clients yet.</li>
        ) : (
          clients.map((c) => (
            <li key={c.customerId}>
              <Link
                href={`/coach/plans/${c.customerId}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "var(--space-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  background: "var(--surface)",
                  textDecoration: "none",
                  color: "var(--text)",
                }}
              >
                <span style={{ fontWeight: 700 }}>{c.name}</span>
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    whiteSpace: "nowrap",
                    color:
                      c.planTone === "danger"
                        ? "var(--danger)"
                        : c.planTone === "warn"
                          ? "var(--warn)"
                          : "var(--text-muted)",
                  }}
                >
                  {c.planLabel} →
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </>
  );
}
