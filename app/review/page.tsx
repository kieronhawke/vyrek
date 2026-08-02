import type { Metadata } from "next";
import Link from "next/link";
import "@/app/control-tokens.css";
import { weekFor, todayFor } from "@/lib/member/week";
import { RACES, homeRaces } from "@/lib/hyrox/races";
import { ALL_PHOTOS } from "@/lib/photo-library";

/**
 * THE REVIEW INDEX — every screen in one list.
 *
 * Built so Kieron can walk the whole product without hunting for URLs or
 * needing an account. Every link goes to the ungated preview mount, which
 * renders the same screen components as the real one behind the same shell;
 * the only thing missing is the auth boundary.
 *
 * Each row says what state the screen is in, because "looks finished" and "is
 * finished" are different things and this is the page where that distinction
 * matters most.
 */
export const metadata: Metadata = {
  title: "Review — every screen",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type State = "real" | "mixed" | "mock";

const STATE_LABEL: Record<State, string> = {
  real: "Real data",
  mixed: "Real + sample",
  mock: "Sample data",
};

const STATE_TONE: Record<State, string> = {
  real: "var(--ok)",
  mixed: "var(--warn)",
  mock: "var(--text-muted)",
};

type Row = { href: string; name: string; note: string; state: State };

function Section({
  title,
  lede,
  rows,
}: {
  title: string;
  lede: string;
  rows: Row[];
}) {
  return (
    <section style={{ marginBottom: "var(--space-6)" }}>
      <h2
        style={{
          margin: "0 0 4px",
          fontSize: "var(--text-xl)",
          fontWeight: 750,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          margin: "0 0 var(--space-2)",
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
          maxWidth: "68ch",
        }}
      >
        {lede}
      </p>

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          overflow: "hidden",
          background: "var(--surface)",
        }}
      >
        {rows.map((r, i) => (
          <li
            key={r.href}
            style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
          >
            <Link
              href={r.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                minHeight: 56,
                padding: "10px var(--space-2)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span style={{ minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: "var(--text-base)",
                    fontWeight: 650,
                  }}
                >
                  {r.name}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                  }}
                >
                  {r.note}
                </span>
              </span>
              <span
                style={{
                  fontSize: "var(--text-2xs)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: STATE_TONE[r.state],
                  whiteSpace: "nowrap",
                }}
              >
                {STATE_LABEL[r.state]}
              </span>
              <span aria-hidden style={{ color: "var(--text-muted)" }}>
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ReviewIndex() {
  const A = "/control-preview/app";
  const D = "/control-preview/admin";
  const today = todayFor();
  const week = weekFor();
  const restDay = week.find((d) => d.type === "rest") ?? week[0];
  const uk = homeRaces();

  const member: Row[] = [
    { href: `${A}/today`, name: "Today", note: "The tab the app opens on: session, week strip, training load, community", state: "mock" },
    { href: `${A}/plan`, name: "Plan", note: "The twelve-week block, Ben's note, the week, and feedback per session", state: "mock" },
    { href: `${A}/plan/${today.slug}`, name: "Today's session", note: "One session as numbered intervals with RPE", state: "mock" },
    { href: `${A}/plan/${restDay.slug}`, name: "A rest day", note: "Rest days get a screen and a reason, not a blank", state: "mock" },
    { href: `${A}/coach`, name: "Ask Ben", note: "The coach thread — the two-way channel", state: "mock" },
    { href: `${A}/nutrition`, name: "Fuel", note: "Macros against target, and the day on a timeline with the workout in it", state: "mock" },
    { href: `${A}/progress`, name: "Progress", note: "Station splits against the field, predicted finish, training load", state: "mock" },
    { href: `${A}/account`, name: "Account", note: "Coach, subscription, health data, notifications, export", state: "mock" },
  ];

  const admin: Row[] = [
    { href: `${D}`, name: "Dashboard", note: "The operator overview", state: "mock" },
    { href: `${D}/clients`, name: "Clients", note: "Who needs a plan, who has paid, who is in trouble", state: "mock" },
    { href: `${D}/clients/c_01`, name: "A client record", note: "One person: flags, the four numbers, actions, their feedback, coach notes", state: "mock" },
    { href: `${D}/plans`, name: "Plans", note: "Who is due a plan, and whether the coach's note is written", state: "mock" },
    { href: `${D}/plans/sample-a`, name: "The plan builder", note: "Write a week, with last week's feedback beside it", state: "mock" },
    { href: `${D}/leads`, name: "Leads", note: "Quiz responses and enquiries", state: "mock" },
    { href: `${D}/messages`, name: "Messages", note: "Needs Twilio and Resend before it can send", state: "mock" },
    { href: `${D}/diary`, name: "Diary", note: "Sessions and availability", state: "mock" },
    { href: `${D}/payments`, name: "Payments", note: "Needs Stripe keys", state: "mock" },
    { href: `${D}/finance`, name: "Finance", note: "Needs Stripe keys", state: "mock" },
    { href: `${D}/activity`, name: "Activity", note: "What happened on the site", state: "mock" },
    { href: `${D}/seo`, name: "SEO", note: "Keyword coverage against pages", state: "mock" },
    { href: `${D}/assets`, name: "Assets", note: "The photo library", state: "mock" },
    { href: `${D}/settings`, name: "Settings", note: "Site settings, pricing, the noindex switch", state: "mock" },
    { href: `${D}/accounts`, name: "Accounts", note: "Who can sign in — Ben and Kieron", state: "mock" },
  ];

  const publicPages: Row[] = [
    { href: "/hyrox/events", name: "Race calendar", note: `${RACES.length} real HYROX races, ${uk.length} in the UK and Ireland`, state: "real" },
    { href: `/hyrox/events/${uk[0]?.slug ?? "hyrox-london-excel"}`, name: "A race page", note: "Real dates and venue from HYROX, plus when a twelve-week build starts", state: "real" },
    { href: "/hyrox/stations", name: "Station guides", note: "Seven of eight now use real photography of Ben racing", state: "mixed" },
    { href: "/", name: "Home", note: "The marketing site — still the dark theme, deliberately", state: "mixed" },
    { href: "/quiz", name: "The quiz", note: "Lead qualification", state: "mixed" },
  ];

  return (
    <div
      data-surface="control"
      data-density="comfortable"
      style={{ minHeight: "100svh", background: "var(--bg)", color: "var(--text)" }}
    >
      <main
        style={{
          maxWidth: 820,
          margin: "0 auto",
          padding: "var(--space-6) var(--space-2) var(--space-8)",
        }}
      >
        <p className="eyebrow">Internal</p>
        <h1
          style={{
            margin: "var(--space-1) 0",
            fontSize: "var(--text-2xl)",
            lineHeight: 1.1,
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          Every screen, in one place
        </h1>
        <p
          style={{
            margin: "0 0 var(--space-2)",
            fontSize: "var(--text-base)",
            color: "var(--text-muted)",
            maxWidth: "68ch",
          }}
        >
          No sign-in needed. Every link goes to the ungated preview, which
          renders the same components as the real screen behind the same shell —
          the only thing missing is the auth check.
        </p>

        <div
          style={{
            padding: "var(--space-2)",
            border: "1px solid var(--border)",
            borderLeft: "3px solid var(--warn)",
            borderRadius: "var(--radius-card)",
            background: "var(--surface)",
            marginBottom: "var(--space-4)",
            fontSize: "var(--text-sm)",
            lineHeight: 1.55,
          }}
        >
          <strong>Read the label on the right of each row.</strong> Only the
          race calendar runs on real data. Everything in the member area and
          admin is sample data held in the page — plans, messages, feedback and
          notes do not persist, because there is no database, Stripe, Twilio or
          Resend connected yet. The screens are finished; the plumbing is not.
        </div>

        <Section
          title="Member area"
          lede="What your customer sees. Five tabs, thumb-reachable on a phone, a left rail on desktop. Try it on your phone as well — it is designed for one hand between sets."
          rows={member}
        />

        <Section
          title="Admin"
          lede="What Ben and you see. Same design system as the member area, sized for a laptop."
          rows={admin}
        />

        <Section
          title="Public pages worth a look"
          lede="The marketing site keeps the original dark theme on purpose — the light change was scoped to the private surfaces you said were hard to read."
          rows={publicPages}
        />

        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            borderTop: "1px solid var(--border)",
            paddingTop: "var(--space-2)",
          }}
        >
          {ALL_PHOTOS.length} Elite 15 photographs catalogued ·{" "}
          {RACES.length} HYROX races with confirmed dates · design references in{" "}
          <code>docs/design/</code>
        </p>
      </main>
    </div>
  );
}
