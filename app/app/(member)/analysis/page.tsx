import { assertFullMember } from "@/lib/member/auth";
import { DEMO_ATHLETES_ALL, DEMO_RACES_ALL } from "@/lib/member/demo";
import { AthleteSearch } from "@/components/member/athlete-search";
import { RaceList } from "@/components/member/race-list";
import { PaceCalculatorCard } from "@/components/member/pace-calculator-card";
import { Eyebrow } from "@/components/member/ui";

/**
 * ANALYSIS — the HYROX database, reachable from Progress.
 *
 * Not a tab of its own: five is the ceiling for a thumb-reachable bar, and
 * this is a thing you go looking for rather than a thing you open daily. It
 * was in no navigation at all before, which is worse than either.
 *
 * The width used to be set here (max-w-3xl); it belongs to the shell now.
 */
export default async function AnalysisPage() {
  await assertFullMember("/app/analysis");

  return (
    <>
      <p className="eyebrow">Analysis</p>
      <h1
        style={{
          fontSize: "var(--text-2xl)",
          lineHeight: 1.1,
          fontWeight: 800,
          letterSpacing: "-0.025em",
          margin: "var(--space-1) 0 4px",
        }}
      >
        Races, athletes, pace
      </h1>
      <p
        style={{
          margin: "0 0 var(--space-4)",
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
        }}
      >
        Search the HYROX database, track an athlete, project your finish.
      </p>

      <section style={{ marginBottom: "var(--space-4)" }}>
        <Eyebrow right={`${DEMO_ATHLETES_ALL.length} indexed`}>
          Athlete search
        </Eyebrow>
        <AthleteSearch athletes={DEMO_ATHLETES_ALL} />
      </section>

      <section style={{ marginBottom: "var(--space-4)" }}>
        <Eyebrow>Race calculator</Eyebrow>
        <PaceCalculatorCard />
      </section>

      <section>
        <Eyebrow right={`${DEMO_RACES_ALL.length} listed`}>
          Upcoming races
        </Eyebrow>
        <RaceList races={DEMO_RACES_ALL} />
      </section>
    </>
  );
}
