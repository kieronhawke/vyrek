import Link from "next/link";
import Image from "next/image";
import { MemberSignOut } from "@/components/member/sign-out";
import { ReplayTour } from "@/components/member/replay-tour";
import { NotificationSettings } from "@/components/member/notification-settings";
import { ProfileEditor } from "@/components/member/profile-editor";
import { DataExport } from "@/components/member/data-export";
import { AccountBilling } from "@/components/member/account-billing";
import {
  Card,
  Chip,
  ChipRow,
  Eyebrow,
  Row,
  RowGroup,
  StatTile,
  StatTiles,
} from "@/components/member/ui";
import { BEN_PHOTOS, pickPhoto } from "@/lib/photo-library";

export type AccountSubscription = {
  status: string;
  current_period_end: string | null;
  /** Live from Stripe when available; null degrades the rows honestly. */
  planName?: string | null;
  amountPence?: number | null;
  paused?: boolean;
  cancelAtPeriodEnd?: boolean;
} | null;

function gbp(pence: number): string {
  return pence % 100 === 0
    ? `£${pence / 100}`
    : `£${(pence / 100).toFixed(2)}`;
}

/**
 * ACCOUNT, as markup. Split from the auth boundary for the same reason as
 * TodayScreen: the ungated preview mount renders it without a bypass in
 * shipped auth code.
 */
/**
 * Stripe's status, said the way a person would say it.
 *
 * Anything not in here falls through to the raw string rather than being
 * silently relabelled — a status nobody anticipated should look odd on the
 * screen, not be dressed up as something reassuring.
 */
const STATUS_WORDS: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Payment failed",
  unpaid: "Unpaid",
  incomplete: "Not finished",
  incomplete_expired: "Expired",
  canceled: "Cancelled",
  paused: "Paused",
};

/** The states where green is the truth. */
const HEALTHY_STATUS = new Set(["active", "trialing"]);

