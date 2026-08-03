import { AdminShell } from "@/components/control/admin-shell";
import { ClientIntake } from "@/components/control/client-intake";
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
      <ClientIntake />
      <ClientsManager base={BASE} />
    </AdminShell>
  );
}
