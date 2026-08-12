import { PageHeader } from "@/components/admin/ui";
import { ResetTestData } from "@/components/admin/reset-test-data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings" };

export default function AdminSettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        description="Housekeeping for the admin. More will live here over time."
      />
      <div className="max-w-2xl">
        <ResetTestData />
      </div>
    </>
  );
}
