import Link from "next/link";
import { listRealCoachClients } from "@/lib/coach/data";

export const dynamic = "force-dynamic";

/**
 * MY CLIENTS — everyone, alphabetical, with the two facts and the two
 * actions: write their plan, or message them.
 */
export default async function CoachClientsPage() {
  const clients = (await listRealCoachClients()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

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
        My clients
      </h1>

      <ul
        role="list"
        style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--space-2)" }}
      >
        {clients.length === 0 ? (
          <li style={{ color: "var(--text-muted)" }}>No clients yet.</li>
        ) : (
          clients.map((c) => (
            <li
              key={c.customerId}
              style={{
                padding: "var(--space-2)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                background: "var(--surface)",
              }}
            >
              <div style={{ fontWeight: 700 }}>{c.name}</div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                {c.email}
              </div>
              <div
                style={{
                  marginTop: 2,
                  fontSize: "var(--text-sm)",
                  color:
                    c.paymentTone === "danger"
                      ? "var(--danger)"
                      : c.paymentTone === "warn"
                        ? "var(--warn)"
                        : "var(--text-muted)",
                }}
              >
                {c.paymentLabel} · {c.planLabel}
              </div>
              <div style={{ display: "flex", gap: "var(--space-1)", marginTop: "var(--space-2)" }}>
                <Link
                  href={`/coach/plans/${c.customerId}`}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "10px 0",
                    borderRadius: 999,
                    background: "var(--accent)",
                    color: "#0A0A0A",
                    fontWeight: 700,
                    fontSize: "var(--text-sm)",
                    textDecoration: "none",
                  }}
                >
                  Their plan
                </Link>
                <Link
                  href={`/coach/messages?to=${c.customerId}`}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "10px 0",
                    borderRadius: 999,
                    border: "1px solid var(--border-strong)",
                    color: "var(--text)",
                    fontWeight: 600,
                    fontSize: "var(--text-sm)",
                    textDecoration: "none",
                  }}
                >
                  Message
                </Link>
              </div>
            </li>
          ))
        )}
      </ul>
    </>
  );
}
