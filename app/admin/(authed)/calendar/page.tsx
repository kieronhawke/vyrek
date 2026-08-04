import { PageHeader } from "@/components/admin/ui";
import { BookingCalendar } from "@/components/control/booking-calendar";

export const dynamic = "force-dynamic";

export const metadata = { title: "Consultations" };

export default function AdminCalendarPage() {
  return (
    <>
      <PageHeader
        eyebrow="Diary"
        title="Consultations"
        description="What's booked in, and when people can book you. Moving or cancelling a call emails and texts them straight away."
      />
      <BookingCalendar />
    </>
  );
}
