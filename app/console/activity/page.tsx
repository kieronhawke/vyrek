import { AdminShell } from "@/components/control/admin-shell";
import { Activity } from "@/components/control/activity";
import { isoOf } from "@/lib/control/diary";

const BASE = "/console";

/**
 * ACTIVITY — spec/09 §10.
 *
 * Nothing is being collected: there is no analytics key in production, so the
 * 23 capture() calls in the app are no-ops. The screen is built against a seam
 * (lib/control/activity-sample.ts) that returns sample traffic today and real
 * traffic the moment a key exists — and it says which, above the numbers.
 */
export const dynamic = "force-dynamic";

export default function AdminActivity() {
  // Resolved once on the server and passed down, so the relative times in the
  // markup match the ones React hydrates with.
  const n = new Date();
  const today = isoOf(new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())));

  return (
    <AdminShell base={BASE} title="Activity">
      <Activity today={today} now={n.toISOString()} />
    </AdminShell>
  );
}
