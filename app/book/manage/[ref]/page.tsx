import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { ManageBooking } from "@/components/booking/manage-booking";

export const metadata: Metadata = {
  title: "Your consultation",
  // Reachable with only a reference, so it must never be indexed.
  robots: { index: false, follow: false },
};

export default async function ManageBookingPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;

  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <div className="mx-auto max-w-3xl">
            <ManageBooking reference={ref} />
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
