import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Compact prose primitives for content pages (legal, about, how-it-works).
 * Kept inline rather than relying on Tailwind Typography plugin so we control
 * line-height + heading hierarchy in the editorial dark theme.
 */
export function ProseH2({
  children,
  className,
  ...rest
}: ComponentPropsWithoutRef<"h2">) {
  return (
    <h2
      className={cn(
        "mt-12 text-xl font-black tracking-[-0.02em] text-vyrek-text md:text-2xl",
        className,
      )}
      {...rest}
    >
      {children}
    </h2>
  );
}

export function ProseH3({
  children,
  className,
  ...rest
}: ComponentPropsWithoutRef<"h3">) {
  return (
    <h3
      className={cn(
        "mt-8 text-base font-bold uppercase tracking-[0.05em] text-vyrek-text md:text-lg",
        className,
      )}
      {...rest}
    >
      {children}
    </h3>
  );
}

export function ProseP({
  children,
  className,
  ...rest
}: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className={cn(
        "mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg",
        className,
      )}
      {...rest}
    >
      {children}
    </p>
  );
}

export function ProseUl({
  children,
  className,
  ...rest
}: ComponentPropsWithoutRef<"ul">) {
  return (
    <ul
      className={cn(
        "mt-4 space-y-2 text-base text-vyrek-text-secondary md:text-lg",
        className,
      )}
      {...rest}
    >
      {children}
    </ul>
  );
}

export function ProseLi({
  children,
  className,
  ...rest
}: ComponentPropsWithoutRef<"li">) {
  return (
    <li
      className={cn("flex items-start gap-3 leading-relaxed", className)}
      {...rest}
    >
      <span
        aria-hidden
        className="mt-2.5 size-1 shrink-0 rounded-full bg-vyrek-accent"
      />
      <span>{children}</span>
    </li>
  );
}

export function ProseAside({
  children,
  className,
  ...rest
}: ComponentPropsWithoutRef<"aside">) {
  return (
    <aside
      className={cn(
        "mt-8 rounded-md border border-vyrek-border-subtle bg-vyrek-elevated/60 p-5 text-sm leading-relaxed text-vyrek-text-secondary md:text-base",
        className,
      )}
      {...rest}
    >
      {children}
    </aside>
  );
}

export function ProseEmailLink({
  email,
  className,
}: {
  email: string;
  className?: string;
}) {
  return (
    <a
      href={`mailto:${email}`}
      className={cn(
        "text-vyrek-text underline underline-offset-4 transition-colors hover:text-vyrek-accent",
        className,
      )}
    >
      {email}
    </a>
  );
}

export function ProseWrapper({ children }: { children: ReactNode }) {
  return <div className="mt-12">{children}</div>;
}
