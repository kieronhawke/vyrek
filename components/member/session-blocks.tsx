import {
  effortBand,
  type Block,
  type Effort,
  type Interval,
} from "@/lib/member/session-structure";
import { Chip, ChipRow, RestBand } from "@/components/member/ui";

/**
 * A session, as numbered intervals rather than a paragraph.
 *
 * Lifted from RoxFit (docs/design/app-references.md §1.5), which is the closest
 * of the four reference apps to HYROX and structures a session better than we
 * did: a numbered gutter, an interval chip, the movement, the quantity, and
 * rest as its own band.
 */

/** ▮▮▮ — intensity as a glyph, not a word. Teardown §1.6. */
export function EffortBars({ rpe }: { rpe: Effort }) {
  const band = effortBand(rpe);
  if (!band) return null;
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
      title={`${band.label}, ${rpe} out of 10`}
    >
      <span aria-hidden style={{ display: "inline-flex", gap: 2 }}>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            style={{
              width: 3,
              height: 11,
              borderRadius: 1,
              background: i <= band.bars ? band.tone : "var(--border-strong)",
            }}
          />
        ))}
      </span>
      <span
        className="num"
        style={{
          fontSize: "var(--text-2xs)",
          fontWeight: 700,
          color: band.tone,
        }}
      >
        {rpe}/10
      </span>
      <span className="sr-only">
        {band.label} effort, {rpe} out of 10 perceived exertion
      </span>
    </span>
  );
}

function IntervalRow({
  interval,
  index,
  total,
}: {
  interval: Interval;
  index: number;
  total: number;
}) {
  return (
    <li style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: 10 }}>
      <span
        className="num"
        aria-hidden
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 26,
          height: 26,
          borderRadius: 999,
          border: "1px solid var(--border)",
          fontSize: "var(--text-2xs)",
          fontWeight: 700,
          color: "var(--text-muted)",
          marginTop: 2,
        }}
      >
        {index + 1}
      </span>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "var(--space-1)",
          }}
        >
          <p style={{ margin: 0, fontSize: "var(--text-base)", lineHeight: 1.3 }}>
            <span className="num" style={{ color: "var(--accent-text)", fontWeight: 700 }}>
              {interval.quantity}
            </span>{" "}
            <span style={{ fontWeight: 650 }}>{interval.movement}</span>
          </p>
          {interval.rpe ? <EffortBars rpe={interval.rpe} /> : null}
        </div>

        {interval.qualifier ? (
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
            }}
          >
            {interval.qualifier}
          </p>
        ) : null}

        {interval.rest ? <RestBand>{interval.rest}</RestBand> : null}

        <span className="sr-only">
          Interval {index + 1} of {total}
        </span>
      </div>
    </li>
  );
}

export function SessionBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div style={{ display: "grid", gap: "var(--space-2)" }}>
      {blocks.map((block) => (
        <section
          key={block.letter}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            background: "var(--surface)",
            overflow: "hidden",
          }}
        >
          <header
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1)",
              flexWrap: "wrap",
              padding: "var(--space-2)",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface-raised)",
            }}
          >
            <Chip tone={block.letter === "W" ? "neutral" : "accent"}>
              {block.letter}
            </Chip>
            <strong style={{ fontSize: "var(--text-base)" }}>{block.label}</strong>
            <span style={{ marginInlineStart: "auto" }}>
              <ChipRow>
                {block.shape ? <Chip>{block.shape}</Chip> : null}
                {block.duration ? <Chip>{block.duration}</Chip> : null}
              </ChipRow>
            </span>
          </header>

          <ol
            style={{
              listStyle: "none",
              margin: 0,
              padding: "var(--space-2)",
              display: "grid",
              gap: "var(--space-2)",
            }}
          >
            {block.intervals.map((interval, i) => (
              <IntervalRow
                key={`${block.letter}-${i}`}
                interval={interval}
                index={i}
                total={block.intervals.length}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
