"use client";

import { Printer } from "lucide-react";
import { DownloadButton } from "./download-button";
import { resultToCsv, exportFilename, type ResultExportInput } from "@/lib/results/export";

/**
 * Export controls for a single race: PDF and CSV.
 *
 * **PDF via the browser's print pipeline**, not a PDF library. That choice is
 * deliberate — it adds no dependency, produces selectable text rather than a
 * rasterised screenshot, respects the user's paper size, and works on iOS and
 * Android where "Save as PDF" is built into the share sheet. `results-print.css`
 * inverts the dark theme to ink-on-paper so it does not empty a cartridge.
 *
 * CSV carries every segment with the division average and the delta beside it,
 * which is the shape a coach wants in a spreadsheet.
 */
export function ResultExport({ input }: { input: ResultExportInput }) {
  const stem = exportFilename(input.athleteName, input.eventName);

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
        filename={`${stem}-splits.csv`}
        label="Export splits"
        build={() => resultToCsv(input)}
      />
    </div>
  );
}
