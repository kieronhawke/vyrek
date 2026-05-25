"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Global motion config. Sets `reducedMotion="user"` so every motion/react
 * component respects the user's OS-level prefers-reduced-motion preference
 * automatically. Without this, motion components with `initial={{opacity:0}}`
 * + `whileInView={{opacity:1}}` stay invisible for reduced-motion users
 * because the whileInView animation gets skipped.
 *
 * Mounted once at the top of the app body so every motion descendant inherits.
 */
export function MotionConfigProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
