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
  title: "Privacy policy",
  description:
    "How Vyrek collects, uses, and protects your data. UK GDPR-compliant. Plain English.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout eyebrow="Privacy" title="Privacy policy">
      <ProseP>
        Vyrek is a Hyrox training platform operated from the United Kingdom.
        This policy explains what data we collect, why we collect it, and the
        rights you have over it under the UK GDPR and the Data Protection Act
        2018.
      </ProseP>

      <ProseH2>What we collect</ProseH2>
      <ProseUl>
        <ProseLi>
          <strong className="text-vyrek-text">Account data.</strong> Your email
          address, given at the email gate of the quiz so we can save your plan
          and send it back to you.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Quiz answers.</strong> Your
          responses to the onboarding quiz: experience level, race date,
          training days, equipment, injuries. Used to generate your plan.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Payment data.</strong> Processed
          by Stripe. We never see or store your card number; Stripe gives us a
          token plus the last 4 digits of the card for receipts and disputes.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Usage analytics.</strong> Page
          views, quiz progress, conversion events, captured by PostHog after
          you give cookie consent. Pseudonymous — no profile identifiers tied
          to your name.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Error reports.</strong> Captured
          by Sentry when something breaks. Includes the page you were on and a
          minimal stack trace. No payment data is ever sent to Sentry.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Content drafts.</strong> If you
          are a Vyrek editor with access to /studio, your drafts and revisions
          are stored in Sanity (our headless CMS).
        </ProseLi>
      </ProseUl>

      <ProseH2>Why we collect it</ProseH2>
      <ProseUl>
        <ProseLi>Deliver your training plan and remember your progress.</ProseLi>
        <ProseLi>Process your subscription and send receipts.</ProseLi>
        <ProseLi>
          Improve the product — find where the funnel breaks, where members get
          stuck, which workouts get skipped.
        </ProseLi>
        <ProseLi>
          Send the small number of transactional emails the product needs:
          welcome, trial-ending reminder, payment-failed, cancellation.
        </ProseLi>
      </ProseUl>

      <ProseH2>Legal basis</ProseH2>
      <ProseUl>
        <ProseLi>
          <strong className="text-vyrek-text">Contract performance</strong> —
          we cannot deliver your plan without your quiz answers and email.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Consent</strong> — analytics
          cookies, marketing emails (you opt in; you can opt out anytime).
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Legitimate interest</strong> —
          security, fraud prevention, error monitoring.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Legal obligation</strong> —
          payment records, retained 7 years for HMRC.
        </ProseLi>
      </ProseUl>

      <ProseH2>How long we keep it</ProseH2>
      <ProseUl>
        <ProseLi>
          <strong className="text-vyrek-text">Training data</strong> — kept
          while your subscription is active, plus 90 days after cancellation in
          case you come back. Then deleted.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Analytics</strong> — 12 months,
          then aggregated and the row-level events are deleted.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Payment records</strong> — 7
          years, per HMRC requirements.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Support emails</strong> — 2
          years, then deleted.
        </ProseLi>
      </ProseUl>

      <ProseH2>Your rights under UK GDPR</ProseH2>
      <ProseP>You can ask us to:</ProseP>
      <ProseUl>
        <ProseLi>Show you the data we hold about you (subject access).</ProseLi>
        <ProseLi>Correct anything wrong.</ProseLi>
        <ProseLi>Delete your data (subject to legal retention rules above).</ProseLi>
        <ProseLi>
          Export your data in a portable format (JSON, CSV — your choice).
        </ProseLi>
        <ProseLi>
          Restrict what we do with it while a request is being processed.
        </ProseLi>
        <ProseLi>
          Object to processing based on legitimate interest. We will weigh and
          respond.
        </ProseLi>
      </ProseUl>
      <ProseP>
        Email <ProseEmailLink email="privacy@vyrek.com" /> with the request.
        We reply within 24 hours and complete most requests within a calendar
        month, as the UK GDPR requires.
      </ProseP>
      <ProseP>
        If you are not happy with how we handled your request, you can
        complain to the Information Commissioner&apos;s Office at{" "}
        <a
          className="text-vyrek-text underline underline-offset-4 hover:text-vyrek-accent"
          href="https://ico.org.uk/make-a-complaint/"
          target="_blank"
          rel="noreferrer"
        >
          ico.org.uk/make-a-complaint
        </a>
        .
      </ProseP>

      <ProseH2>Who we share data with</ProseH2>
      <ProseUl>
        <ProseLi>
          <strong className="text-vyrek-text">Stripe</strong> (payments) —
          card processing, billing, customer portal. Data stays inside the EEA
          / UK regions.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Supabase</strong> (database) —
          your account and training data, hosted in EU regions.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Resend</strong> (email) —
          transactional emails only. EU sub-processors.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">PostHog</strong> (analytics) —
          EU-hosted, only loaded after consent.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Sentry</strong> (error
          monitoring) — EU-hosted, scrubs PII.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Sanity</strong> (CMS) — only for
          editors who log in at /studio.
        </ProseLi>
      </ProseUl>
      <ProseP>
        We do not sell your data. We do not share it for marketing purposes.
      </ProseP>

      <ProseH3>Contact</ProseH3>
      <ProseP>
        Data Protection contact:{" "}
        <ProseEmailLink email="privacy@vyrek.com" />.
      </ProseP>
    </LegalLayout>
  );
}
