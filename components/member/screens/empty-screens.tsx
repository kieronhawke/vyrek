import Link from "next/link";
import {
  EmptyState,
  EmptyStateStyles,
} from "@/components/member/empty-state";
import { expectedWindow, type FirstRunState } from "@/lib/member/first-run";

/**
 * The rest of the tabs, before there is anything in them.
 *
 * Each one answers the same three questions the Today screen does: what is
 * true, when it changes, and what is worth doing now. They differ in the
 * third, because "wait" is not an answer and a different tab has a different
 * useful thing to offer.
 *
 * None of them apologise. An empty progress chart on day one is not a fault,
 * it is a person who has not trained yet, and saying so plainly reads better
 * than "no data available".
 */

function Ghost({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden style={{ display: "grid", gap: 10, opacity: 0.5 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 52,
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border)",
            background:
              "linear-gradient(90deg, var(--surface), var(--surface-raised), var(--surface))",
            opacity: 1 - i * 0.22,
          }}
        />
      ))}
    </div>
  );
}

function SecondaryLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 50,
        border: "1px solid var(--border-strong, var(--border))",
        color: "var(--text)",
        borderRadius: 999,
        fontWeight: 600,
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}

export function PlanEmpty({ state, base = "/app" }: { state: FirstRunState; base?: string }) {
  return (
    <>
      <EmptyStateStyles />
      <EmptyState
        eyebrow="Nothing scheduled yet"
        title="Your block lands here"
        body={`Twelve weeks, laid out day by day, with every session written for the days and kit you told us about. Ben is writing week one now and it will arrive ${expectedWindow()}.`}
        action={<SecondaryLink href={`${base}/today`}>Back to today</SecondaryLink>}
      >
        <Ghost rows={4} />
      </EmptyState>
    </>
  );
}

export function ProgressEmpty({ base = "/app" }: { base?: string }) {
  return (
    <>
      <EmptyStateStyles />
      <EmptyState
        eyebrow="No sessions logged"
        title="This fills itself in"
        body="Every session you tick off lands here: running volume, station splits, and what is actually improving rather than what feels like it is. There is nothing to show on day one, which is the correct amount."
        action={<SecondaryLink href={`${base}/today`}>Back to today</SecondaryLink>}
      >
        <Ghost rows={2} />
      </EmptyState>
    </>
  );
}

export function NutritionEmpty({ base = "/app" }: { base?: string }) {
  return (
    <>
      <EmptyStateStyles />
      <EmptyState
        eyebrow="Nothing logged"
        title="Fuelling, once training starts"
        body="Targets are set from your body weight and the week's training load, so they arrive with your first block rather than before it. Guessing at them now would only mean changing them on Monday."
        action={
          <SecondaryLink href="/blog/hyrox-weekly-nutrition-framework">
            How the targets are set
          </SecondaryLink>
        }
      />
    </>
  );
}

export function CoachEmpty({ firstName }: { firstName?: string | null }) {
  const name = firstName?.trim();
  return (
    <>
      <EmptyStateStyles />
      <EmptyState
        eyebrow="Direct to Ben"
        title="Say hello"
        body={`This goes to Ben, not a support queue${name ? `, ${name}` : ""}. Anything about the plan, a niggle, a week that will not fit round work: this is the place. He answers in the evenings, usually the same day.`}
        action={<SecondaryLink href="/blog/first-hyrox-preparation-guide">Not sure what to ask?</SecondaryLink>}
      />
    </>
  );
}

export function AnalysisEmpty() {
  return (
    <>
      <EmptyStateStyles />
      <EmptyState
        eyebrow="No races yet"
        title="Your races, broken down"
        body="Once you have raced, every split lands here against the field in your division and age group, so you can see where the time actually went rather than where it felt like it went."
        action={<SecondaryLink href="/hyrox/events">Find a race</SecondaryLink>}
      >
        <Ghost rows={3} />
      </EmptyState>
    </>
  );
}
