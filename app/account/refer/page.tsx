import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata = { title: "Refer a friend" };

export default function ReferPlaceholder() {
  return (
    <>
      <MarketingNav />
      <ComingSoon
        eyebrow="Refer & earn"
        title="Refer a friend. Earn £20."
        description="When a friend's trial converts to paid, we BACS you £20 within 5 business days. Your referral hub goes live once you've started your trial."
      />
      <MarketingFooter />
    </>
  );
}
