"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMagnetic } from "@/hooks/use-magnetic";
import { useShouldServeHeavyAssets } from "@/hooks/use-network-information";
import { VIDEOS } from "@/lib/video-assets";

const HERO_VIDEO = VIDEOS.manBattleRopes;

export function Hero() {
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const shouldServeHeavy = useShouldServeHeavyAssets();
  // Two gates on the autoplay video:
  //   1. `videoReady` — held back until after window.load + idle, so the
  //      video network fetch never competes with the H1 (the LCP element).
  //   2. `wideScreen` — only serve the video on >=768px. On mobile the
  //      late-arriving first frame would become the new LCP candidate and
  //      drag the metric to ~3.5s. Mobile users see just the poster.
  const [videoReady, setVideoReady] = useState(false);
  const [wideScreen, setWideScreen] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setWideScreen(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
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
  const shouldServeVideo = shouldServeHeavy && wideScreen;

  // Magnetic CTA — Linear-style pull on fine pointers, no-op on touch.
  useMagnetic(ctaRef, { strength: 0.22, radius: 100 });

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
        {/* hero-poster.jpg was a near-black video still — useless on mobile
            where the autoplay video is gated off. Use the coach-portrait
            shot instead; it's the same person the desktop video shows. */}
        <img
          src="/media/images/coach-james-wright.jpg"
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
        {/* H1 deliberately *not* animated — it's the LCP element. Animating
            it in (via opacity 0 → 1) delays Chrome's LCP timing. The sub +
            CTA below carry the premium-feel motion instead. */}
        <h1
          id="hero-heading"
          className="font-display max-w-[14ch] text-[2.6rem] font-bold uppercase leading-[0.92] tracking-[-0.02em] text-vyrek-text sm:text-5xl md:text-6xl lg:text-7xl"
        >
          Train like a Hyrox athlete.
        </h1>
        <p className="hero-intro mt-5 max-w-md text-base leading-relaxed text-vyrek-text-secondary md:max-w-xl md:text-lg">
          From first-timers to sub-60 athletes — one personalised plan for
          the world&apos;s fastest growing sport. See your Week 1 before you pay.
        </p>
        <div className="hero-intro hero-intro-late mt-7">
          <Link
            ref={ctaRef}
            href="/quiz"
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-pill bg-vyrek-accent px-6 text-base font-semibold uppercase tracking-wide text-[#0A0A0A] transition-[background,opacity] duration-fast ease-out hover:bg-vyrek-accent-hover active:scale-[0.98] will-change-transform sm:w-auto sm:min-w-[14rem]"
          >
            Find your plan →
          </Link>
        </div>
        {/* Trust pill — kept under the CTA per Runna / Whoop. Honest claims
            only: programming credentials + price + cancellation. */}
        <div className="hero-intro hero-intro-late mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-vyrek-text-secondary md:text-sm">
          <span className="inline-flex items-center gap-1.5">
            <span aria-label="5 out of 5 stars" className="text-vyrek-accent">
              ★★★★★
            </span>
            <span>Built by Elite 15 coaches</span>
          </span>
          <span aria-hidden className="text-vyrek-text-tertiary">·</span>
          <span>£4.99/mo</span>
          <span aria-hidden className="text-vyrek-text-tertiary">·</span>
          <span>Cancel anytime</span>
        </div>
      </div>

      <style jsx>{`
        .hero-intro {
          animation: hero-fade-up 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 80ms;
        }
        .hero-intro-late {
          animation-delay: 200ms;
        }
        @keyframes hero-fade-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-intro {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
