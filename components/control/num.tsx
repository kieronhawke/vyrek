import type { ReactNode } from "react";

/**
 * Every number in the product renders through this.
 *
 * docs/build-pack/spec/14 §3: "Every number renders in Geist Mono with
 * font-variant-numeric: tabular-nums. Race times, splits, weights, prices,
 * dates, percentages, counts. No exceptions. This is what makes a dense
 * table readable and it's what makes the whole thing feel like an
 * instrument."
 *
 * A rule that broad only survives if it is easier to follow than to break,
 * which is why this is a component rather than a utility class people have
 * to remember. Reach for <Num> and the rule is kept automatically.
 */
export function Num({
  children,
  className = "",
  align = "right",
  tone,
  size,
}: {
  children: ReactNode;
  className?: string;
  /** Numerics are right-aligned in tables by default. spec/14 §5. */
  align?: "left" | "right";
  tone?: "default" | "muted" | "faint" | "accent" | "warn" | "danger";
  /** Dashboard figures. `metric` is 48px, `metric-lg` the one hero number. */
  size?: "inherit" | "metric" | "metric-lg";
}) {
  const toneVar =
    tone === "muted"
      ? "var(--text-muted)"
      : tone === "faint"
        ? "var(--text-faint)"
        : tone === "accent"
          ? "var(--accent)"
          : tone === "warn"
            ? "var(--warn)"
            : tone === "danger"
              ? "var(--danger)"
              : undefined;

  const sizeStyle =
    size === "metric"
      ? { fontSize: "var(--metric)", lineHeight: "var(--metric-lh)" }
      : size === "metric-lg"
        ? { fontSize: "var(--metric-lg)", lineHeight: "var(--metric-lg-lh)" }
        : undefined;

  return (
    <span
      className={`num ${className}`}
      style={{
        textAlign: align,
        color: toneVar,
        ...sizeStyle,
      }}
    >
      {children}
    </span>
  );
}
