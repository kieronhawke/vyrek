import { format } from "date-fns";
import { PageHeader, Card } from "@/components/admin/ui";
import { listRealCoachClients, recentMessages } from "@/lib/coach/data";
import { recentInboundMessages } from "@/lib/messaging/inbound";
import { CoachMessenger } from "@/components/coach/messenger";

export const dynamic = "force-dynamic";

export const metadata = { title: "Messages" };

/**
 * Outbound messages to clients. Write like a text; it lands as a branded
 * email from Ben with replies going straight to his inbox. Everything sent
 * is logged below. Reads/writes the real client_messages table.
 */
export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  const [clients, history, inbound] = await Promise.all([
    listRealCoachClients(),
    recentMessages(30),
    recentInboundMessages(20),
  ]);
  const nameById = new Map(clients.map((c) => [c.customerId, c.name] as const));

  return (
    <>
      <PageHeader
        eyebrow="Coaching"
        title="Messages"
        description="A note to a client. It arrives as a proper email from Ben; replies come back to his inbox."
      />

      <div className="max-w-2xl">
        {clients.length === 0 ? (
          <p className="text-sm text-suth-text-secondary">No clients to message yet.</p>
        ) : (
          <Card>
            <div className="mc-coach-embed">
              <CoachMessenger
                clients={clients
                  .map(({ customerId, name }) => ({ customerId, name }))
                  .sort((a, b) => a.name.localeCompare(b.name))}
                initialTo={to}
              />
            </div>
          </Card>
        )}

        {inbound.length > 0 ? (
          <section className="mt-8">
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
              Replies from clients
            </h2>
            <ul role="list" className="space-y-2">
              {inbound.map((m) => (
                <li
                  key={m.id}
                  className="rounded-xl border border-suth-accent/30 bg-suth-elevated p-4 text-sm"
                >
                  <p>
                    <strong className="text-suth-text">{m.fromNumber}</strong>
                    <span className="text-suth-text-tertiary">
                      {" "}
                      · {format(new Date(m.receivedISO), "d MMM, h:mmaaa")}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-suth-text-secondary">
                    {m.body}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {history.length > 0 ? (
          <section className="mt-8">
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
              Recently sent
            </h2>
            <ul role="list" className="space-y-2">
              {history.map((m) => (
                <li
                  key={m.id}
                  className="rounded-xl border border-suth-border bg-suth-elevated p-4 text-sm"
                >
                  <p>
                    <strong className="text-suth-text">
                      {nameById.get(m.customerId) ?? "Former client"}
                    </strong>
                    <span className="text-suth-text-tertiary">
                      {" "}
                      · {format(new Date(m.createdISO), "d MMM, h:mmaaa")}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-suth-text-secondary">
                    {m.body}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
