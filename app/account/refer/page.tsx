import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { ReferPanel } from "@/components/account/refer-panel";

export const metadata: Metadata = {
  title: "Refer & earn",
  description:
    "Refer a friend to Vyrek. When their trial converts to paid, we BACS £20 to your account within 5 business days.",
};

export default function ReferPage() {
  return (
    <>
      <MarketingNav />
      <ReferPanel />
      <MarketingFooter />
    </>
  );
}
