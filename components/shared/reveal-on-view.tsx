"use client";

import * as motion from "motion/react-client";
import type { ComponentProps, ReactNode } from "react";

/**
 * Baseline scroll-trigger for every section (brief Stage spec). Fades in
 * with a 12px Y offset when the element enters the viewport. Honours
 * `prefers-reduced-motion` automatically — Motion checks the media query.
 *
 * Use this around major blocks. Don't nest — the inner reveal won't fire
 * until both viewports overlap, which produces a stutter.
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
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  );
}
