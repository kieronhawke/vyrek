import { Container } from "@/components/shared/container";

/**
 * Honest pre-launch credibility strip. Removed previously:
 *   - Fabricated "athletes training right now" counter (synthesised from a
 *     date offset, not real subscribers).
 *   - Press placeholder logos labelled "As featured in" before any press
 *     partnership existed.
 *   - Plural "Built by Elite 15 athletes" when only one coach has signed.
 * Now states what is true today: the programme is built by an Elite 15
 * coach against the standards Hyrox publishes.
 */
const CREDS = [
  { label: "Programming", value: "By an Elite 15 coach" },
  { label: "Standards", value: "Calibrated to Hyrox" },
  { label: "Plan", value: "12 weeks, dated to your race" },
];

export function SocialProofBar() {
  return (
    <section
      aria-label="What Vyrek is"
      className="border-y border-vyrek-border-subtle bg-vyrek-base"
    >
      <Container>
        <div className="flex flex-col items-center justify-center gap-6 py-8 text-center md:py-10">
          <ul
            role="list"
            className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6"
          >
            {CREDS.map((c) => (
              <li key={c.label} className="flex flex-col items-center gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
                  {c.label}
                </span>
                <span className="text-sm text-vyrek-text md:text-base">
                  {c.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
