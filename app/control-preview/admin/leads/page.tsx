import { AdminShell } from "@/components/control/admin-shell";
import { ModuleNote } from "@/components/control/stat-strip";
import { LeadPipeline } from "@/components/control/lead-pipeline";

const BASE = "/control-preview/admin";

/**
 * LEADS — spec/09 §2.
 *
 * This page used to carry three things: a stat strip, a warning banner and a
 * sortable table, all driven by `LEAD_ROWS`, plus the pipeline underneath
 * driven by its own data. Two sources for one list, which is the same fault
 * that made the tracker and the clients page disagree, and it showed — the
 * strip counted four leads while the pipeline worked eight.
 *
 * So the pipeline is the page. It owns the leads and carries its own counts:
 * who needs Ben, who he is waiting on, who has gone quiet. That is what the
 * strip was for, now measured against the list actually on screen.
 */
/* Resolved per request, so "in 40 minutes" is measured from now rather than
   from whenever the site was last built. */
export const dynamic = "force-dynamic";

export default function AdminLeads() {
  return (
    <AdminShell base={BASE} title="Leads">
      <LeadPipeline nowISO={new Date().toISOString()} />
      <ModuleNote>
        Everything here is saved on this device. Sorting and CSV export came off
        with the old table, which was reading a different list from the one
        above; both come back once leads have a database rather than a fixture.
      </ModuleNote>
    </AdminShell>
  );
}
