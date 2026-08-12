import { listRealCoachClients, recentMessages } from "@/lib/coach/data";
import { CoachMessenger } from "@/components/coach/messenger";

export const dynamic = "force-dynamic";

/**
 * MESSAGES — outbound, honest about it. Ben writes like he texts; it
 * lands as a branded email with reply-to set to him, and everything sent
 * from here is listed below so he can see what he last said.
 */
export default async function CoachMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  const [clients, history] = await Promise.all([
    listRealCoachClients(),
    recentMessages(20),
  ]);
  const nameById = new Map(clients.map((c) => [c.customerId, c.name] as const));

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
        Messages
      </h1>

      {clients.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No clients to message yet.</p>
      ) : (
        <CoachMessenger
          clients={clients
            .map(({ customerId, name }) => ({ customerId, name }))
            .sort((a, b) => a.name.localeCompare(b.name))}
          initialTo={to}
        />
      )}

      {history.length > 0 ? (
        <section style={{ marginTop: "var(--space-4)" }}>
          <h2 style={{ fontSize: "var(--text-md)", fontWeight: 800, margin: "0 0 var(--space-2)" }}>
            Recently sent
          </h2>
          <ul role="list" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {history.map((m) => (
              <li
                key={m.id}
                style={{
                  padding: "var(--space-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  background: "var(--surface)",
                  fontSize: "var(--text-sm)",
                }}
              >
                <strong>{nameById.get(m.customerId) ?? "Former client"}</strong>
                <span style={{ color: "var(--text-muted)" }}>
                  {" "}
                  ·{" "}
                  {new Date(m.createdISO).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{m.body}</div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
