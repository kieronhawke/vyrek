import { AdminShell } from "@/components/control/admin-shell";
import { CoachTracker } from "@/components/control/coach-tracker";

const BASE = "/control-preview/admin";

/**
 * The coach tracker — the replacement for "Coaching Tracker.xlsx".
 *
 * Same four groups, same one job: who is programmed until when. The difference
 * is that it answers "who is due" before you scroll, and every row is a click
 * from the builder that fixes it.
 */
export default function TrackerPage() {
  return (
    <AdminShell base={BASE} title="Coach tracker">
      <CoachTracker base={BASE} />
    </AdminShell>
  );
}
