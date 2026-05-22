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
  title: "Terms of service",
  description:
    "The agreement between you and Vyrek when you take a trial or subscribe. Plain English.",
};

export default function TermsPage() {
  return (
    <LegalLayout eyebrow="Terms" title="Terms of service">
      <ProseP>
        These terms govern your use of Vyrek. By taking the trial or
        subscribing, you accept them. They are written in plain English on
        purpose — if something is unclear, write to{" "}
        <ProseEmailLink email="support@vyrek.com" /> and we will clarify.
      </ProseP>

      <ProseH2>The service</ProseH2>
      <ProseP>
        Vyrek provides personalised Hyrox training programmes through a web
        platform. Programmes are 12 weeks. Plans recalibrate every Sunday
        based on the sessions you log. The service is currently web-based;
        native apps may follow.
      </ProseP>
      <ProseP>
        The service is not medical advice. Talk to a doctor before starting
        any training programme if you have a condition that may be affected by
        exercise.
      </ProseP>

      <ProseH2>Payment and trial</ProseH2>
      <ProseUl>
        <ProseLi>
          The trial is 7 days, free, no charge taken. We capture your payment
          method at the start of the trial; nothing is debited until day 8.
        </ProseLi>
        <ProseLi>
          The price is £4.99 per month, billed monthly in advance in pounds
          sterling, through Stripe.
        </ProseLi>
        <ProseLi>
          Prices may change. We will give you at least 30 days&apos; notice by
          email before any change applies to you. Continuing the subscription
          after the change date means you accept it.
        </ProseLi>
        <ProseLi>VAT, where applicable, is included in the listed price.</ProseLi>
      </ProseUl>

      <ProseH2>Cancellation</ProseH2>
      <ProseUl>
        <ProseLi>
          You can cancel at any time, in two taps, via the Stripe customer
          portal or by emailing <ProseEmailLink email="support@vyrek.com" />.
        </ProseLi>
        <ProseLi>
          Cancellation takes effect at the end of your current billing period.
          You keep access until then. We do not pro-rate part-month refunds.
        </ProseLi>
        <ProseLi>
          You can cancel during the free trial with no charge.
        </ProseLi>
      </ProseUl>

      <ProseH2>UK Consumer Contracts Regulations</ProseH2>
      <ProseP>
        Under the Consumer Contracts (Information, Cancellation and Additional
        Charges) Regulations 2013, you would normally have a 14-day cooling-off
        period for distance-sold services. By starting to use the training
        plan during your trial, you are asking us to begin the digital service
        immediately and you acknowledge that your right to cancel under
        Regulation 37(1)(a) ends as soon as the service has been accessed.
      </ProseP>
      <ProseP>
        Your statutory rights under the Consumer Rights Act 2015 remain
        unaffected. If the service is not as described or not delivered with
        reasonable skill, contact us — we will put it right or refund.
      </ProseP>

      <ProseH2>How you use the service</ProseH2>
      <ProseUl>
        <ProseLi>
          One account per person. You are responsible for keeping your login
          credentials secure.
        </ProseLi>
        <ProseLi>
          Do not share, resell, or sublicense your account or the training
          programmes.
        </ProseLi>
        <ProseLi>
          Do not scrape, mirror, or republish the workout content. The
          programmes are our intellectual property and are licensed to you for
          personal training only.
        </ProseLi>
        <ProseLi>
          Do not use the service for any unlawful purpose or to harass other
          members or coaches.
        </ProseLi>
      </ProseUl>
      <ProseP>
        We may suspend or terminate accounts that break these rules. If we do,
        we will explain why by email.
      </ProseP>

      <ProseH2>Intellectual property</ProseH2>
      <ProseP>
        Vyrek owns the platform, the programme structure, the workouts, and
        the brand. You own your personal data and the workout logs you create.
        Using the service does not transfer any rights in the programmes to
        you.
      </ProseP>

      <ProseH2>Liability</ProseH2>
      <ProseP>
        Nothing in these terms limits our liability for death or personal
        injury caused by our negligence, fraud, or any other liability that
        cannot be excluded under English law.
      </ProseP>
      <ProseP>
        Subject to that, our total liability under or in connection with these
        terms is capped at the fees you have paid us in the 12 months before
        the claim arose. We are not liable for indirect or consequential
        losses (lost profits, lost opportunities) that could not have been
        reasonably foreseen.
      </ProseP>

      <ProseH2>Referral programme</ProseH2>
      <ProseUl>
        <ProseLi>
          When a friend you refer converts from trial to a paid subscription,
          you earn £20.
        </ProseLi>
        <ProseLi>
          Bounty is paid by BACS to the account details you supply in your
          account, no earlier than 30 days after the referee&apos;s first paid
          invoice clears (to cover dispute windows).
        </ProseLi>
        <ProseLi>
          Maximum 50 successful referrals per calendar year per referrer.
        </ProseLi>
        <ProseLi>
          Self-referrals do not count. We check email and payment method.
        </ProseLi>
        <ProseLi>
          We may withhold or reverse bounties for fraud, chargebacks, or
          breach of these terms.
        </ProseLi>
      </ProseUl>

      <ProseH2>Governing law and disputes</ProseH2>
      <ProseP>
        These terms are governed by the laws of England and Wales. Disputes
        will be resolved in the courts of England and Wales, except that you
        may also bring proceedings in the courts of the country where you
        live if that right is given to you by law.
      </ProseP>
      <ProseP>
        For consumers in the EU/UK, you can also use the Online Dispute
        Resolution platform: <span className="break-all">ec.europa.eu/odr</span>.
      </ProseP>

      <ProseH3>Contact</ProseH3>
      <ProseP>
        Questions about these terms:{" "}
        <ProseEmailLink email="support@vyrek.com" />.
      </ProseP>
    </LegalLayout>
  );
}
