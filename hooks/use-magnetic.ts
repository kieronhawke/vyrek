"use client";

import { useEffect, type RefObject } from "react";

type Options = {
  strength?: number;
  radius?: number;
};

/**
 * Linear-style magnetic pull, the element drifts toward the cursor when
 * the cursor is within `radius` px of its center. No-op on coarse pointers
 * (touch) and when the user prefers reduced motion.
 */
export function useMagnetic(
  ref: RefObject<HTMLElement | null>,
  { strength = 0.28, radius = 120 }: Options = {},
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const apply = () => {
      currentX += (targetX - currentX) * 0.18;
      currentY += (targetY - currentY) * 0.18;
      el.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
      if (
        Math.abs(currentX - targetX) > 0.1 ||
        Math.abs(currentY - targetY) > 0.1
      ) {
        raf = requestAnimationFrame(apply);
      }
    };

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const distance = Math.hypot(dx, dy);
      if (distance < radius) {
        const pull = 1 - distance / radius;
        targetX = dx * strength * pull;
        targetY = dy * strength * pull;
      } else {
        targetX = 0;
        targetY = 0;
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
      el.style.transform = "";
    };
  }, [ref, strength, radius]);
}
