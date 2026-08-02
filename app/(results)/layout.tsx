import "@/app/results-tokens.css";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { ResultsShell } from "@/components/results/shell/results-shell";
import { DemoDataPill } from "@/components/results/shell/demo-pill";

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
      {/* Spacer for the fixed marketing nav. Without it the sub-nav renders
          underneath the wordmark — see the first self-critique pass. */}
      <div className="pt-[var(--results-nav-offset)]">
        <ResultsShell>
          <main id="main" className="min-h-screen pb-20 md:pb-0">
            {children}
          </main>
        </ResultsShell>
      </div>
      <DemoDataPill />
      <MarketingFooter />
    </>
  );
}
