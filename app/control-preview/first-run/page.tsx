import { FirstRunScreen } from "@/components/member/screens/first-run-screen";
import {
  PlanEmpty,
  ProgressEmpty,
  NutritionEmpty,
  CoachEmpty,
  AnalysisEmpty,
} from "@/components/member/screens/empty-screens";
import { resolveFirstRun, type MemberFacts } from "@/lib/member/first-run";

/**
 * Every empty state on one page, so they can be reviewed together.
 *
 * They are the screens a paying customer actually sees on day one, and the
 * only way to judge whether "no data yet" feels deliberate is to look at
 * them side by side rather than one at a time.
 */
const FACTS: MemberFacts = {
  firstName: "Sample",
  programme: "First Race",
  raceDate: new Date("2026-10-24T00:00:00Z"),
  daysPerWeek: 3,
  joinedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
  publishedWeeks: 0,
  loggedSessions: 0,
};

const OVERDUE: MemberFacts = {
  ...FACTS,
  joinedAt: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 hours ago
};

function Divider({ label }: { label: string }) {
  return (
    <p
      style={{
        margin: "var(--space-8) 0 var(--space-2)",
        fontFamily: "var(--font-mono, ui-monospace)",
        fontSize: "var(--text-2xs)",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: "var(--accent-text)",
        borderTop: "1px solid var(--border)",
        paddingTop: "var(--space-2)",
      }}
    >
      {label}
    </p>
  );
}

export default function FirstRunPreview() {
  const base = "/control-preview/app";
  /* The chrome around this is the real thing: the layout passes
     blockWeek={0}, exactly as the member layout does for somebody with
     nothing published. */
  return (
    <div>
      <Divider label="Today, waiting on week one" />
      <FirstRunScreen state={resolveFirstRun(FACTS)} base={base} />

      <Divider label="Today, overdue" />
      <FirstRunScreen state={resolveFirstRun(OVERDUE)} base={base} />

      <Divider label="Plan" />
      <PlanEmpty state={resolveFirstRun(FACTS)} base={base} />

      <Divider label="Progress" />
      <ProgressEmpty base={base} />

      <Divider label="Nutrition" />
      <NutritionEmpty base={base} />

      <Divider label="Ask Ben" />
      <CoachEmpty firstName="Sample" />

      <Divider label="Analysis" />
      <AnalysisEmpty />
    </div>
  );
}
