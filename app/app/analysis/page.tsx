import { assertMember } from "@/lib/member/auth";
import {
  DEMO_ATHLETES,
  DEMO_RACES,
} from "@/lib/member/demo";
import { SectionEyebrow } from "@/components/member/section-eyebrow";
import { AthleteSearch } from "@/components/member/athlete-search";
import { RaceList } from "@/components/member/race-list";
import { PaceCalculatorCard } from "@/components/member/pace-calculator-card";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  await assertMember("/app/analysis");

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          [ ANALYSIS ]
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-[-0.02em] text-vyrek-text md:text-3xl">
          Races, athletes, pace
        </h1>
        <p className="mt-1 text-sm text-vyrek-text-secondary">
          Search the Hyrox database. Track an athlete. Project your finish.
        </p>
      </header>

      {/* Athlete search */}
      <section className="mb-10">
        <SectionEyebrow title="Athlete search" right={`${DEMO_ATHLETES.length} indexed`} />
        <AthleteSearch athletes={DEMO_ATHLETES} />
      </section>

      {/* Pace calculator */}
      <section className="mb-10">
        <SectionEyebrow title="Race calculator" />
        <PaceCalculatorCard />
      </section>

      {/* Race tracker */}
      <section className="mb-10">
        <SectionEyebrow title="Upcoming races" right={`${DEMO_RACES.length} listed`} />
        <RaceList races={DEMO_RACES} />
      </section>
    </div>
  );
}
