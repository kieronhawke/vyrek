import Link from "next/link";
import { AdminShell } from "@/components/control/admin-shell";
import { ClientProfile } from "@/components/control/client-profile";
import { isoOf } from "@/lib/control/diary";

const BASE = "/console";

/**
 * ONE CLIENT — everything about them, in the order Ben needs it.
 *
 * The id is the roster's. The tracker and the client hub are two views of one
 * list now, so there is only one id space and a card on either screen resolves
 * here.
 *
 * Rendered per request so "programmed until" is measured against today rather
 * than against whenever the site was last built.
 */
export const dynamic = "force-dynamic";

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Resolved on the server and passed down, so the client cannot disagree with
  // the markup it hydrates.
  const n = new Date();
  const today = isoOf(new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())));

  return (
    <AdminShell base={BASE} title="Client">
      <p style={{ marginTop: 0, marginBottom: "var(--space-2)" }}>
        <Link href={`${BASE}/clients`} className="cp-back">
          ← All clients
        </Link>
      </p>
      <ClientProfile id={id} base={BASE} today={today} />
    </AdminShell>
  );
}
