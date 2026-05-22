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
  title: "Cookie policy",
  description:
    "Every cookie Vyrek uses, what it does, and how to opt out. No tricks.",
};

export default function CookiesPage() {
  return (
    <LegalLayout eyebrow="Cookies" title="Cookie policy">
      <ProseP>
        Vyrek uses a small number of cookies and similar storage mechanisms
        (localStorage, sessionStorage). This page lists every category, what
        each does, and how to opt out.
      </ProseP>
      <ProseP>
        On your first visit you see a cookie banner. Non-necessary cookies
        stay off until you give consent. You can change your choice at any
        time by re-opening the banner from the footer.
      </ProseP>

      <ProseH2>Necessary cookies and storage</ProseH2>
      <ProseP>
        Always on. Required for the site to function. No opt-out, because the
        site does not work without them.
      </ProseP>
      <ProseUl>
        <ProseLi>
          <strong className="text-vyrek-text">vyrek:consent:v1</strong> —
          localStorage. Remembers your cookie banner choices so we do not ask
          again every visit.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">vyrek:quiz:state</strong> —
          localStorage. Remembers your quiz progress so you can refresh or come
          back later.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">vyrek:customer:uuid</strong> —
          localStorage. A randomised, anonymous identifier for your quiz
          session. Becomes linked to your account when you complete the email
          gate.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">__Host-next-auth.csrf-token</strong> —
          session cookie. CSRF protection on form submissions. Cleared when you
          close the browser.
        </ProseLi>
      </ProseUl>

      <ProseH2>Analytics cookies</ProseH2>
      <ProseP>
        Off by default. Loaded only after you accept Analytics in the cookie
        banner. Used to understand which pages perform, where the funnel
        breaks, which programmes interest people.
      </ProseP>
      <ProseUl>
        <ProseLi>
          <strong className="text-vyrek-text">ph_*</strong> — PostHog
          analytics. Pseudonymous session and event tracking. EU-hosted, no
          third-party data brokers.
        </ProseLi>
      </ProseUl>

      <ProseH2>Marketing cookies</ProseH2>
      <ProseP>
        None at the moment. If we add Meta or Google ad pixels in the future,
        they will be opt-in through the banner and listed here.
      </ProseP>

      <ProseH2>Third-party cookies</ProseH2>
      <ProseUl>
        <ProseLi>
          <strong className="text-vyrek-text">Stripe</strong> — only set during
          checkout. Required for card payments to work and for fraud screening.
          Stripe&apos;s cookie policy:{" "}
          <a
            className="text-vyrek-text underline underline-offset-4 hover:text-vyrek-accent"
            href="https://stripe.com/cookies-policy/legal"
            target="_blank"
            rel="noreferrer"
          >
            stripe.com/cookies-policy/legal
          </a>
          .
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Sanity</strong> — only set on{" "}
          <span className="font-mono text-sm">/studio</span> for content
          editors. Public visitors never see Sanity cookies.
        </ProseLi>
      </ProseUl>

      <ProseH2>How to opt out</ProseH2>
      <ProseUl>
        <ProseLi>
          Reject all non-necessary in the banner on first visit, or re-open
          it from the footer at any time.
        </ProseLi>
        <ProseLi>
          Use your browser&apos;s settings to clear or block cookies. Safari,
          Chrome, and Firefox all let you do this.
        </ProseLi>
        <ProseLi>
          Use private/incognito browsing — most cookies do not persist past
          the session.
        </ProseLi>
      </ProseUl>

      <ProseH3>Contact</ProseH3>
      <ProseP>
        Questions about cookies:{" "}
        <ProseEmailLink email="privacy@vyrek.com" />.
      </ProseP>
    </LegalLayout>
  );
}
