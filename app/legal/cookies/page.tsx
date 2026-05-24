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

type CookieRow = {
  name: string;
  provider: string;
  purpose: string;
  duration: string;
};

const NECESSARY: CookieRow[] = [
  {
    name: "vyrek:consent:v1",
    provider: "Vyrek (localStorage)",
    purpose: "Remembers your cookie banner choices so we do not ask again every visit.",
    duration: "12 months",
  },
  {
    name: "vyrek:quiz:state",
    provider: "Vyrek (localStorage)",
    purpose: "Remembers your quiz progress so you can refresh or come back later.",
    duration: "30 days",
  },
  {
    name: "vyrek:customer:uuid",
    provider: "Vyrek (localStorage)",
    purpose: "Anonymous identifier for your quiz session. Linked to your account when you complete the email gate.",
    duration: "12 months",
  },
  {
    name: "__Host-next-auth.csrf-token",
    provider: "Vyrek (session cookie)",
    purpose: "CSRF protection on form submissions.",
    duration: "Session (cleared when you close the browser)",
  },
  {
    name: "sb-access-token / sb-refresh-token",
    provider: "Supabase",
    purpose: "Keeps you logged in across visits.",
    duration: "Access: 1 hour. Refresh: 30 days.",
  },
];

const ANALYTICS: CookieRow[] = [
  {
    name: "ph_*",
    provider: "PostHog (EU)",
    purpose: "Pseudonymous session and event tracking. Used to understand which pages perform and where the funnel breaks. Session replay masks all inputs.",
    duration: "12 months (rolling)",
  },
];

const THIRD_PARTY: CookieRow[] = [
  {
    name: "__stripe_mid / __stripe_sid / m",
    provider: "Stripe",
    purpose: "Fraud screening and session continuity during card payment. Set only during checkout.",
    duration: "Session to 12 months",
  },
  {
    name: "crisp-client/*",
    provider: "Crisp (when live chat enabled)",
    purpose: "Powers the in-page chat widget on /contact. Only set if you open the chat.",
    duration: "6 months",
  },
  {
    name: "Sanity Studio cookies",
    provider: "Sanity",
    purpose: "Only set on /studio for editors. Public visitors never see these.",
    duration: "Session",
  },
];

