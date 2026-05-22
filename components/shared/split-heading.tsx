"use client";

import { useEffect, useRef, type ReactNode, type ElementType } from "react";

type Level = "h1" | "h2" | "h3";

/**
 * Section heading that streams in character-by-character via GSAP SplitText
 * when it scrolls into view. 30ms stagger, expo.out ease per the spec.
 *
 * Honours `prefers-reduced-motion`. Only fires once. If you need it to
 * re-fire on data change (e.g. a question heading on the quiz), pass a
 * stable `key` prop so React remounts the component.
 */
export function SplitHeading({
  as = "h2",
  children,
  className,
  id,
}: {
  as?: Level;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;
    let triggered = false;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting || triggered) return;
        triggered = true;
        obs.disconnect();

        (async () => {
          const [{ default: gsap }, { SplitText }] = await Promise.all([
            import("gsap"),
            import("gsap/SplitText"),
          ]);
          if (cancelled || !ref.current) return;
          gsap.registerPlugin(SplitText);

          const split = new SplitText(ref.current, {
            type: "chars,words",
            wordsClass: "inline-block",
          });
          const anim = gsap.from(split.chars, {
            opacity: 0,
            y: 16,
            duration: 0.7,
            stagger: 0.03,
            ease: "expo.out",
          });
          cleanup = () => {
            anim.kill();
            split.revert();
          };
        })();
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0 },
    );

    obs.observe(el);

    return () => {
      cancelled = true;
      obs.disconnect();
      cleanup?.();
    };
  }, []);

  const Tag = as as ElementType;
  return (
    <Tag ref={ref} id={id} className={className}>
      {children}
    </Tag>
  );
}
