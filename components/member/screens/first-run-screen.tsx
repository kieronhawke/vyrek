import Link from "next/link";
import {
  EmptyState,
  EmptyStateStyles,
  PendingBar,
  Rise,
} from "@/components/member/empty-state";
import { Card } from "@/components/member/ui";
import {
  daysUntilRace,
  expectedWindow,
  type FirstRunState,
} from "@/lib/member/first-run";

/**
 * The screen a member sees between paying and Ben sending week one.
 *
 * The design brief was that this should not feel like a gap in the product.
 * Three things do most of that work:
 *
 * 1. It repeats their own answers back. "Two sessions a week, sixty minutes,
 *    full gym, built around your lower back" is not filler, it is proof that
 *    the quiz went somewhere and that a person has their details.
 * 2. It says when, in words we can actually keep. No countdown to a human.
 * 3. It gives them something to do tonight, because the honest answer to
 *    "what do I do until then" is not "wait".
 */
export function FirstRunScreen({
  state,
  base = "/app",
}: {
  state: FirstRunState;
  base?: string;
}) {
  const { facts, stage, progress } = state;
  const name = facts.firstName?.trim() || null;
  const days = daysUntilRace(facts.raceDate);
  const window = expectedWindow();

  const title =
    stage === "overdue"
      ? "Ben is still on your first week"
      : name
        ? `${name}, Ben is writing your first week`
        : "Ben is writing your first week";

  const body =
    stage === "overdue"
      ? `It has taken longer than the day we promised, which is on us. It is being written by hand rather than generated, and Ben would rather send you the right week late than the wrong one on time. If you would rather chase it, message him below and he will come back to you.`
      : `Not generated. Ben reads your answers and writes the block himself, which is why it takes hours rather than seconds. It will be here ${window}, and you will get an email the moment it lands.`;

  return (
    <>
      <EmptyStateStyles />

      <EmptyState
        eyebrow={stage === "overdue" ? "Taking longer than usual" : "In progress"}
        title={title}
        body={body}
        meta={
          <div style={{ display: "grid", gap: 10 }}>
            <PendingBar progress={progress} />
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-mono, ui-monospace)",
                fontSize: "var(--text-2xs)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--text)",
                opacity: 0.55,
              }}
            >
              {stage === "overdue"
                ? "Being written now"
                : `Expected ${window}`}
            </p>
          </div>
        }
        action={
          <div style={{ display: "grid", gap: "var(--space-2)" }}>
            <Link
              href={`${base}/coach`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 54,
                background: "var(--accent)",
                color: "var(--accent-ink)",
                borderRadius: 999,
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                letterSpacing: "-0.01em",
                textDecoration: "none",
              }}
            >
              Message Ben
            </Link>
            <Link
              href="/blog/how-long-do-you-need-to-train-for-hyrox"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 48,
                border: "1px solid var(--border-strong, var(--border))",
                color: "var(--text)",
                borderRadius: 999,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Read while you wait
            </Link>
          </div>
        }
      >
        <WhatBenHas facts={facts} daysToRace={days} />
      </EmptyState>
    </>
  );
}

/**
 * Their own answers, read back. This is the part that makes the wait feel
 * like a handover rather than a queue.
 */
function WhatBenHas({
  facts,
  daysToRace,
}: {
  facts: FirstRunState["facts"];
  daysToRace: number | null;
}) {
  const rows: { label: string; value: string }[] = [];

  if (facts.programme) rows.push({ label: "Programme", value: facts.programme });
  if (facts.daysPerWeek)
    rows.push({ label: "Sessions", value: `${facts.daysPerWeek} days a week` });
  if (facts.raceDate) {
    rows.push({
      label: "Race day",
      value: facts.raceDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    });
  }
  if (daysToRace !== null && daysToRace >= 0) {
    rows.push({
      label: "To build",
      value: daysToRace === 0 ? "Race day" : `${daysToRace} days`,
    });
  }

  if (rows.length === 0) return null;

  return (
    <Card>
      <p
        style={{
          margin: "0 0 var(--space-2)",
          fontFamily: "var(--font-mono, ui-monospace)",
          fontSize: "var(--text-2xs)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--text)",
          opacity: 0.5,
        }}
      >
        What Ben is working from
      </p>
      <div style={{ display: "grid", gap: 2 }}>
        {rows.map((r, i) => (
          <Rise key={r.label} index={i}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 16,
                padding: "10px 0",
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
              }}
            >
              <span style={{ opacity: 0.6, fontSize: "var(--text-sm, 14px)" }}>
                {r.label}
              </span>
              <span style={{ fontWeight: 600, textAlign: "right" }}>
                {r.value}
              </span>
            </div>
          </Rise>
        ))}
      </div>
    </Card>
  );
}
