import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/photo-library";

/**
 * The member area's vocabulary.
 *
 * Every one of these is a device lifted from the MarchOn teardown
 * (docs/design/marchon-teardown.md §2) and rebuilt on our own tokens. They are
 * here rather than inline in pages because the previous member pages each
 * hand-rolled their own card and their own eyebrow, which is how seven screens
 * ended up with five different ideas of what a section heading looks like.
 */

/* ── Eyebrow ───────────────────────────────────────────────────────────── */

export function Eyebrow({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: "var(--space-2)",
        marginBottom: "var(--space-1)",
      }}
    >
      <h2 className="eyebrow" style={{ margin: 0 }}>
        {children}
      </h2>
      {right ? (
        <span className="eyebrow" style={{ margin: 0 }}>
          {right}
        </span>
      ) : null}
    </div>
  );
}

/* ── Card ──────────────────────────────────────────────────────────────── */

export function Card({
  children,
  padded = true,
  style,
}: {
  children: ReactNode;
  padded?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        padding: padded ? "var(--space-2)" : 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Chip ──────────────────────────────────────────────────────────────── */

type ChipTone = "neutral" | "accent" | "ok" | "warn" | "danger";

const CHIP_TONE: Record<ChipTone, { bg: string; fg: string }> = {
  neutral: { bg: "var(--surface-raised)", fg: "var(--text-muted)" },
  accent: { bg: "var(--accent-faint)", fg: "var(--accent-text)" },
  ok: { bg: "var(--surface-raised)", fg: "var(--ok)" },
  warn: { bg: "var(--surface-raised)", fg: "var(--warn)" },
  danger: { bg: "var(--surface-raised)", fg: "var(--danger)" },
};

/**
 * Metadata lives in chips, never in a sentence — set type, repeat count, load,
 * duration. A block has to be legible at a glance, mid-set, one-handed.
 */
export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: ChipTone;
}) {
  const t = CHIP_TONE[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        fontSize: "var(--text-2xs)",
        lineHeight: 1.3,
        fontWeight: 650,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>
  );
}

/* ── Prescription line ─────────────────────────────────────────────────── */

/**
 * `5 reps  Barbell Front Squat` with the quantity in the accent and the
 * movement in the text colour, and the qualifier muted underneath.
 *
 * The number is the part you scan mid-set, so the number gets the colour. This
 * is the single most repeated element in MarchOn's app and it is the reason
 * their sessions read faster than ours did.
 */
export function Prescription({
  quantity,
  movement,
  detail,
}: {
  quantity: string;
  movement: string;
  detail?: string;
}) {
  return (
    <div style={{ padding: "var(--space-1) 0" }}>
      <p style={{ margin: 0, fontSize: "var(--text-base)", lineHeight: 1.35 }}>
        <span
          className="num"
          style={{ color: "var(--accent-text)", fontWeight: 700 }}
        >
          {quantity}
        </span>{" "}
        <span style={{ fontWeight: 650 }}>{movement}</span>
      </p>
      {detail ? (
        <p
          style={{
            margin: "2px 0 0",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
          }}
        >
          {detail}
        </p>
      ) : null}
    </div>
  );
}

/* ── Rest band ─────────────────────────────────────────────────────────── */

/**
 * Rest is a hatched full-width band. It reads as "nothing happens here", which
 * is exactly what it means. Distinctive, and costs one gradient.
 */
export function RestBand({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        minHeight: 38,
        marginTop: "var(--space-1)",
        borderRadius: 4,
        color: "var(--text-muted)",
        fontSize: "var(--text-xs)",
        fontWeight: 600,
        backgroundImage:
          "repeating-linear-gradient(135deg, var(--surface-raised) 0 6px, transparent 6px 12px)",
        border: "1px solid var(--border)",
      }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        aria-hidden
      >
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2M9 2h6" />
      </svg>
      {children}
    </div>
  );
}

/* ── Stat tile ─────────────────────────────────────────────────────────── */

/**
 * A row of stat tiles.
 *
 * Was an inline `repeat(auto-fit, minmax(96px, 1fr))`, which on a monitor
 * stretched three tiles across a thousand pixels — a two-character number
 * marooned in the middle of a 330px box. A class rather than an inline style
 * so the width can be capped per breakpoint; see `.member-stattiles`.
 */
