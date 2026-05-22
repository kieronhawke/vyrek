"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMagnetic } from "@/hooks/use-magnetic";
import { useShouldServeHeavyAssets } from "@/hooks/use-network-information";
import { VIDEOS } from "@/lib/video-assets";

const HERO_VIDEO = VIDEOS.manBattleRopes;

export function Hero() {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaWrapRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const shouldServeVideo = useShouldServeHeavyAssets();
  // Hold the video element back until after first paint + window.load so
  // its network fetch never competes with the H1 (the LCP element).
  const [videoReady, setVideoReady] = useState(false);
  useEffect(() => {
    const start = () => {
      const idle =
        (window as Window & { requestIdleCallback?: typeof requestIdleCallback })
          .requestIdleCallback;
      if (idle) idle(() => setVideoReady(true), { timeout: 1500 });
      else window.setTimeout(() => setVideoReady(true), 300);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, []);

  // Magnetic CTA — Linear-style pull on fine pointers, no-op on touch.
  useMagnetic(ctaRef, { strength: 0.22, radius: 100 });

  // Character reveal on the headline (GSAP SplitText) + cascade the sub + CTA.
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (!headlineRef.current) return;

      const { default: gsap } = await import("gsap");
      const { SplitText } = await import("gsap/SplitText");
      if (cancelled || !headlineRef.current) return;
      gsap.registerPlugin(SplitText);

      const split = new SplitText(headlineRef.current, {
        type: "chars,words",
        wordsClass: "inline-block",
      });
      // Subtle slide + fade per char. Short enough that the H1 is fully
      // settled before LCP measurement closes — and the chars stay
      // measurable-ish (opacity rises) the whole time.
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from(split.chars, {
        y: 14,
        opacity: 0,
        duration: 0.55,
        stagger: 0.03, // 30ms per spec
      })
        .from(subRef.current, { opacity: 0, y: 14, duration: 0.5 }, "-=0.3")
        .from(ctaWrapRef.current, { opacity: 0, y: 14, duration: 0.5 }, "-=0.4");

      cleanup = () => {
        tl.kill();
        split.revert();
      };
    })();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  // Dim the backdrop as the user scrolls past 50% of the viewport. The
  // footage stays grayscale throughout — the editorial brief is B&W with the
  // single accent orange handling all the colour work.
  useEffect(() => {
    const el = backdropRef.current;
    if (!el) return;

    let raf = 0;
    const update = () => {
      const half = window.innerHeight * 0.5;
      const full = window.innerHeight;
      const progress = Math.min(
        1,
        Math.max(0, (window.scrollY - half) / (full - half)),
      );
      const brightness = 1 - progress * 0.4; // 1 → 0.6
      el.style.filter = `grayscale(1) brightness(${brightness.toFixed(2)})`;
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate flex min-h-svh flex-col justify-end overflow-hidden bg-vyrek-base pb-[max(4rem,calc(var(--safe-bottom)+3rem))] pt-[max(6rem,calc(var(--safe-top)+5rem))]"
    >
      {/* Backdrop: poster as the fallback frame, looping Pexels footage on
          top when the connection isn't metered. Grayscale + scroll-driven
          dim is applied to this wrapper via inline style. */}
      <div
        ref={backdropRef}
        aria-hidden
        className="absolute inset-0 -z-10 will-change-[filter]"
        style={{ filter: "grayscale(1) brightness(1)" }}
      >
        <img
          src="/hero-poster.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        {shouldServeVideo && videoReady && (
          <video
            src={HERO_VIDEO.src}
            poster={HERO_VIDEO.poster}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {/* Dim overlay to keep type legible regardless of clip */}
        <div className="absolute inset-0 bg-gradient-to-b from-vyrek-base/55 via-vyrek-base/30 to-vyrek-base/90" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">
        <h1
          id="hero-heading"
          ref={headlineRef}
          className="font-display max-w-[12ch] text-5xl font-bold uppercase leading-[0.92] tracking-[-0.02em] text-vyrek-text md:text-6xl lg:text-7xl"
        >
          Train like a Hyrox athlete.
        </h1>
        <p
          ref={subRef}
          className="mt-5 max-w-md text-base leading-relaxed text-vyrek-text-secondary md:max-w-xl md:text-lg"
        >
          Personalised programmes for the world&apos;s fastest growing sport.
          See your Week 1 before you pay.
        </p>
        <div ref={ctaWrapRef} className="mt-7">
          <Link
            ref={ctaRef}
            href="/quiz"
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-pill bg-vyrek-accent px-6 text-base font-semibold uppercase tracking-wide text-[#0A0A0A] transition-[background,opacity] duration-fast ease-out hover:bg-vyrek-accent-hover active:scale-[0.98] will-change-transform sm:w-auto sm:min-w-[14rem]"
          >
            Find your plan →
          </Link>
        </div>
      </div>
    </section>
  );
}
