import { Container } from "@/components/shared/container";
import { CountUp } from "@/components/shared/count-up";
import { getActiveStats } from "@/lib/stats";

// Press logo wordmarks. Rendered as monospace until real partnerships are
// signed; ASA-safe placeholder (we don't claim endorsement). Each unique.
const PRESS_PLACEHOLDERS = [
  "MEN'S HEALTH",
  "RUNNER'S WORLD",
  "WIT FITNESS",
  "HYROX MAG",
];

export function SocialProofBar() {
  const { active } = getActiveStats();

  return (
    <section
      aria-label="Social proof"
      className="border-y border-vyrek-border-subtle bg-vyrek-base"
    >
      <Container>
        <div className="flex flex-col items-center justify-center gap-5 py-8 text-center md:py-10">
          {/* Row 1: stars + credibility + active count, single row */}
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
            <span aria-label="5 out of 5 stars" className="text-vyrek-accent">
              ★★★★★
            </span>
            <span className="text-sm text-vyrek-text md:text-base">
              Built by Elite 15 athletes
            </span>
            <span
              aria-hidden
              className="hidden text-vyrek-text-tertiary sm:inline"
            >
              ·
            </span>
            <span className="text-sm text-vyrek-text-secondary md:text-base">
              <CountUp
                value={active}
                durationMs={1100}
                className="tabular-nums font-medium text-vyrek-text"
              />{" "}
              athletes training right now
            </span>
          </div>

          {/* Row 2: press logo strip */}
          <div className="flex w-full flex-col items-center gap-3 border-t border-vyrek-border-subtle pt-5 md:pt-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
              As featured in
            </p>
            <div
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 md:gap-x-10"
              aria-label="Press placeholders, replace with real partners before launch"
            >
              {PRESS_PLACEHOLDERS.map((press) => (
                <span
                  key={press}
                  className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary"
                >
                  {press}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
