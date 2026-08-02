"use client";

import { Printer } from "lucide-react";
import { DownloadButton } from "./download-button";
import {
  athleteHistoryToCsv, exportFilename, type AthleteExportRace,
} from "@/lib/results/export";

/** Export controls for an athlete profile: full history as CSV, or a PDF. */
export function AthleteExport({
  name, races,
}: {
  name: string;
  races: AthleteExportRace[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" data-print-hide>
      <button
        type="button"
        onClick={() => window.print()}
        data-inline-tap
        className="inline-flex min-h-[40px] items-center gap-2 rounded-sm border border-suth-border
                   bg-suth-elevated px-3 text-xs text-suth-text-secondary transition-colors
                   hover:text-suth-text
                   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
      >
        <Printer className="size-3.5" aria-hidden />
        Save as PDF
      </button>

      <DownloadButton
        filename={`${exportFilename(name, "hyrox-history")}.csv`}
        label="Export history"
        build={() => athleteHistoryToCsv(name, races)}
      />
    </div>
  );
}
