import { AdminShell } from "@/components/control/admin-shell";
import { ClientIntake } from "@/components/control/client-intake";
import { ClientHub } from "@/components/control/client-hub";
import { ClientsManager } from "@/components/control/clients-manager";
import { isLens, type Lens } from "@/lib/control/client-hub";

const BASE = "/control-preview/admin";

/**
 * CLIENTS — the first module you can actually work rather than read.
 *
 * The table this replaces rendered a fixture and could not be changed. Adding,
 * editing and removing a client now persists across reloads through
 * lib/control/store.ts, whose driver swaps for a real database in one file.
 */
export default async function AdminClients({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /*
   * The lens is read here rather than with useSearchParams in the hub.
   *
   * useSearchParams opts its whole subtree out of prerendering, so the hub
   * needed a Suspense boundary and the server rendered nothing but "Loading
   * clients" — on the screen Ben opens most. Reading the query on the server
   * and passing it down gives him the list immediately, and /tracker's
   * redirect to ?lens=needs_plan still lands on the view it existed to show.
   */
  const params = await searchParams;
  const raw = Array.isArray(params.lens) ? params.lens[0] : params.lens;
  const lens: Lens = isLens(raw) ? raw : "all";

  return (
    <AdminShell base={BASE} title="Clients">
      {/* The hub is the screen. Adding a client is a thing you do
          occasionally, so it sits at the bottom rather than being the first
          thing between you and the list. */}
      <ClientHub base={BASE} lens={lens} />

      <details className="ch-more">
        <summary>Add a client, or edit the list directly</summary>
        <ClientIntake />
        <ClientsManager base={BASE} />
      </details>
    </AdminShell>
  );
}
