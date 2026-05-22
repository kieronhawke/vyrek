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
    const { href, ...rest } = props;
    return (
      <Link href={href} {...rest} className={classes}>
        {children}
      </Link>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { href: _h, fullWidth: _f, tone: _t, size: _s, ...buttonRest } = props as CtaButtonAsButton & {
    href?: undefined;
  };
  return (
    <button {...buttonRest} className={classes}>
      {children}
    </button>
  );
}
