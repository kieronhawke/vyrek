import type { Metadata } from "next";
import { Suspense } from "react";
import { siteUrl } from "@/lib/blog/urls";
import { listDivisionReferences, SIMULATOR_DIVISIONS } from "@/lib/results/reference-splits";
import { Simulator, type SimulatorReference } from "@/components/results/simulator/simulator";
import { MicroLabel, SkeletonRows } from "@/components/results/ui/primitives";
import { CoachingCta } from "@/components/results/coaching-cta";

/**
 * `/simulator` — race time calculator.
 *
 * Two modes: build a race from splits, or set a goal and get the splits it
 * requires. The second is the one the reference site does not have.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "HYROX Time Calculator & Race Simulator",
  description:
    "Model your HYROX finish station by station, or set a goal time and get the splits "
    + "you need to hit it. Built on real division distributions.",
  alternates: { canonical: "/simulator" },
  openGraph: { url: `${siteUrl()}/simulator`, type: "website" },
};

export default async function SimulatorPage() {
  // Precomputed at build; no request-time aggregation.
  const references: SimulatorReference[] = listDivisionReferences(SIMULATOR_DIVISIONS);

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6 md:py-10">
      <header>
        <MicroLabel>[ SIMULATOR ]</MicroLabel>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.02em] text-suth-text md:text-4xl">
          HYROX Race Simulator
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-suth-text-secondary">
          Build a race from your splits to see where it lands — or set a goal time and get the
          split you need at every station. Most calculators only do the first.
        </p>
      </header>

      <div className="mt-6">
        {references.length === 0 ? (
          <p className="text-sm text-suth-text-secondary">
            Reference data is unavailable right now.
          </p>
        ) : (
          <Suspense fallback={<SkeletonRows rows={10} />}>
            <Simulator references={references} initialDivision={references[0].division} />
          </Suspense>
        )}
      </div>

      <CoachingCta
        className="mt-8"
        headline="A target is not a plan"
        body="The splits above tell you what the race has to look like. Training that produces them is the other half."
      />
    </div>
  );
}
