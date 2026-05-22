"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useShouldServeHeavyAssets } from "@/hooks/use-network-information";

/**
 * Autoplaying, muted, looping `<video>` that only mounts when in viewport.
 * Renders the poster image immediately so layout doesn't shift; the video
 * element itself is only added to the DOM (and thus only triggers a network
 * fetch) once IntersectionObserver fires. Pauses when scrolled away.
 *
 * Drops to poster-only on metered / 2g connections.
 */
export function LoopingVideo({
  src,
  poster,
  grayscale = true,
  className,
  videoClassName,
}: {
  src: string;
  poster?: string;
  grayscale?: boolean;
  className?: string;
  videoClassName?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const serveHeavy = useShouldServeHeavyAssets();
  const [mountVideo, setMountVideo] = useState(false);
  const [inView, setInView] = useState(false);

  // Watch the wrapper for viewport intersection
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (!serveHeavy) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        setInView(visible);
        if (visible) setMountVideo(true); // sticky once mounted
      },
      { threshold: 0.1, rootMargin: "0px 0px 0px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [serveHeavy]);

  // Play / pause based on whether it's currently in view
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (inView) {
      void v.play().catch(() => undefined);
    } else {
      v.pause();
    }
  }, [inView, mountVideo]);

  return (
    <div ref={wrapRef} className={cn("relative overflow-hidden", className)}>
      {poster && (
        <img
          src={poster}
          alt=""
          aria-hidden
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            grayscale && "grayscale",
          )}
          loading="lazy"
          decoding="async"
        />
      )}
      {serveHeavy && mountVideo && (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          aria-hidden
          tabIndex={-1}
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            grayscale && "grayscale",
            videoClassName,
          )}
        />
      )}
    </div>
  );
}
