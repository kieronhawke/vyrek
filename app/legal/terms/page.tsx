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
        purpose. If something is unclear, write to{" "}
        <ProseEmailLink email="support@vyrek.com" /> and we will clarify.
      </ProseP>

      <ProseH2>Who we are</ProseH2>
      <ProseP>
        Vyrek is a Hyrox training platform operated from the United Kingdom.
        Where these terms refer to &ldquo;we&rdquo; or &ldquo;us&rdquo;, that
        means the Vyrek team. Where they refer to &ldquo;you&rdquo;, that
        means the person taking the trial or holding the subscription.
      </ProseP>

      <ProseH2>The service</ProseH2>
      <ProseP>
        Vyrek provides personalised Hyrox training programmes through a web
        platform. Programmes are 12 weeks. Plans recalibrate every Sunday
        based on the sessions you log. The service is currently web-based;
        native apps may follow. We may add, change, or remove features as the
        product evolves; any change that materially reduces the service is
        announced in advance.
      </ProseP>
      <ProseP>
        The service is not medical advice. Talk to a doctor before starting
        any training programme if you have a condition that may be affected by
        exercise. Train within your limits; warm up; listen to your body. You
        train at your own risk.
      </ProseP>

      <ProseH2>Accounts</ProseH2>
      <ProseUl>
        <ProseLi>
          One account per person. You are responsible for keeping your login
          credentials secure.
        </ProseLi>
        <ProseLi>
          You must be at least 16 years old to use Vyrek. We do not knowingly
          accept accounts for anyone younger.
        </ProseLi>
        <ProseLi>
          Tell us at <ProseEmailLink email="support@vyrek.com" /> as soon as
          you suspect unauthorised access. We will help secure the account.
        </ProseLi>
      </ProseUl>

      <ProseH2>Payment and trial</ProseH2>
      <ProseUl>
        <ProseLi>
          The trial is 7 days, free, no charge taken. We capture your payment
          method at the start of the trial; nothing is debited until day 8.
        </ProseLi>
        <ProseLi>
          The price is £8.99 per month, billed monthly in advance in pounds
          sterling, through Stripe. You authorise us to charge your payment
          method automatically on each renewal date until cancelled.
        </ProseLi>
        <ProseLi>
          Prices may change. We will give you at least 30 days&apos; notice by
          email before any change applies to you. Continuing the subscription
          after the change date means you accept it; if you do not, cancel
          before the change takes effect.
        </ProseLi>
        <ProseLi>
          VAT, where applicable, is included in the listed price.
        </ProseLi>
        <ProseLi>
          Failed payments trigger a retry over 7 days. If the retry fails,
          access pauses until the payment method is updated.
        </ProseLi>
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
        <ProseLi>You can cancel during the free trial with no charge.</ProseLi>
        <ProseLi>
          After cancellation we keep your training data for 90 days in case
          you return, then delete it (see the{" "}
          <a
            className="text-vyrek-text underline underline-offset-4 hover:text-vyrek-accent"
            href="/legal/privacy"
          >
            Privacy policy
          </a>
          ).
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
        reasonable skill, contact us; we will put it right or refund. See the{" "}
        <a
          className="text-vyrek-text underline underline-offset-4 hover:text-vyrek-accent"
          href="/legal/refunds"
        >
          Refund policy
        </a>{" "}
        for detail.
      </ProseP>

      <ProseH2>How you use the service</ProseH2>
      <ProseUl>
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
          Do not reverse engineer, decompile, or attempt to extract source code
          from the service.
        </ProseLi>
        <ProseLi>
          Do not use the service for any unlawful purpose or to harass other
          members, partners, or coaches.
        </ProseLi>
        <ProseLi>
          Do not interfere with the service: no DoS attempts, no abusive
          crawling, no spam through coach messaging or community features.
        </ProseLi>
      </ProseUl>
      <ProseP>
        We may suspend or terminate accounts that break these rules. If we do,
        we will explain why by email and (where appropriate) give you a chance
        to remedy.
      </ProseP>

      <ProseH2>Intellectual property</ProseH2>
      <ProseP>
        Vyrek owns the platform, the programme structure, the workouts, the
        editorial content (the Journal), and the brand. You own your personal
        data and the workout logs you create. Using the service does not
        transfer any rights in the programmes to you. You grant us a
        non-exclusive licence to process the data you submit so we can deliver
        and improve the service.
      </ProseP>

      <ProseH2>Health and safety</ProseH2>
      <ProseP>
        Vyrek delivers training programmes online, not medical advice. The
        sessions are designed for adults in reasonable health. If you have a
        medical condition, an injury, or any reason to consult a clinician
        before starting a new training programme, you should do so before
        joining a plan. You can pause your subscription at any time while you
        wait for that advice.
      </ProseP>
      <ProseP>
        You are responsible for performing the exercises with appropriate
        technique, in a safe environment, and at an intensity that reflects
        your current fitness. If a session feels unsafe, stop it. The app
        includes a self-report flag on every workout that lets you log the
        session as skipped, modified, or stopped early; the planner adjusts
        the following week based on what you record.
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
      <ProseP>
        We are also not liable for failures caused by events outside our
        reasonable control. That includes outages of our infrastructure
        providers (Vercel, Supabase, Stripe, Resend), national or regional
        internet disruptions, third-party service deprecation, and any other
        force majeure event. Where such an event prevents you from accessing
        the service for more than 72 consecutive hours, you may request a
        pro-rata credit for the lost time and we will apply it to your next
        invoice.
      </ProseP>

      <ProseH2>Service availability</ProseH2>
      <ProseP>
        We target 99.9% availability for the member app and 99.5% for the
        marketing site, calculated monthly. We do not commit to a contractual
        SLA at this price point, but we publish status updates at the bottom
        of the contact page when incidents affect a meaningful number of
        members. Planned maintenance is announced in advance via the app and
        scheduled outside peak training times (06:00-09:00 and 17:00-21:00
        UK time) wherever possible.
      </ProseP>

      <ProseH2>Member referrals</ProseH2>
      <ProseP>
        Any Vyrek member can refer a friend from their account. When the
        friend you refer converts from trial to a paid subscription, you earn
        £20.
      </ProseP>
      <ProseUl>
        <ProseLi>
          The £20 is paid by BACS to the account details you supply in your
          account, no earlier than 30 days after the referee&apos;s first paid
          invoice clears (to cover dispute windows).
        </ProseLi>
        <ProseLi>
          Maximum 50 successful referrals per calendar year per member.
        </ProseLi>
        <ProseLi>
          Self-referrals do not count. We check email and payment method.
        </ProseLi>
        <ProseLi>
          We may withhold or reverse the £20 for fraud, chargebacks, or breach
          of these terms.
        </ProseLi>
      </ProseUl>

      <ProseH2>Partner Programme (creators, coaches, communities)</ProseH2>
      <ProseP>
        Separate from the member referral above. If you are accepted onto the
        Vyrek Partner Programme, separate Partner T&amp;Cs apply alongside
        these terms. Headline points:
      </ProseP>
      <ProseUl>
        <ProseLi>
          Commission is flat tiered recurring (30% / 40% / 50% based on active
          referrals). There is no flat sign-up bounty under this programme.
        </ProseLi>
        <ProseLi>
          Commission accrues only after the referee&apos;s first paid invoice
          clears (8 days after signup) with a 30-day clawback if the referee
          cancels or charges back inside that window.
        </ProseLi>
        <ProseLi>
          Payouts are made monthly via BACS once the balance reaches £50.
          Balances under £50 roll over.
        </ProseLi>
        <ProseLi>
          Self-referrals, manipulated traffic, or any conduct designed to
          inflate referrals will void commission and may suspend the partner
          account.
        </ProseLi>
      </ProseUl>

      <ProseH2>Termination</ProseH2>
      <ProseP>
        You can stop using the service at any time by cancelling. We may
        terminate or suspend your account if you materially breach these
        terms, if your payment method fails after the 7-day retry window, or
        if we are required to by law. On termination, the licence to use the
        service ends; clauses that by their nature should survive
        (intellectual property, liability, governing law) survive.
      </ProseP>

      <ProseH2>Changes to these terms</ProseH2>
      <ProseP>
        We may update these terms as the service evolves or as the law
        changes. Material changes are notified by email at least 14 days
        before they take effect. The bottom of this page always shows the
        last updated date. If you do not accept the new terms, cancel before
        they take effect.
      </ProseP>

      <ProseH2>Governing law and disputes</ProseH2>
      <ProseP>
        These terms are governed by the laws of England and Wales. Disputes
        will be resolved in the courts of England and Wales, except that you
        may also bring proceedings in the courts of the country where you
        live if that right is given to you by law.
      </ProseP>
      <ProseP>
        Please contact <ProseEmailLink email="support@vyrek.com" /> before
        starting any formal dispute. We resolve nearly every concern faster
        directly than through any formal channel. For consumers in the EU/UK,
        you can also use the Online Dispute Resolution platform:{" "}
        <span className="break-all">ec.europa.eu/odr</span>.
      </ProseP>

      <ProseH3>Contact</ProseH3>
      <ProseP>
        Questions about these terms:{" "}
        <ProseEmailLink email="support@vyrek.com" />.
      </ProseP>
    </LegalLayout>
  );
}
