import Link from "next/link";
import Image from "next/image";
import { MemberSignOut } from "@/components/member/sign-out";
import { ReplayTour } from "@/components/member/replay-tour";
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
} | null;

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
}) {
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
            are sent to. */}
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
            <div style={{ marginTop: 6 }}>
              <ChipRow>
                <Chip tone="accent">{programme}</Chip>
              </ChipRow>
            </div>
          </div>
        </div>
        {/* This pointed at Today, which is not where the thread is. Somebody
            following it landed on their session and had to go looking. */}
        <Row
          label="Message Ben"
          value="Open →"
          tone="var(--accent-text)"
          href={`${base}/coach`}
        />
      </Card>

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

      <section style={{ marginBottom: "var(--space-4)" }}>
        <Eyebrow>Subscription</Eyebrow>
        <RowGroup>
          <Row label="Plan" value="Personal Programming" />
          <Row
            label="Status"
            value={sub?.status ?? "Not connected"}
            tone={sub ? "var(--ok)" : "var(--text-muted)"}
          />
          <Row
            label="Renews"
            value={formatDate(sub?.current_period_end) ?? "—"}
            tone={sub ? undefined : "var(--text-muted)"}
          />
        </RowGroup>
        {/* "Manage billing" was a link to /account — a marketing route that
            has nothing to do with billing. A working portal button and the
            portal route it posts to both already existed and were mounted
            nowhere. */}
        {/* AccountBilling carries the "not connected yet" note itself, so the
            copy that used to live here would render it a second time. */}
        <AccountBilling firstName={firstName} hasSubscription={Boolean(sub)} />
      </section>

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

      <section style={{ marginBottom: "var(--space-4)" }}>
        <Eyebrow>Your data</Eyebrow>
        <RowGroup>
          <Row label="Personal records" value="View →" href={`${base}/account/pr`} />
          <Row label="Connections" value="Manage →" href={`${base}/connections`} />
          {/* This said "Request →" and had no handler on it at all — a control
              that exists to satisfy a legal right, doing nothing. */}
          <Row label="Download everything" value={<DataExport email={email} />} />
          <Row label="Privacy policy" value="Read →" href="/legal/privacy" />
        </RowGroup>
      </section>

      <section style={{ marginBottom: "var(--space-4)" }}>
        <Eyebrow>Help</Eyebrow>
        <RowGroup>
          {/* The tour's own last card promises this is here. */}
          <Row
            label="Guided tour"
            value={<ReplayTour className="member-linkbtn" />}
          />
        </RowGroup>
      </section>

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
        Training figures on this screen are sample data until the database is
        connected; your account details above are real.{" "}
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
