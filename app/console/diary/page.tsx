import { AdminShell } from "@/components/control/admin-shell";
import { DiaryCalendar } from "@/components/control/diary-calendar";
import { ModuleNote } from "@/components/control/stat-strip";
import { isoOf } from "@/lib/control/diary";

const BASE = "/console";

/**
 * DIARY — spec/09 §7.
 *
 * Was a four-column table of appointments. A table answers "what is booked";
 * it cannot answer "when am I free on Thursday", which is the only question
 * anyone opens a calendar to ask.
 *
 * Rendered per request rather than at build so "Today" is today. The page is
 * noindex and behind the console, so there is nothing to cache anyway.
 */
export const dynamic = "force-dynamic";

export default function AdminDiary() {
  // Resolved on the server and passed down, so the client cannot disagree with
  // the markup it hydrates — a calendar whose today moves between the two
  // renders is the same hydration failure that discarded the plan builder.
  const now = new Date();
  const today = isoOf(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));

  return (
    <AdminShell base={BASE} title="Diary">
      <DiaryCalendar today={today} />
      <ModuleNote>
        Entries are real and saved on this device. Two-way Google Calendar sync
        and the reminders themselves need Phase F and a Resend/Twilio
        credential — whether Ben uses Google Calendar at all is still open
        (QUESTIONS §14) and changes the integration route if not.
      </ModuleNote>
    </AdminShell>
  );
}