function CookieTable({ rows }: { rows: CookieRow[] }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-vyrek-border">
            <th className="bg-vyrek-elevated px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
              Name
            </th>
            <th className="bg-vyrek-elevated px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
              Provider
            </th>
            <th className="bg-vyrek-elevated px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
              Purpose
            </th>
            <th className="bg-vyrek-elevated px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
              Duration
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-vyrek-border-subtle">
              <td className="px-3 py-3 align-top font-mono text-xs text-vyrek-text">
                {r.name}
              </td>
              <td className="px-3 py-3 align-top text-vyrek-text-secondary">
                {r.provider}
              </td>
              <td className="px-3 py-3 align-top text-vyrek-text-secondary">
                {r.purpose}
              </td>
              <td className="px-3 py-3 align-top text-vyrek-text-secondary">
                {r.duration}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CookiesPage() {
  return (
    <LegalLayout eyebrow="Cookies" title="Cookie policy">
      <ProseP>
        This policy explains what cookies and similar storage technologies
        Vyrek uses, why we use them, and how to opt out. We list every cookie
        we set, by category, in the tables below.
      </ProseP>

      <ProseH2>What is a cookie?</ProseH2>
      <ProseP>
        A cookie is a small text file stored in your browser by a website you
        visit. We also use similar technologies (localStorage,
        sessionStorage, IndexedDB) which work the same way for the purposes
        of this policy. When we say &ldquo;cookies&rdquo; we mean all of
        these.
      </ProseP>
      <ProseP>
        Cookies are how a website remembers things between page loads, like
        the fact that you accepted the cookie banner or that you started a
        quiz two days ago. Some cookies are essential; others power analytics
        or third-party features and only run with your consent.
      </ProseP>

      <ProseH2>Categories</ProseH2>
      <ProseUl>
        <ProseLi>
          <strong className="text-vyrek-text">Strictly necessary.</strong>{" "}
          Always on. The site does not work without them.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Analytics.</strong> Off by
          default. Loaded only after you accept Analytics in the cookie
          banner. Used to understand product usage in aggregate.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Functionality (third party).</strong>{" "}
          Set by services we embed, like Stripe checkout or the optional live
          chat. Each only loads in context, not on every page.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Marketing.</strong> None at the
          moment. If we add ad pixels in future, they will be opt-in via the
          banner and listed here before being switched on.
        </ProseLi>
      </ProseUl>

      <ProseH2>Strictly necessary cookies</ProseH2>
      <ProseP>
        Always on. Required for the site to function. No opt-out, because the
        site does not work without them.
      </ProseP>
      <ProseP>
        These cookies keep you signed in across page loads, remember the
        choices you made in the onboarding quiz so a refresh does not throw
        away your progress, hold your shopping basket on the checkout page,
        and prevent cross-site request forgery on every form. Removing them
        would make the service unusable, not just inconvenient.
      </ProseP>
      <CookieTable rows={NECESSARY} />

      <ProseH2>Analytics cookies</ProseH2>
      <ProseP>
        Off by default. Loaded only after you accept Analytics in the cookie
        banner. Used to understand which pages perform, where the funnel
        breaks, which programmes interest people. Pseudonymous; we never
        match analytics events to your real name or email.
      </ProseP>
      <ProseP>
        Analytics data is retained for 14 months and then aggregated into a
        rolling annual snapshot that contains no individual identifiers. We
        use it to decide which posts to write next, which programme pages
        need to be clearer, and where to invest engineering time. We do not
        sell analytics data to anyone, run remarketing against it, or use it
        for pricing decisions.
      </ProseP>
      <CookieTable rows={ANALYTICS} />

      <ProseH2>Third-party cookies</ProseH2>
      <ProseP>
        Set by services we embed. Each loads only in context:
      </ProseP>
      <CookieTable rows={THIRD_PARTY} />
      <ProseP>
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
      </ProseP>

      <ProseH2>First-party vs third-party cookies</ProseH2>
      <ProseP>
        A first-party cookie is set by the domain you are visiting (vyrek.com
        or its subdomains). A third-party cookie is set by a different domain
        embedded into the page (for example, an analytics script loaded from
        a vendor domain). First-party cookies are restricted to the original
        site; third-party cookies can in principle be read by the third party
        across any site that embeds them.
      </ProseP>
      <ProseP>
        Most modern browsers (Safari, Firefox, Brave by default; Chrome
        gradually) restrict or block third-party cookies. We design the
        service to work without them: every analytics signal we use is
        either first-party or pseudonymous, and the checkout flow does not
        rely on third-party tracking. Blocking third-party cookies in your
        browser settings has no effect on your Vyrek experience.
      </ProseP>

      <ProseH2>Consent management</ProseH2>
      <ProseP>
        Our cookie banner appears on your first visit and records your
        choice in a first-party cookie that lasts 12 months. You can
        re-open the banner at any time from the footer link &quot;Cookie
        settings&quot; and change your mind. There are no dark patterns: the
        accept and reject buttons are the same size and visual weight, and
        rejection takes effect immediately.
      </ProseP>
      <ProseP>
        If you sign in across multiple devices, your consent preference is
        device-specific (because cookies are device-scoped). You can set the
        same preference on each device by visiting the banner once.
      </ProseP>

      <ProseH2>Cookie lifetimes</ProseH2>
      <ProseP>
        Session cookies are deleted when you close the browser. Persistent
        cookies have a defined expiry, listed in the tables above. The longest
        persistent cookie we set is 12 months (the consent record itself), so
        we can avoid showing the banner every time you visit. Everything else
        expires within 30 days. We do not extend any cookie&apos;s lifetime
        retroactively, and we do not refresh cookies on subsequent visits in
        order to keep them alive past their stated duration. When a cookie
        expires it is removed by the browser at the next visit; we do not
        attempt to reconstruct prior state from any other source.
      </ProseP>

      <ProseH2>Do Not Track</ProseH2>
      <ProseP>
        When your browser sends a Do Not Track signal, we treat it as a
        refusal of Analytics consent. The banner still appears (so you can
        flip the switch later), but analytics scripts will not load until you
        explicitly accept. This goes beyond what the law currently requires.
      </ProseP>

      <ProseH2>How to opt out</ProseH2>
      <ProseUl>
        <ProseLi>
          <strong className="text-vyrek-text">In the Vyrek banner.</strong>{" "}
          Reject all non-necessary on first visit, or re-open the banner from
          the footer at any time to change your mind.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">In your browser.</strong> Each
          major browser lets you clear, block, or restrict cookies:
        </ProseLi>
      </ProseUl>
      <ProseUl>
        <ProseLi>
          <strong className="text-vyrek-text">Safari (macOS / iOS):</strong>{" "}
          Settings → Safari → Privacy &amp; Security → Block All Cookies.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Chrome:</strong> Settings →
          Privacy and security → Cookies and other site data.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Firefox:</strong> Settings →
          Privacy &amp; Security → Cookies and Site Data.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Edge:</strong> Settings →
          Cookies and site permissions → Manage and delete cookies and site
          data.
        </ProseLi>
        <ProseLi>
          <strong className="text-vyrek-text">Private / incognito mode.</strong>{" "}
          Most cookies do not persist past the session.
        </ProseLi>
      </ProseUl>
      <ProseP>
        Blocking strictly necessary cookies will break parts of the site (the
        quiz, the checkout, staying logged in). Blocking analytics cookies
        has no effect on your experience.
      </ProseP>

      <ProseH2>Changes to this policy</ProseH2>
      <ProseP>
        We update this page whenever we add or remove a cookie. Material
        changes are also flagged in the cookie banner on your next visit so
        you can reconfirm your choices.
      </ProseP>

      <ProseH3>Contact</ProseH3>
      <ProseP>
        Questions about cookies:{" "}
        <ProseEmailLink email="privacy@vyrek.com" />.
      </ProseP>
    </LegalLayout>
  );
}
