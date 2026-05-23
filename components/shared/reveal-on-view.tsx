"use client";

import * as motion from "motion/react-client";
import type { ComponentProps, ReactNode } from "react";

/**
 * Baseline scroll-trigger for every section. Slides up 12px when the
 * element enters the viewport. Honours `prefers-reduced-motion` automatically.
 *
 * Important: opacity stays at 1 throughout. Earlier versions used
 * `opacity: 0 -> 1` which baked an opacity:0 into the SSR'd HTML, meaning
 * the content was invisible until JS hydrated and the IntersectionObserver
 * fired, which broke no-JS rendering, Lighthouse / SEO crawlers' first
 * paint, and in-page Find. Y-only keeps the polish while leaving content
 * always visible.
 */
export function RevealOnView({
  children,
  delay = 0,
  as = "div",
  className,
  ...rest
}: {
  children: ReactNode;
  delay?: number;
  as?: "div" | "section" | "article" | "header" | "footer";
  className?: string;
} & Omit<ComponentProps<typeof motion.div>, "children" | "className">) {
  const Tag = motion[as] as typeof motion.div;
  return (
    <Tag
      initial={{ y: 12 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  );
}
