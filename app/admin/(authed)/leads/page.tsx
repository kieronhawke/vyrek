import { PageHeader } from "@/components/admin/ui";
import { LeadsList } from "@/components/control/leads-list";
import { leadStoreReady, recentLeads } from "@/lib/leads/store";

export const dynamic = "force-dynamic";

export const metadata = { title: "Enquiries" };

/**
 * The middle of the journey.
 *
 * Somebody enquires, Ben gets an email and a text, and until now that was
 * the end of the trail — if he archived the email the lead was gone, and
 * nothing anywhere listed who had asked and not yet been called back.
 *
 * The rows carry the whole next step: ring them, read the full request,
 * and send the account setup link once they have said yes.
 */
export default async function AdminLeadsPage() {
  const leads = await recentLeads(100);

  return (
    <>
      <PageHeader
        eyebrow="Today"
        title="Enquiries"
        description="Everyone who has asked for a consultation, newest first. Call them, then send the account setup link."
      />
      <LeadsList leads={leads} durable={leadStoreReady()} />
    </>
  );
}
