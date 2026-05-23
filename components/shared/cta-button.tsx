import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Tone = "accent" | "ghost";
type Size = "sm" | "md" | "lg";

const toneClasses: Record<Tone, string> = {
  accent:
    "bg-vyrek-accent text-[#0A0A0A] hover:bg-vyrek-accent-hover active:scale-[0.98]",
  ghost:
    "border border-vyrek-border bg-transparent text-vyrek-text hover:bg-vyrek-elevated active:scale-[0.98]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-5 text-base",
  lg: "h-14 px-6 text-base",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-pill font-medium tracking-tight transition-[background,transform,opacity] duration-fast ease-out outline-none focus-visible:ring-2 focus-visible:ring-vyrek-accent focus-visible:ring-offset-2 focus-visible:ring-offset-vyrek-base disabled:pointer-events-none disabled:opacity-50";

type CtaButtonAsLink = {
  href: string;
  tone?: Tone;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "className">;

type CtaButtonAsButton = {
  href?: undefined;
  tone?: Tone;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
} & ComponentPropsWithoutRef<"button">;

export function CtaButton(props: CtaButtonAsLink | CtaButtonAsButton) {
  const { tone = "accent", size = "lg", fullWidth, className, children } = props;
  const classes = cn(
    baseClasses,
    toneClasses[tone],
    sizeClasses[size],
    fullWidth && "w-full",
    className,
  );

  if ("href" in props && props.href) {
    // Strip our custom props (tone, size, fullWidth, className, children)
    // so they don't bleed onto the underlying <a> as DOM attributes.
    const {
      href,
      tone: _t,
      size: _s,
      fullWidth: _f,
      className: _c,
      children: _ch,
      ...linkRest
    } = props;
    void _t;
    void _s;
    void _f;
    void _c;
    void _ch;
    return (
      <Link href={href} {...linkRest} className={classes}>
        {children}
      </Link>
    );
  }

  const {
    href: _h,
    tone: _bt,
    size: _bs,
    fullWidth: _bf,
    className: _bc,
    children: _bch,
    ...buttonRest
  } = props as CtaButtonAsButton & { href?: undefined };
  void _h;
  void _bt;
  void _bs;
  void _bf;
  void _bc;
  void _bch;
  return (
    <button {...buttonRest} className={classes}>
      {children}
    </button>
  );
}
