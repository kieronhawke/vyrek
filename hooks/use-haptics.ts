"use client";

import { useCallback } from "react";

export type HapticType =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error";

const patterns: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10],
  warning: [20, 100, 20],
  error: [30, 100, 30, 100, 30],
};

/**
 * Triggers `navigator.vibrate` with the brief's mapped patterns.
 * No-op when:
 *   - SSR
 *   - browser doesn't expose the Vibration API (Safari iOS)
 *   - user has haptics disabled in their settings (Phase C will wire this)
 */
export function useHaptics() {
  return useCallback((type: HapticType) => {
    if (typeof window === "undefined") return;
    if (!("vibrate" in navigator)) return;
    if (window.localStorage.getItem("vyrek:haptics") === "off") return;
    navigator.vibrate(patterns[type]);
  }, []);
}
