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
    "When Vyrek refunds, and when we do not. UK Consumer Contracts Regulations explained in plain English.",
};

export default function RefundsPage() {
  return (
    <LegalLayout eyebrow="Refunds" title="Refund policy">
      <ProseP>
        Vyrek is a digital subscription service. The trial is designed to
        protect against accidental charges — no payment is taken until day 8.
        This policy explains the few situations where we issue a refund and
        how to request one.
      </ProseP>

      <ProseH2>The statutory position</ProseH2>
      <ProseP>
        Under the UK Consumer Contracts (Information, Cancellation and
        Additional Charges) Regulations 2013, distance-sold services normally
        carry a 14-day cooling-off period. For digital services that you
        access immediately, this right ends as soon as you start using the
        service (Regulation 37(1)(a)).
      </ProseP>
      <ProseP>
        At the email gate, before you see your plan, we ask you to acknowledge
        that the service starts as soon as you view your Week 1. That means
        the statutory cooling-off period does not apply once you have opened
        your plan.
      </ProseP>

      <ProseH2>When we refund</ProseH2>
      <ProseUl>
        <ProseLi>
          <strong className="text-vyrek-text">Accidental charges.</strong> If
          you intended to cancel during the trial but the charge went through,
          email us within 48 hours of the charge. If you have not opened a
          plan since the charge, we refund in full.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">
            Service not as described.
          </strong>{" "}
          If the platform fails to deliver what we describe (Week 1, dated
          plan, weekly recalibration), tell us. We will fix it; if we
          cannot, you get a pro-rata refund for the unused portion of the
          month.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Payment errors.</strong> Double
          charges, currency conversion errors, or any error attributable to us
          or to Stripe, refunded in full.
        </ProseLi>
      </ProseUl>

      <ProseH2>When we do not refund</ProseH2>
      <ProseUl>
        <ProseLi>
          You opened your plan and used the service, then changed your mind
          mid-month. Cancel anytime — access continues until the end of the
          billing period.
        </ProseLi>
        <ProseLi>
          You forgot to cancel before day 8 and you have used the service. You
          keep access until the end of the month.
        </ProseLi>
      </ProseUl>

      <ProseH2>How to request a refund</ProseH2>
      <ProseUl>
        <ProseLi>
          Email <ProseEmailLink email="support@vyrek.com" /> from the email
          address on your account.
        </ProseLi>
        <ProseLi>
          Include the date of the charge and the last four digits of the card
          (Stripe gives you those on your receipt).
        </ProseLi>
        <ProseLi>
          Briefly explain the reason. We reply within 24 hours, Monday to
          Friday.
        </ProseLi>
      </ProseUl>
      <ProseP>
        Refunds land on the original card within 5 to 10 business days,
        depending on your bank.
      </ProseP>

      <ProseH2>Chargebacks</ProseH2>
      <ProseP>
        If a charge looks wrong, please email us first. We resolve almost
        every case faster than a chargeback would. Lodging a chargeback without
        contacting us first may delay your refund and may suspend your
        account while Stripe investigates.
      </ProseP>

      <ProseH3>Contact</ProseH3>
      <ProseP>
        Refund queries: <ProseEmailLink email="support@vyrek.com" />.
      </ProseP>
    </LegalLayout>
  );
}
