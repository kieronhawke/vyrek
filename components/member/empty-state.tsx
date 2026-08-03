import type { CSSProperties, ReactNode } from "react";

/**
 * Empty states for the member area.
 *
 * The brief was to make "no data yet" feel deliberate rather than broken, so
 * these are built to the same tokens as the rest of the app and carry real
 * information: what is happening, when it will change, and one thing worth
 * doing in the meantime. An empty screen that only apologises is a dead end.
 *
 * Animation is CSS keyframes declared alongside the markup rather than a
 * library, because the member bundle does not need a motion runtime for six
 * fades. Everything is wrapped in a prefers-reduced-motion query: the whole
 * point is that this screen is calm, and calm for somebody with vestibular
 * issues means it holds still.
 */

/* Shared keyframes + the reduced-motion opt-out. Rendered once per screen. */
export function EmptyStateStyles() {
  return (
    <style>{`
      @keyframes suth-rise {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: none; }
      }
      @keyframes suth-breathe {
        0%, 100% { opacity: 0.55; transform: scale(1); }
        50%      { opacity: 1;    transform: scale(1.06); }
      }
      @keyframes suth-sweep {
        from { transform: translateX(-100%); }
        to   { transform: translateX(320%); }
      }
      .suth-rise { animation: suth-rise 620ms cubic-bezier(.22,.61,.36,1) both; }
      .suth-breathe { animation: suth-breathe 2.8s ease-in-out infinite; }
      .suth-sweep::after {
        content: "";
        position: absolute;
        inset: 0 auto 0 0;
        width: 30%;
        background: linear-gradient(
          90deg, transparent, rgba(255,255,255,0.22), transparent
        );
        animation: suth-sweep 2.4s ease-in-out infinite;
      }
      @media (prefers-reduced-motion: reduce) {
        .suth-rise, .suth-breathe { animation: none; opacity: 1; transform: none; }
        .suth-sweep::after { animation: none; display: none; }
      }
    `}</style>
  );
}

/** Staggered entrance. Index drives the delay so a screen resolves in order. */
export function Rise({
  children,
  index = 0,
  style,
}: {
  children: ReactNode;
  index?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      className="suth-rise"
      style={{ animationDelay: `${Math.min(index, 6) * 70}ms`, ...style }}
    >
      {children}
    </div>
  );
}

/**
 * The waiting indicator. Deliberately not a spinner: a spinner says "the
 * software is busy", and nothing is busy. A person is writing something.
 */
export function PendingBar({ progress }: { progress: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label="Progress on your first week"
      style={{
        position: "relative",
        overflow: "hidden",
        height: 6,
        borderRadius: 999,
        background: "var(--border)",
      }}
    >
      <div
        className="suth-sweep"
        style={{
          position: "relative",
          overflow: "hidden",
          height: "100%",
          width: `${Math.max(pct, 8)}%`,
          borderRadius: 999,
          background: "var(--accent)",
          transition: "width 800ms cubic-bezier(.22,.61,.36,1)",
        }}
      />
    </div>
  );
}

/** A soft pulsing dot, for "live, but nothing has happened yet". */
export function PulseDot({ size = 8 }: { size?: number }) {
  return (
    <span
      className="suth-breathe"
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: 999,
        background: "var(--accent)",
        flex: "none",
      }}
    />
  );
}

/**
 * The generic shape. `title` says what is true, `body` says why, `meta` is
 * the reassuring detail, and `action` is the one useful thing to do now.
 */
export function EmptyState({
  eyebrow,
  title,
  body,
  meta,
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  meta?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        padding: "var(--space-4) var(--space-2)",
        textAlign: "left",
      }}
    >
      {eyebrow && (
        <Rise index={0}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--accent-text)",
            }}
          >
            <PulseDot />
            {eyebrow}
          </div>
        </Rise>
      )}

      <Rise index={1}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-2xl, 28px)",
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: "var(--text)",
            margin: 0,
          }}
        >
          {title}
        </h2>
      </Rise>

      <Rise index={2}>
        <p
          style={{
            margin: 0,
            maxWidth: "var(--member-prose, 44ch)",
            color: "var(--text-secondary, var(--text))",
            opacity: 0.78,
            lineHeight: 1.55,
          }}
        >
          {body}
        </p>
      </Rise>

      {meta && <Rise index={3}>{meta}</Rise>}
      {children && <Rise index={4}>{children}</Rise>}
      {action && <Rise index={5}>{action}</Rise>}
    </div>
  );
}
