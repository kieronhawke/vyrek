import Link from "next/link";
import Image from "next/image";
import { MemberSignOut } from "@/components/member/sign-out";
import { ManageBillingButton } from "@/components/member/manage-billing-button";
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
            <div style={{ marginTop: 6 }}>
              <ChipRow>
                <Chip tone="accent">{programme}</Chip>
              </ChipRow>
            </div>
          </div>
        </div>
        {billing ? (
          <Row
            label="Training"
            value="Carries on with Ben as normal"
          />
        ) : (
          <Row
            label="Message Ben"
            value="Open →"
            tone="var(--accent-text)"
            href={`${base}/today`}
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
        <RowGroup>
          <Row label="Plan" value={sub?.planName ?? programme} />
          {sub?.amountPence ? (
            <Row label="Rate" value={`${gbp(sub.amountPence)} a month`} />
          ) : null}
          <Row
            label="Status"
            value={
              sub
                ? sub.paused
                  ? "paused"
                  : sub.cancelAtPeriodEnd
                    ? `${sub.status} · ends soon`
                    : sub.status
                : "Not connected"
            }
            tone={sub ? "var(--ok)" : "var(--text-muted)"}
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
        {sub ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "var(--space-1)",
              marginTop: "var(--space-2)",
            }}
          >
            {/* The real door: Stripe's hosted portal. Card changes and
                cancellation happen there, so card details never come near
                this codebase. */}
            <ManageBillingButton />
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
        ) : (
          <p
            style={{
              margin: "var(--space-1) 0 0",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
            }}
          >
            No subscription on this account yet. If that looks wrong, message
            Ben. Nothing here is invented.
          </p>
        )}
        <p
          style={{
            margin: "var(--space-1) 0 0",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
          }}
        >
          Update your card, change plan or cancel any time in Manage billing.
          Cancelling keeps your access until the end of what you&apos;ve paid
          for.
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
            <RowGroup>
              <Row label="Session reminders" value="On" tone="var(--ok)" />
              <Row label="Plan ready each Sunday" value="On" tone="var(--ok)" />
              <Row label="Ben's weekly email" value="On" tone="var(--ok)" />
              <Row label="Offers and news" value="Off" tone="var(--text-muted)" />
            </RowGroup>
            <p
              style={{
                margin: "var(--space-1) 0 0",
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
              }}
            >
              Reminders start sending once email and SMS are connected.
            </p>
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
          <Row label="Download everything" value="Request →" tone="var(--accent-text)" />
          <Row label="Privacy policy" value="Read →" href="/legal/privacy" />
        </RowGroup>
      </section>

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
