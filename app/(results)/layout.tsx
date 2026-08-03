import type { Metadata } from "next";
import { getDataMode } from "@/lib/results";
import "@/app/results-tokens.css";
import "@/app/results-print.css";
import "@/app/results-report-print.css";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { ResultsShell } from "@/components/results/shell/results-shell";
import { DemoDataPill } from "@/components/results/shell/demo-pill";
import { TimingAttribution } from "@/components/results/shell/timing-attribution";
import { DataNotice } from "@/components/results/shell/data-notice";

/**
 * While `NEXT_PUBLIC_DATA_MODE=demo` the whole section is noindex.
 *
 * The demo dataset is 76,000 invented races attributed to 4,000 invented
 * names, against real events that real people actually ran. A "Demo data" pill
 * tells a human reader; it tells Google nothing. Indexing fabricated results
 * for "hyrox london 2026 results" would be bad for the athletes it names and
 * worse for the domain that published it.
 *
 * Pages inherit this because none of them set `robots` themselves. Setting
 * NEXT_PUBLIC_DATA_MODE=live flips the section to indexable in one variable —
 * which is the same switch that swaps the data source.
 */
export const metadata: Metadata = getDataMode() === "demo"
  ? { robots: { index: false, follow: true } }
  : {};

/**
 * Shell for the whole Results section.
 *
 * A route group, so every page here shares the sub-navigation, search and
 * demo pill without the URLs gaining a segment — `/events` stays `/events`.
 * The layout stays a Server Component; only the interactive parts of the
 * shell are client-side.
 *
 * `pb-20` on mobile clears the bottom tab bar.
 */
export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingNav />
      {/* Spacer for the fixed marketing nav and cookie strip. Fixed height,
          not the sticky offset variable — see results-tokens.css. */}
      <div className="pt-[var(--results-content-offset)]">
        {/* Above the content, because "these numbers may be stale" is not a
            footnote. Renders nothing when everything is healthy. */}
        <DataNotice />
        <ResultsShell>
          <main id="main" className="min-h-screen pb-20 md:pb-0">
            {children}
          </main>
        </ResultsShell>
      </div>
      {/* One credit for the whole section rather than per page: it applies to
          every view here, and repeating it per template is how it drifts. */}
      <TimingAttribution />
      <DemoDataPill />
      <MarketingFooter />
    </>
  );
}
