import { Num } from "@/components/control/num";
import { MEMBER } from "@/lib/client-app/member-fixtures";

/**
 * ACCOUNT — spec/11 §4.
 *
 * Subscription, plan preferences, health info with a visible "Ben can see
 * this" indicator, and granular consents with an export button. The health
 * indicator is not decoration: spec/09 §14 makes that data Article 9
 * special category, and being plain about who sees it is part of the
 * lawful basis.
 */

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "var(--space-2)",
        minHeight: 44,
        padding: "0 var(--space-2)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        {label}
      </span>
      <span style={{ fontSize: "var(--text-sm)", color: tone ?? "var(--text)" }}>
        {value}
      </span>
    </div>
  );
}

export default function MemberAccount() {
  return (
    <>
      <p className="eyebrow">Your account</p>
      <h1
        style={{
          fontSize: "var(--text-2xl)",
          lineHeight: "var(--text-2xl-lh)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          margin: "var(--space-1) 0 var(--space-3)",
        }}
      >
        {MEMBER.firstName}
      </h1>

      <h2 className="eyebrow" style={{ marginBottom: "var(--space-1)" }}>
        Your plan
      </h2>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          marginBottom: "var(--space-3)",
        }}
      >
        <Row label="Programme" value="Personal Programming" />
        <Row label="Coach" value="Ben Sutherland" />
        <Row label="Next payment" value="12 August" />
        <Row label="Cancel" value="Any time, from here" tone="var(--text-muted)" />
      </div>

      <h2 className="eyebrow" style={{ marginBottom: "var(--space-1)" }}>
        Health information
      </h2>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          padding: "var(--space-2)",
          marginBottom: "var(--space-3)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
          }}
        >
          Ben can see this. Nobody else can, and it is encrypted on our side.
          You can change or remove it at any time.
        </p>
      </div>

      <h2 className="eyebrow" style={{ marginBottom: "var(--space-1)" }}>
        Notifications
      </h2>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
          marginBottom: "var(--space-3)",
        }}
      >
        <Row label="Session reminders" value="On" />
        <Row label="Plan ready" value="On" />
        <Row label="Ben's weekly email" value="On" />
        <Row label="Offers and news" value="Off" tone="var(--text-muted)" />
      </div>

      <h2 className="eyebrow" style={{ marginBottom: "var(--space-1)" }}>
        Your data
      </h2>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-card)",
        }}
      >
        <Row label="Sessions logged" value="47" />
        <Row label="Member since" value="April 2026" />
        <Row label="Download everything" value="Request →" tone="var(--accent)" />
      </div>

      <p
        style={{
          marginTop: "var(--space-3)",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
        }}
      >
        <Num align="left">47</Num> sessions logged. Sample account until the
        database is connected.
      </p>
    </>
  );
}
