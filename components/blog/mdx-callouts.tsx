import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Visual-rhythm components for MDX. Authors drop these inline in posts to
 * break up long stretches of body copy with callouts, pull quotes, and key
 * stats. Each component is intentionally minimal, they reuse the Vyrek
 * design tokens and don't override the prose font sizing.
 */

const TONE_STYLES = {
  info: {
    border: "border-vyrek-accent/40",
    bg: "bg-vyrek-accent/5",
    eyebrow: "text-vyrek-accent",
    label: "NOTE",
  },
  tip: {
    border: "border-vyrek-success/40",
    bg: "bg-vyrek-success/5",
    eyebrow: "text-vyrek-success",
    label: "TIP",
  },
  warn: {
    border: "border-vyrek-warning/40",
    bg: "bg-vyrek-warning/5",
    eyebrow: "text-vyrek-warning",
    label: "HEADS UP",
  },
  insight: {
    border: "border-vyrek-text/15",
    bg: "bg-vyrek-elevated",
    eyebrow: "text-vyrek-text-tertiary",
    label: "INSIGHT",
  },
} as const;

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: keyof typeof TONE_STYLES;
  title?: string;
  children: ReactNode;
}) {
  const s = TONE_STYLES[tone];
  return (
    <aside
      role="note"
      className={cn(
        "mt-8 rounded-lg border-l-4 border-y border-r border-vyrek-border-subtle p-5 md:p-6",
        s.border,
        s.bg,
      )}
    >
      <p
        className={cn(
          "font-mono text-[10px] uppercase tracking-[0.22em]",
          s.eyebrow,
        )}
      >
        [ {s.label}{title ? ` · ${title}`: ""} ]
      </p>
      <div className="mt-3 text-base leading-relaxed text-vyrek-text md:text-lg [&>p:first-child]:mt-0 [&>p]:mt-3">
        {children}
      </div>
    </aside>
  );
}

export function PullQuote({
  attribution,
  children,
}: {
  attribution?: string;
  children: ReactNode;
}) {
  return (
    <figure className="mt-10 md:mt-12">
      <blockquote className="border-l-2 border-vyrek-accent pl-6 text-balance text-2xl font-medium leading-tight tracking-[-0.02em] text-vyrek-text md:text-3xl">
        <span aria-hidden className="text-vyrek-accent">
          “
        </span>
        {children}
        <span aria-hidden className="text-vyrek-accent">
          ”
        </span>
      </blockquote>
      {attribution ? (
        <figcaption className="mt-3 pl-6 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">, {attribution}
        </figcaption>
      ): null}
    </figure>
  );
}

export function Stat({
  value,
  label,
  caption,
}: {
  value: string;
  label: string;
  caption?: string;
}) {
  return (
    <div className="mt-8 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5 md:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
        {label}
      </p>
      <p className="mt-2 text-5xl font-black leading-none tracking-[-0.04em] text-vyrek-text md:text-6xl">
        {value}
      </p>
      {caption ? (
        <p className="mt-3 max-w-md text-sm leading-relaxed text-vyrek-text-secondary md:text-base">
          {caption}
        </p>
      ): null}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="mt-8 grid gap-3 md:grid-cols-3">{children}</div>
  );
}

export function KeyTakeaways({
  items,
  children,
}: {
  items?: string[];
  children?: ReactNode;
}) {
  const list = Array.isArray(items) ? items: null;
  return (
    <aside
      aria-label="Key takeaways"
      className="mt-8 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5 md:p-6"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-accent">
        [ KEY TAKEAWAYS ]
      </p>
      {list ? (
        <ul className="mt-4 space-y-3">
          {list.map((it, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-base leading-relaxed text-vyrek-text md:text-lg"
            >
              <span
                aria-hidden
                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-vyrek-accent"
              />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      ): (
        <div className="mt-4 text-base leading-relaxed text-vyrek-text md:text-lg [&_ul]:mt-0 [&_ul]:list-none [&_ul]:space-y-3 [&_ul]:pl-0 [&_li]:flex [&_li]:items-start [&_li]:gap-3 [&_li]:pl-0 [&_li]:before:mt-2.5 [&_li]:before:size-1.5 [&_li]:before:shrink-0 [&_li]:before:rounded-full [&_li]:before:bg-vyrek-accent">
          {children}
        </div>
      )}
    </aside>
  );
}