export function StatTiles({ children }: { children: ReactNode }) {
  return <div className="member-stattiles">{children}</div>;
}

export function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        padding: "var(--space-2)",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        minWidth: 0,
      }}
    >
      <span
        className="eyebrow"
        style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
      >
        {label}
      </span>
      <span
        className="num"
        style={{
          fontSize: "var(--text-xl)",
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </span>
      {sub ? (
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          {sub}
        </span>
      ) : null}
    </div>
  );
}

/* ── Photo header ──────────────────────────────────────────────────────── */

/**
 * Full-bleed photograph with the content anchored in the bottom third over a
 * gradient. The pattern Kieron pointed at in MarchOn, and what the Elite 15
 * frames were shot for.
 *
 * `mono` follows the catalogue's own judgement on whether a frame survives
 * black and white, applied in CSS so there is no second set of files.
 */
export function PhotoHeader({
  photo,
  eyebrow,
  title,
  children,
  height = 260,
}: {
  photo: Photo;
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  height?: number;
}) {
  return (
    <div
      style={{
        position: "relative",
        marginInline: "calc(var(--space-2) * -1)",
        marginTop: "calc(var(--space-3) * -1)",
        marginBottom: "var(--space-3)",
        minHeight: height,
        display: "flex",
        alignItems: "flex-end",
        overflow: "hidden",
        isolation: "isolate",
        /**
         * A solid dark ground under the photograph.
         *
         * Visually it is never seen — the image covers it. It is here because
         * an automated contrast check cannot see a photograph: axe walks up
         * the ancestors looking for a background colour to measure the white
         * headline against, and without this it finds the page (#f4f2f0) and
         * reports white-on-white. Giving it a real dark ancestor makes the
         * check measure what a human actually sees.
         */
        background: "var(--bg)",
      }}
    >
      <Image
        src={photo.wide ?? photo.src}
        alt=""
        fill
        priority
        sizes="(min-width: 768px) 760px, 100vw"
        style={{
          objectFit: "cover",
          filter: photo.mono ? "grayscale(1) contrast(1.05)" : undefined,
          zIndex: -2,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: -1,
          background:
            "linear-gradient(180deg, rgb(0 0 0 / 15%) 0%, rgb(0 0 0 / 45%) 45%, rgb(0 0 0 / 82%) 100%)",
        }}
      />
      <div style={{ padding: "var(--space-3) var(--space-2)", width: "100%" }}>
        {eyebrow ? (
          <p
            className="eyebrow"
            style={{ color: "rgb(255 255 255 / 78%)", margin: "0 0 4px" }}
          >
            {eyebrow}
          </p>
        ) : null}
        <h1
          style={{
            margin: 0,
            color: "#fff",
            fontSize: "var(--text-2xl)",
            lineHeight: 1.05,
            fontWeight: 800,
            letterSpacing: "-0.025em",
            textWrap: "balance",
          }}
        >
          {title}
        </h1>
        {children ? (
          <div style={{ marginTop: "var(--space-1)", color: "rgb(255 255 255 / 88%)" }}>
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ── Primary action ────────────────────────────────────────────────────── */

export function PrimaryAction({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: 54,
        background: "var(--accent)",
        color: "var(--accent-ink)",
        borderRadius: 999,
        fontSize: "var(--text-lg)",
        fontWeight: 700,
        letterSpacing: "-0.01em",
        textDecoration: "none",
      }}
    >
      {children}
    </a>
  );
}

/* ── Label / value row ─────────────────────────────────────────────────── */

export function Row({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: ReactNode;
  tone?: string;
  href?: string;
}) {
  const inner = (
    <>
      <span
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
          minWidth: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          color: tone ?? "var(--text)",
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </>
  );

  const style: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "var(--space-2)",
    minHeight: 48,
    padding: "0 var(--space-2)",
    borderBottom: "1px solid var(--border)",
    textDecoration: "none",
    color: "inherit",
  };

  if (href) {
    return (
      <a href={href} style={style}>
        {inner}
      </a>
    );
  }
  return <div style={style}>{inner}</div>;
}

/** A group of Rows. Strips the trailing divider so the card edge is clean. */
export function RowGroup({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-card)",
        overflow: "hidden",
      }}
      className="member-rowgroup"
    >
      {children}
    </div>
  );
}
