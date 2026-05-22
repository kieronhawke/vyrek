import { cn } from "@/lib/utils";

/**
 * Inline SVG monogram — V glyph on a rounded square. Used at small sizes
 * where the wordmark would be unreadable (app icons, very tight nav slots,
 * favicons via /public/logo-monogram.svg). currentColor inherits from
 * parent.
 */
export function Monogram({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 240 240"
      width={size}
      height={size}
      fill="none"
      aria-hidden
      className={className}
    >
      <rect
        x="6"
        y="6"
        width="228"
        height="228"
        rx="24"
        stroke="currentColor"
        strokeWidth="8"
      />
      <path
        d="M64 72 L120 184 L176 72"
        stroke="currentColor"
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * VYREK wordmark — rendered as live HTML text in Oswald 700 (`font-display`)
 * so it inherits text colour and scales cleanly. Use this everywhere the
 * brand name shows in the document flow (nav, hero, footer chrome).
 */
export function Wordmark({
  className,
  size = "md",
  as: Tag = "span",
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  as?: "span" | "div" | "h1" | "h2";
}) {
  const sizeMap = {
    sm: "text-xl",
    md: "text-2xl md:text-3xl",
    lg: "text-4xl md:text-5xl",
    xl: "text-5xl md:text-7xl",
  } as const;
  return (
    <Tag
      aria-label="Vyrek"
      className={cn(
        "font-display font-bold uppercase leading-none tracking-[-0.02em] text-vyrek-text",
        sizeMap[size],
        className,
      )}
    >
      Vyrek
    </Tag>
  );
}