export function AccountScreen({
  firstName,
  email,
  programme,
  subscription: sub,
  sessionsLogged,
  blockWeek,
  blockTotal = 12,
  memberSince,
  base = "/app",
  mode = "full",
}: {
  firstName: string;
  email: string;
  programme: string;
  subscription: AccountSubscription;
  /** Real training numbers. Omitted on the preview mount, which shows the
      populated demo block. */
  sessionsLogged?: number;
  blockWeek?: number;
  blockTotal?: number;
  memberSince?: string | null;
  base?: string;
  /**
   * "billing" is the payment-link portal: subscription management only.
   * Training tiles and training links would read as broken emptiness to a
   * client whose training deliberately lives with Ben, not in the app.
   */
  mode?: "billing" | "full";
}) {
  const billing = mode === "billing";
  const portrait = pickPhoto(BEN_PHOTOS, "coach-card");

  return (
    <>
      <p className="eyebrow">Your account</p>
      <h1
        style={{
          fontSize: "var(--text-2xl)",
          lineHeight: 1.1,
          fontWeight: 800,
          letterSpacing: "-0.025em",
          margin: "var(--space-1) 0",
        }}
      >
        {firstName}
      </h1>
      <p
        style={{
          margin: "0 0 var(--space-3)",
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
          overflowWrap: "anywhere",
        }}
      >
        {email}
      </p>

      {/* Two columns on a monitor. Account was a single stack of label-left /
          value-right rows at every width, which on a wide screen is a column
          of text with a metre of nothing beside it. */}
      <div className="account-grid">
        <div className="account-main">

      <section style={{ marginBottom: "var(--space-4)" }}>
        <Eyebrow>Your details</Eyebrow>
        {/* Account was entirely read-only: no way to fix a name typed wrong
            during onboarding, no photo, no way to add the number reminders
            are sent to. Shown in the billing portal too — a name and a
            number are account facts, not training ones. */}
        <ProfileEditor firstName={firstName} email={email} />
      </section>

      {/* The member is paying for access to a person, so the person appears on
          the screen where they manage that. */}
      <Card
        padded={false}
        style={{ marginBottom: "var(--space-4)", overflow: "hidden" }}
      >
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            padding: "var(--space-2)",
          }}
        >
          <div
            style={{
              position: "relative",
              flex: "0 0 auto",
              width: 64,
              height: 64,
              borderRadius: "var(--radius-card)",
              overflow: "hidden",
            }}
          >
            <Image
              src={portrait.src}
              alt={portrait.alt}
              fill
              sizes="64px"
              style={{ objectFit: "cover", filter: "grayscale(1)" }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              Your coach
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "var(--text-base)",
                fontWeight: 700,
              }}
            >
              Ben Sutherland
            </p>
            {/* A billing-only client has no programme. The chip printed
                whatever `programme` resolved to for somebody who never took
                the quiz, under the heading "Your coach" — a label for a thing
                they were never sold. */}
            {billing ? null : (
              <div style={{ marginTop: 6 }}>
                <ChipRow>
                  <Chip tone="accent">{programme}</Chip>
                </ChipRow>
              </div>
            )}
          </div>
        </div>
        {billing ? (
          <Row
            label="Training"
            value="Carries on with Ben as normal"
          />
        ) : (
          /* This pointed at Today, which is not where the thread is. Somebody
             following it landed on their session and had to go looking. */
          <Row
            label="Message Ben"
            value="Open →"
            tone="var(--accent-text)"
            href={`${base}/coach`}
          />
        )}
      </Card>

      {billing ? null : (
        <section style={{ marginBottom: "var(--space-4)" }}>
          <Eyebrow>Your training</Eyebrow>
          {/* These were hardcoded to 47 sessions, week 4, and April 2026, so
              the page of record told somebody who signed up this morning that
              they had been training here since spring. Real numbers, and an
              honest zero where there is nothing yet. */}
          <StatTiles>
            <StatTile
              label="Sessions"
              value={String(sessionsLogged ?? 47)}
              sub="all time"
            />
            <StatTile
              label="This block"
              value={blockWeek === 0 ? "—" : String(blockWeek ?? 4)}
              sub={blockWeek === 0 ? "not started" : `of ${blockTotal} weeks`}
            />
            <StatTile
              label="Member since"
              value={memberSince?.split(" ")[0] ?? "Apr"}
              sub={memberSince?.split(" ")[1] ?? "2026"}
            />
          </StatTiles>
        </section>
      )}

      <section style={{ marginBottom: "var(--space-4)" }}>
        <Eyebrow>Subscription</Eyebrow>
        {/* Two layers here, deliberately. These rows are rendered on the
            server from the subscription the page has already read, so the
            plan, the rate and the paused / ending-soon flags are on the
            screen before any JavaScript runs and are still right when the
            live read below cannot reach Stripe. */}
        <RowGroup>
          {/* Billing-only clients are on a rate, not a package. Showing
              `programme` here as a fallback labelled somebody's arrangement
              with a training programme they never chose. */}
          {billing ? null : <Row label="Plan" value={sub?.planName ?? programme} />}
          {sub?.amountPence ? (
            <Row label="Rate" value={`${gbp(sub.amountPence)} a month`} />
          ) : null}
          {/* ⚠️ THIS USED TO PRINT STRIPE'S RAW STATUS, ALWAYS IN GREEN.
              "past_due" and "unpaid" and "incomplete" all rendered verbatim
              and tinted `--ok`, so the one client who most needs to notice
              something is wrong saw a reassuring green "past_due". Said in
              words now, and only actually-fine states are green. */}
          <Row
            label="Status"
            value={
              !sub
                ? "Not connected"
                : sub.paused
                  ? "Paused"
                  : sub.cancelAtPeriodEnd
                    ? "Ending soon"
                    : STATUS_WORDS[sub.status] ?? sub.status
            }
            tone={
              !sub
                ? "var(--text-muted)"
                : sub.paused || sub.cancelAtPeriodEnd
                  ? "var(--text-muted)"
                  : HEALTHY_STATUS.has(sub.status)
                    ? "var(--ok)"
                    : "var(--danger)"
            }
          />
          <Row
            label="Next payment"
            value={
              sub?.paused
                ? "paused"
                : (formatDate(sub?.current_period_end) ?? "—")
            }
            tone={sub ? undefined : "var(--text-muted)"}
          />
        </RowGroup>
        {/* "Manage billing" was a link to /account — a marketing route that
            has nothing to do with billing. AccountBilling mounts the portal
            button and the portal route that both already existed and were
            mounted nowhere, and adds what only a live read can give: the
            card, the receipts, and the way out. */}
        {/* It carries the "nothing is being charged yet" note itself, so the
            copy that used to sit here would render that a second time. */}
        <AccountBilling firstName={firstName} hasSubscription={Boolean(sub)} />
        {sub ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--space-1)",
              marginTop: "var(--space-2)",
            }}
          >
            {/* Ben's door rather than Stripe's. Changing programme is a
                conversation about training, which the hosted portal cannot
                have — it can only change what is being charged. */}
            <Link
              href={`${base}/account/change`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 40,
                padding: "0 16px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                fontSize: "var(--text-sm)",
                color: "var(--text-muted)",
                textDecoration: "none",
              }}
            >
              Request a change
            </Link>
          </div>
        ) : null}
        <p
          style={{
            margin: "var(--space-1) 0 0",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
          }}
        >
          {/* Cancelling used to be listed as something you did inside Manage
              billing. It has its own button now, so this says where the card
              lives and keeps the fact that matters either way. */}
          Update your card or change plan in Manage billing. Cancelling keeps
          your access until the end of what you&apos;ve paid for.
        </p>
      </section>

      {billing ? (
        <section style={{ marginBottom: "var(--space-4)" }}>
          <Eyebrow>Your training space</Eyebrow>
          <Card>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", lineHeight: 1.55 }}>
              <strong>Coming to your account.</strong>{" "}
              Your training carries on with Ben exactly as it does now. When your
              weekly plan, session logging and progress move in here, Ben
              switches it on and you&apos;ll get a message. Nothing for you to
              do.
            </p>
          </Card>
        </section>
      ) : (
        <>
          <section style={{ marginBottom: "var(--space-4)" }}>
            <Eyebrow>Health information</Eyebrow>
            <Card>
              <p style={{ margin: 0, fontSize: "var(--text-sm)", lineHeight: 1.55 }}>
                <strong>Ben can see this.</strong> Nobody else can, it is encrypted
                on our side, and you can change or remove it at any time.
              </p>
              <div style={{ marginTop: "var(--space-1)" }}>
                <ChipRow>
                  <Chip tone="warn">Special category data</Chip>
                </ChipRow>
              </div>
            </Card>
          </section>

          <section style={{ marginBottom: "var(--space-4)" }}>
            <Eyebrow>Notifications</Eyebrow>
            {/* Four rows of static text reading "On, On, On, Off" — a settings
                screen that displayed settings and changed none of them, which is
                worse than a missing feature because it looks like a working one. */}
            <NotificationSettings />
          </section>
        </>
      )}

      <section style={{ marginBottom: "var(--space-4)" }}>
        <Eyebrow>Your data</Eyebrow>
        <RowGroup>
          {billing ? null : (
            <>
              <Row label="Personal records" value="View →" href={`${base}/account/pr`} />
              <Row label="Connections" value="Manage →" href={`${base}/connections`} />
            </>
          )}
          {/* This said "Request →" and had no handler on it at all — a control
              that exists to satisfy a legal right, doing nothing. */}
          <Row label="Download everything" value={<DataExport email={email} />} />
          <Row label="Privacy policy" value="Read →" href="/legal/privacy" />
        </RowGroup>
      </section>

      {billing ? null : (
        <section style={{ marginBottom: "var(--space-4)" }}>
          <Eyebrow>Help</Eyebrow>
          <RowGroup>
            {/* The tour's own last card promises this is here. Not in the
                billing portal: the shell only mounts the walkthrough outside
                billing mode, so the button would set a replay flag that
                nothing there ever reads. */}
            <Row
              label="Guided tour"
              value={<ReplayTour className="member-linkbtn" />}
            />
          </RowGroup>
        </section>
      )}

        </div>
      </div>

      <MemberSignOut />

      <p
        style={{
          margin: "var(--space-3) 0 0",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
        }}
      >
        {billing
          ? "Anything look wrong with a payment? "
          : "Training figures on this screen are sample data until the database is connected; your account details above are real. "}
        {""}
        {/* Underlined, not just coloured: inside a muted paragraph the accent
            is only 1.06:1 against the surrounding text, so colour alone would
            not tell a reader this is a link. */}
        <Link
          href="/contact"
          style={{
            color: "var(--accent-text)",
            textDecoration: "underline",
            textUnderlineOffset: 2,
          }}
        >
          Something wrong?
        </Link>
      </p>
    </>
  );
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
  }).format(d);
}
