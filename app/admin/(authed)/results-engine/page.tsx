import type { Metadata } from "next";
import { getResultsRepository } from "@/lib/results/engine";
import { buildConsoleModel, copyForFix } from "@/lib/results/engine/ops/console";
import { ResultsEngineConsole } from "@/components/admin/results-engine/console";

export const metadata: Metadata = {
  title: "Results engine",
  robots: { index: false, follow: false },
};

/**
 * Operator Mode for ingestion.
 *
 * Inside the `(authed)` route group, so the layout's `assertAdmin()` gate
 * applies before this renders. The mutating endpoint checks auth again on its
 * own — a page gate protects the view, not the actions behind it.
 */
export const dynamic = "force-dynamic";

export default async function ResultsEnginePage() {
  const model = await buildConsoleModel(getResultsRepository());

  // Built server-side so the client never has to hold the raw payloads just to
  // offer a copy button.
  const copyBlocks: Record<string, string> = {};
  for (const alert of model.alerts) {
    copyBlocks[`alert:${alert.id}`] = copyForFix({ kind: "alert", alert });
  }
  for (const row of model.quarantine) {
    copyBlocks[`quarantine:${row.id}`] = copyForFix({ kind: "quarantine", row });
  }

  return (
    <div className="py-8">
      <ResultsEngineConsole model={model} copyBlocks={copyBlocks} />
    </div>
  );
}
