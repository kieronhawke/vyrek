import { AdminShell } from "@/components/control/admin-shell";
import { Dashboard } from "@/components/control/dashboard";

const BASE = "/control-preview/admin";

/**
 * The operator dashboard.
 *
 * Replaces four numbers and three bars on an otherwise empty page with the
 * queue of work a coach opens a console to find, then the money, then what is
 * on, then what has happened. Every row links to where the problem is fixed.
 */
export default function AdminDashboard() {
  return (
    <AdminShell base={BASE} title="Dashboard">
      <Dashboard base={BASE} />
    </AdminShell>
  );
}
