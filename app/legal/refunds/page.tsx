import type { Metadata } from "next";
import { LegalLayout } from "@/components/shared/legal-layout";
import {
  ProseH2,
  ProseH3,
  ProseP,
  ProseUl,
  ProseLi,
  ProseEmailLink,
} from "@/components/shared/prose";

export const metadata: Metadata = {
  title: "Refund policy",
  description:
    "Vyrek refunds, in plain English. Friendly first, then the legal detail.",
};

export default function RefundsPage() {
  return (
    <LegalLayout eyebrow="Refunds" title="Refund policy">
      <ProseP>
        We want every Vyrek member to feel good about their subscription.
      </ProseP>
      <ProseP>
        If you signed up by accident, or you are not happy within the first
        48 hours of being charged, email us at{" "}
        <ProseEmailLink email="support@vyrek.com" /> and we will refund you.
        No questions.
      </ProseP>
      <ProseP>
        The free trial protects against accidental charges: you are never
        billed until day 8, so you have a full week to decide.
      </ProseP>

      <ProseH2>How to request a refund</ProseH2>
      <ProseUl>
        <ProseLi>
          Email <ProseEmailLink email="support@vyrek.com" /> from the email
          address on your Vyrek account.
        </ProseLi>
        <ProseLi>
          Include the last 4 digits of the card we charged (Stripe shows
          those on your receipt).
        </ProseLi>
        <ProseLi>
          Briefly explain the reason. A single sentence is fine.
        </ProseLi>
      </ProseUl>
      <ProseP>
        We reply within 24 hours, Monday to Friday. Refunds land on the
        original card within 5 to 10 business days, depending on your bank.
      </ProseP>

      <ProseH2>The legal bit</ProseH2>
      <ProseP>
        Under the UK Consumer Contracts (Information, Cancellation and
        Additional Charges) Regulations 2013, digital services accessed
        during the cooling-off period waive the statutory right to cancel.
      </ProseP>
      <ProseP>
        By starting your free trial, you agree to access the service
        immediately. This means we cannot offer a full refund for time you
        have already used the service.
      </ProseP>
      <ProseP>
        The 48-hour accidental-charge refund above is a goodwill policy that
        goes beyond our legal obligation. We offer it because it is the right
        thing to do, not because we have to.
      </ProseP>

      <ProseH2>When we always refund</ProseH2>
      <ProseUl>
        <ProseLi>
          <strong className="text-vyrek-text">Accidental charges.</strong> You
          meant to cancel during the trial but the charge went through and
          you have not opened a plan since. Refunded in full.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Service not as described.</strong>{" "}
          The platform failed to deliver what we describe (Week 1, dated plan,
          weekly recalibration). We fix it; if we cannot, you get a pro-rata
          refund for the unused portion of the month.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Payment errors.</strong> Double
          charges, currency conversion errors, or anything attributable to us
          or to Stripe. Refunded in full.
        </ProseLi>
      </ProseUl>

      <ProseH2>When we do not refund</ProseH2>
      <ProseUl>
        <ProseLi>
          You opened your plan and used the service, then changed your mind
          mid-month. Cancel anytime, access continues until the end of the
          billing period.
        </ProseLi>
        <ProseLi>
          You forgot to cancel before day 8 and you have used the service.
          You keep access until the end of the month.
        </ProseLi>
      </ProseUl>

      <ProseH2>Chargebacks</ProseH2>
      <ProseP>
        If a charge looks wrong, please email us first. We resolve nearly
        every issue within 24 hours, faster than a chargeback would. Lodging
        a chargeback without contacting us first may delay your refund and
        may suspend your account while Stripe investigates.
      </ProseP>

      <ProseH3>Contact</ProseH3>
      <ProseP>
        Refund queries: <ProseEmailLink email="support@vyrek.com" />.
      </ProseP>
    </LegalLayout>
  );
}
