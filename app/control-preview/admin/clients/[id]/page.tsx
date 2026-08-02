import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/control/admin-shell";
import { ClientRecord } from "@/components/control/client-record";
import { CLIENTS } from "@/lib/control/fixtures";

const BASE = "/control-preview/admin";

/** One client, everything about them, and the actions that act on them. */
export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = CLIENTS.find((c) => c.id === id);
  if (!client) notFound();

  const slug = client.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <AdminShell base={BASE} title={client.name}>
      <p style={{ marginTop: 0, marginBottom: "var(--space-2)" }}>
        <Link
          href={`${BASE}/clients`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: 44,
            color: "var(--accent-text)",
            textDecoration: "none",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
          }}
        >
          ← All clients
        </Link>
      </p>
      <ClientRecord client={client} planHref={`${BASE}/plans/${slug}`} />
    </AdminShell>
  );
}
