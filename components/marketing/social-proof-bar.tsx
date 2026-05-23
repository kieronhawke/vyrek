import { Container } from "@/components/shared/container";
import { CountUp } from "@/components/shared/count-up";
import { getActiveStats } from "@/lib/stats";

// Press logo wordmarks. DEMO placeholders. Replace with real partner
// logos only after written endorsement is secured (UK ASA / CAP 3.7).
const PRESS_PLACEHOLDERS = ["MENS HEALTH", "RUNNERS WORLD", "WIT FITNESS", "HYROX MAG"];

export function SocialProofBar() {
  const { active } = getActiveStats();

  return (
    <section
      aria-label="Social proof"
      className="border-y border-vyrek-border-subtle bg-vyrek-base/60"
    >
      <Container>
        <div className="flex flex-col items-center justify-center gap-4 py-4 md:flex-row md:gap-8 md:py-3">
          <div className="flex items-center gap-3 text-sm text-vyrek-text-secondary">
            <span aria-label="5 out of 5 stars" className="text-vyrek-accent">
              ★★★★★
            </span>
            <span aria-hidden className="text-vyrek-text-tertiary">·</span>
            <span className="tabular-nums">
              <CountUp
                value={active}
                durationMs={1100}
                className="font-medium text-vyrek-text"
              />{" "}
              athletes training
            </span>
          </div>

          <span aria-hidden className="hidden text-vyrek-text-tertiary md:inline">
            ·
          </span>

          <div
            className="flex items-center gap-5 md:gap-7"
            aria-label="Press placeholder, replace with real partners before launch"
          >
            {/*
              These are intentionally rendered as monospace wordmarks (not as
              third-party logos) until real press partnerships are signed.
              The brief is emphatic about not faking endorsements (ASA).
            */}
            {PRESS_PLACEHOLDERS.map((press) => (
              <span
                key={press}
                className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary"
              >
                {press}
              </span>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
