import { AdminShell } from "@/components/control/admin-shell";
import { ClientIntake } from "@/components/control/client-intake";
import { Suspense } from "react";
import { ClientHub } from "@/components/control/client-hub";
import { ClientsManager } from "@/components/control/clients-manager";

const BASE = "/control-preview/admin";

/**
 * CLIENTS — the first module you can actually work rather than read.
 *
 * The table this replaces rendered a fixture and could not be changed. Adding,
 * editing and removing a client now persists across reloads through
 * lib/control/store.ts, whose driver swaps for a real database in one file.
 */
export default function AdminClients() {
  return (
    <AdminShell base={BASE} title="Clients">
      {/* The hub is the screen. Adding a client is a thing you do
          occasionally, so it sits at the bottom rather than being the first
          thing between you and the list. */}
      {/* useSearchParams opts the subtree into client rendering, so it
          needs a boundary or the whole page refuses to prerender. */}
      <Suspense fallback={<p className="ch-empty">Loading clients…</p>}>
        <ClientHub base={BASE} />
      </Suspense>

      <details className="ch-more">
        <summary>Add a client, or edit the list directly</summary>
        <ClientIntake />
        <ClientsManager base={BASE} />
      </details>
    </AdminShell>
  );
}
