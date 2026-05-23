import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { PartnerApplicationForm } from "@/components/partners/application-form";

export const metadata: Metadata = {
  title: "Apply to the Vyrek Partner Programme",
  description:
    "Apply to join the Vyrek Partner Programme. 11 quick questions. We reply within 48 hours.",
  robots: { index: true, follow: true },
};

export default function PartnersApplyPage() {
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-32 md:pt-40">
        <Container>
          <div className="mx-auto max-w-2xl">
            <Eyebrow>Application</Eyebrow>
            <h1 className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl">
              Apply to join.
            </h1>
            <p className="mt-5 text-base text-vyrek-text-secondary md:text-lg">
              Takes about 3 minutes. We reply within 48 hours, Monday to
              Friday.
            </p>

            <PartnerApplicationForm />
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
