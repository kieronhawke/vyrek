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
        This policy explains what data we collect, why we collect it, where it
        lives, how long we keep it, and the rights you have over it under the
        UK GDPR and the Data Protection Act 2018.
      </ProseP>
      <ProseP>
        We are the data controller. Our contact for data matters is{" "}
        <ProseEmailLink email="privacy@vyrek.com" />.
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
          <strong className="text-vyrek-text">Training data.</strong> The
          sessions you mark complete, the splits, weights, and RPE values you
          log, and any notes you attach. Used to recalibrate your plan each
          Sunday.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Payment data.</strong> Processed
          by Stripe. We never see or store your card number; Stripe gives us a
          token plus the last 4 digits of the card for receipts and disputes.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Usage analytics + session
          replay.</strong>{" "}
          Page views, quiz progress, click heatmaps, and session replay
          captured by PostHog after you give cookie consent. Input fields
          (email, password, anything with a <code>data-mask</code> attribute)
          are masked at the recording layer, we never see what you typed
          into a form. Pseudonymous; no profile identifiers tied to your
          name. You can opt out at any time via the cookie banner or by
          setting Do Not Track in your browser.
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
          Improve the product. Find where the funnel breaks, where members get
          stuck, which workouts get skipped.
        </ProseLi>
        <ProseLi>
          Send the small number of transactional emails the product needs:
          welcome, trial-ending reminder, payment-failed, cancellation.
        </ProseLi>
        <ProseLi>
          Detect fraud and protect the service from abuse.
        </ProseLi>
      </ProseUl>

      <ProseH2>Legal basis</ProseH2>
      <ProseUl>
        <ProseLi>
          <strong className="text-vyrek-text">Contract performance.</strong>{" "}
          We cannot deliver your plan without your quiz answers and email.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Consent.</strong> Analytics
          cookies, session replay, marketing emails. You opt in; you can opt
          out anytime.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Legitimate interest.</strong>{" "}
          Security, fraud prevention, error monitoring, product analytics in
          aggregate.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Legal obligation.</strong> Payment
          records, retained 7 years for HMRC.
        </ProseLi>
      </ProseUl>

      <ProseH2>How long we keep it</ProseH2>
      <ProseUl>
        <ProseLi>
          <strong className="text-vyrek-text">Account and training data.</strong>{" "}
          Kept while your subscription is active, plus 90 days after
          cancellation in case you come back. Then deleted.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Quiz answers without an
          account.</strong> 30 days, then deleted.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Session replay.</strong> 30 days
          rolling window. Then deleted.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Analytics events.</strong> 12
          months at row level. After 12 months we aggregate and the
          individual events are deleted.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Payment records.</strong> 7 years
          per HMRC requirements.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Support emails.</strong> 2 years,
          then deleted.
        </ProseLi>
      </ProseUl>

      <ProseH2>Who we share data with</ProseH2>
      <ProseP>
        We use a small number of trusted processors to deliver the service. We
        do not sell your data. We do not share it with marketing networks. The
        processors below are bound by data processing agreements and process
        only what they need to.
      </ProseP>
      <ProseUl>
        <ProseLi>
          <strong className="text-vyrek-text">Stripe (payments).</strong>{" "}
          Card processing, billing, customer portal, fraud screening. Data
          stays inside the EEA and UK regions. Privacy:{" "}
          <a
            className="text-vyrek-text underline underline-offset-4 hover:text-vyrek-accent"
            href="https://stripe.com/privacy"
            target="_blank"
            rel="noreferrer"
          >
            stripe.com/privacy
          </a>
          .
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Supabase (database + auth).</strong>{" "}
          Your account, quiz answers, and training data. EU regions
          (Frankfurt). Privacy:{" "}
          <a
            className="text-vyrek-text underline underline-offset-4 hover:text-vyrek-accent"
            href="https://supabase.com/privacy"
            target="_blank"
            rel="noreferrer"
          >
            supabase.com/privacy
          </a>
          .
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Resend (email).</strong>{" "}
          Transactional emails only (welcome, trial reminders, payment
          notices). EU sub-processors.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">PostHog (analytics + session
          replay).</strong> EU-hosted, only loaded after consent. Inputs and
          marked fields are masked at recording layer.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Sentry (error monitoring).</strong>{" "}
          EU-hosted. Scrubs PII before storing. Used to find crashes.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Sanity (CMS).</strong> Only
          touched by Vyrek editors at /studio. Public visitors never interact
          with Sanity.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Vercel (hosting + CDN).</strong>{" "}
          Serves the web app. Logs HTTP-level metadata (IP, user agent,
          referrer) for 30 days for security and abuse prevention.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Upstash (rate limiting).</strong>{" "}
          Tracks request counts by IP to block abusive traffic. Keys expire
          within 24 hours.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Crisp (live chat, when
          enabled).</strong> If you message us through the chat widget on
          /contact, your message and email are processed by Crisp. EU-hosted.
        </ProseLi>
      </ProseUl>

      <ProseH2>International transfers</ProseH2>
      <ProseP>
        Most of our processors run in the EEA or UK. Where any data leaves the
        UK (for example, a US-based sub-processor used by one of the providers
        above), the transfer is covered either by the UK adequacy regulations
        for the destination country, or by Standard Contractual Clauses
        (UK IDTA addendum) and supplementary technical measures. We do not
        permit transfers to jurisdictions without an adequate level of
        protection.
      </ProseP>

      <ProseH2>Cookies</ProseH2>
      <ProseP>
        We use a small set of cookies and similar storage. Strictly necessary
        items are always on; analytics and session replay are opt-in via the
        cookie banner. For the full list, including names, providers, and
        durations, see our{" "}
        <a
          className="text-vyrek-text underline underline-offset-4 hover:text-vyrek-accent"
          href="/legal/cookies"
        >
          Cookie policy
        </a>
        .
      </ProseP>

      <ProseH2>Children</ProseH2>
      <ProseP>
        Vyrek is intended for people aged 16 and over. We do not knowingly
        collect data from anyone under 16. If you believe a child has signed
        up, email <ProseEmailLink email="privacy@vyrek.com" /> and we will
        delete the account.
      </ProseP>

      <ProseH2>Your rights under UK GDPR</ProseH2>
      <ProseP>You can ask us to:</ProseP>
      <ProseUl>
        <ProseLi>Show you the data we hold about you (subject access).</ProseLi>
        <ProseLi>Correct anything wrong.</ProseLi>
        <ProseLi>Delete your data (subject to legal retention rules above).</ProseLi>
        <ProseLi>
          Export your data in a portable format (JSON, CSV, your choice).
        </ProseLi>
        <ProseLi>
          Restrict what we do with it while a request is being processed.
        </ProseLi>
        <ProseLi>
          Object to processing based on legitimate interest. We will weigh and
          respond.
        </ProseLi>
        <ProseLi>
          Withdraw consent at any time for the things we asked consent for
          (analytics, marketing). Withdrawal does not affect processing that
          happened before the withdrawal.
        </ProseLi>
      </ProseUl>
      <ProseP>
        To exercise any of these rights, email{" "}
        <ProseEmailLink email="privacy@vyrek.com" /> from the address on your
        account. We reply within 24 hours and complete most requests within a
        calendar month, as the UK GDPR requires. There is no fee unless the
        request is manifestly unfounded or excessive.
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
        . We would rather you came to us first; almost every concern can be
        resolved faster directly than through a regulator.
      </ProseP>

      <ProseH2>Security</ProseH2>
      <ProseP>
        Data is encrypted in transit (TLS 1.2+) and at rest on Supabase and
        Vercel. Access to production systems is limited to a small number of
        named team members, gated by SSO with mandatory two-factor
        authentication, and audited. Card data never touches our servers,
        only Stripe sees it.
      </ProseP>
      <ProseP>
        Passwords are hashed with bcrypt at a work factor that we review every
        12 months in line with industry guidance. We do not store password
        hints, security questions, or any other recoverable secret material on
        our side. Account recovery uses one-time email links that expire within
        15 minutes of being issued.
      </ProseP>
      <ProseP>
        Our backups are encrypted and held within the UK and EU. Restores are
        rehearsed quarterly so that we can confirm both the technical recovery
        path and the recovery time objective. Deleted records are removed from
        backups within 30 days of the last scheduled backup that contained
        them, after which they are unrecoverable.
      </ProseP>

      <ProseH2>Automated decision-making</ProseH2>
      <ProseP>
        Vyrek personalises your training plan automatically using the answers
        you give in the onboarding quiz and the sessions you log through the
        app. This is profiling for the purpose of delivering the service, not
        for any marketing, pricing, or credit decision.
      </ProseP>
      <ProseP>
        No part of the personalisation has legal or similarly significant
        effects on you, and the output is always a training schedule that you
        can adjust, ignore, or override. If you would prefer a coach to set
        your week manually instead of the adaptive engine, email{" "}
        <ProseEmailLink email="support@vyrek.com" /> and we will switch your
        account to manual planning at no extra cost.
      </ProseP>

      <ProseH2>Third-party processors in detail</ProseH2>
      <ProseP>
        We use a small number of named processors to deliver the service. Each
        one is contracted under a Data Processing Agreement that mirrors the
        GDPR Article 28 obligations and forbids them from using your data for
        any purpose other than delivering Vyrek to you.
      </ProseP>
      <ProseUl>
        <ProseLi>
          <strong className="text-vyrek-text">Supabase (UK + EU regions).</strong>{" "}
          Hosts authentication, application database, and file uploads.
          Receives: account email, hashed password, training logs, quiz
          answers, partner application records.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Vercel (global edge, primary region UK).</strong>{" "}
          Serves the marketing site and member app. Receives: HTTP request
          metadata (IP, user agent, referer) needed to route requests and
          mitigate abuse.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Stripe (UK).</strong> Processes
          payments and stores card data on its own PCI-compliant systems.
          Receives: name, email, billing address, card details. Card details
          never touch Vyrek servers.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Resend (EU).</strong> Sends
          transactional and lifecycle emails. Receives: name, email, message
          content (welcome, payment receipts, password resets, partner
          status).
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Upstash (EU).</strong>{" "}
          Rate-limit counters and short-lived session tokens. Receives:
          hashed IP and request fingerprints; no personal data is stored
          long-term.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Sentry (EU, optional).</strong>{" "}
          Error tracking. Receives: stack traces, browser metadata, the
          pseudonymous user ID associated with the session that errored. We
          do not send body content of requests.
        </ProseLi>
      </ProseUl>
      <ProseP>
        If we add a new processor that handles personal data we will update
        this list and notify active members by email at least 14 days before
        the change takes effect.
      </ProseP>

      <ProseH2>How to exercise your rights, step by step</ProseH2>
      <ProseP>
        UK GDPR gives you the right to access, correct, delete, restrict,
        port, or object to processing of your data. Here is exactly how to
        do each, and what to expect.
      </ProseP>
      <ProseUl>
        <ProseLi>
          <strong className="text-vyrek-text">Access.</strong> Email{" "}
          <ProseEmailLink email="privacy@vyrek.com" /> from your registered
          address. We acknowledge within 72 hours and reply in full within
          30 days (UK GDPR Article 12(3)) with an export of all personal
          data we hold about you, formatted as JSON or CSV at your choice.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Correction.</strong> Most
          fields are editable in-app under Account → Profile. For fields
          you cannot edit (legal name on receipts, historical training
          logs), email the same address with the correction and any
          supporting evidence; we update within 7 days.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Deletion.</strong> In-app:
          Account → Close account. Within 30 days we delete personal data
          from production systems. Backup copies cycle out within a further
          30 days, after which the record is unrecoverable. Some categories
          (invoices, partner payouts) we retain for the legally required
          period under tax law and explain in the next section.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Restriction or objection.</strong>{" "}
          Email <ProseEmailLink email="privacy@vyrek.com" />. We will pause
          the relevant processing within 7 days and confirm when done.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Portability.</strong> The
          access export is machine-readable JSON suitable for porting to
          another service. Specify your preferred format in the request if
          CSV is more useful.
        </ProseLi>
      </ProseUl>
      <ProseP>
        We do not charge for any request, even repeat requests, unless the
        request is manifestly unfounded or excessive (UK GDPR Article 12(5)),
        in which case we will explain in writing first.
      </ProseP>

      <ProseH2>Incident notification</ProseH2>
      <ProseP>
        If we become aware of a personal data breach that is likely to result
        in a risk to your rights and freedoms, we will notify the Information
        Commissioner&apos;s Office within 72 hours of becoming aware of it, as
        required by UK GDPR Article 33. If the risk is high, we will also
        notify affected individuals by email without undue delay, explaining
        what happened, what data was involved, what we have done to contain
        the incident, and what (if anything) you need to do.
      </ProseP>

      <ProseH2>Changes to this policy</ProseH2>
      <ProseP>
        We may update this policy as the service evolves or as new processors
        come online. Material changes (a new processor handling personal data,
        a new category of data collected, a change to retention) are notified
        by email to active members at least 14 days before the change takes
        effect. The bottom of this page always shows the last updated date.
      </ProseP>

      <ProseH3>Contact</ProseH3>
      <ProseP>
        Data Protection contact:{" "}
        <ProseEmailLink email="privacy@vyrek.com" />.
      </ProseP>
    </LegalLayout>
  );
}
