"use client";

import { useEffect, useRef } from "react";

/**
 * ONE BURST, THE MOMENT THEY ARE IN.
 *
 * ⚠️ THIS REVERSES A DECISION RECORDED IN welcome.tsx. That file used to say,
 * in as many words, "NOT A CONFETTI CANNON — the brand is a coach who writes
 * training plans at six in the morning, not a consumer app celebrating a
 * streak." Kieron asked for it on 6 September 2026, so it is here; the note
 * survives as the reason it is restrained rather than the reason it is
 * absent. Two seconds, brand colours only, and it never comes back.
 *
 * ── WHY CANVAS, AND WHY NOT A LIBRARY ────────────────────────────────────
 * Ninety pieces animating for two seconds is about forty lines of physics.
 * canvas-confetti is 12KB and arrives over the network at the exact moment a
 * person who has just paid is waiting to see something — and if the CDN is
 * slow, the celebration lands after they have already read the page. This
 * draws on the first frame with nothing to fetch.
 *
 * ── IT NEVER GETS IN THE WAY ─────────────────────────────────────────────
 * `pointer-events: none`, so nothing underneath becomes unclickable — the
 * commonest way an overlay like this breaks a page is by swallowing the tap
 * on the button beneath it. It is `aria-hidden`, because "decorative" is
 * exactly what it is. It removes its own canvas when it finishes, so nothing
 * is left compositing for the rest of the session. And under
 * `prefers-reduced-motion` it renders nothing at all: for somebody with a
 * vestibular disorder a screenful of moving particles is not a celebration.
 */

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vrot: number;
  colour: string;
  /** Squash across the short axis, so pieces read as tumbling paper. */
  phase: number;
  spin: number;
};

/* The brand, and nothing else. A rainbow here would be the first thing on the
   page that did not look like Suth. */
const COLOURS = ["#A3E635", "#BEF264", "#F5F5F3", "#84CC16", "#D9F99D"];

export function Confetti({
  /** Roughly two seconds of fall, then it is gone. */
  durationMs = 2600,
  /**
   * Pieces on a phone. A laptop gets proportionally more.
   *
   * A fixed count is the mistake here: ninety pieces fill a 393-wide phone
   * and vanish into a 1440-wide laptop, which has four times the area. Seen
   * side by side, the desktop version read as a few stray flecks rather than
   * a burst. Scaled by the square root of the area so the density holds.
   */
  pieces = 90,
}: {
  durationMs?: number;
  pieces?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    // Asked once, at the moment it would start. Somebody who has asked their
    // system for less motion gets none of this.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const el = canvas;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;
    const size = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      el.width = Math.floor(width * dpr);
      el.height = Math.floor(height * dpr);
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener("resize", size);

    /* Two low corner bursts rather than one from the top. Falling from above
       reads as a screen effect; thrown up from the sides reads as something
       that happened. */
    const GRAVITY = 0.42;
    const PHONE_AREA = 393 * 852;
    const density = Math.sqrt((width * height) / PHONE_AREA);
    const count = Math.round(Math.min(210, Math.max(60, pieces * density)));

    /* Aimed at the screen rather than at a number of pixels. The upward
       velocity that reaches halfway up is sqrt(g × height), and the sideways
       one is whatever crosses most of the width in the same flight — so the
       arc looks the same on a phone and on a laptop instead of filling one
       and disappearing into the other. */
    const lift = Math.sqrt(GRAVITY * height);
    const flightFrames = (2 * lift) / GRAVITY;
    const reach = (width * 0.8) / flightFrames;

    const items: Piece[] = [];
    for (let i = 0; i < count; i++) {
      const left = i % 2 === 0;
      items.push({
        x: left ? -10 : width + 10,
        y: height * (0.74 + Math.random() * 0.18),
        vx: (left ? 1 : -1) * reach * (0.55 + Math.random() * 1.15),
        vy: -lift * (0.7 + Math.random() * 0.5),
        size: 5 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.34,
        colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
        phase: Math.random() * Math.PI * 2,
        spin: 0.1 + Math.random() * 0.14,
      });
    }

    const started = performance.now();
    let frame = 0;

    function draw(now: number) {
      const elapsed = now - started;
      // The last third fades rather than stopping dead.
      const fade = elapsed > durationMs * 0.66
        ? Math.max(0, 1 - (elapsed - durationMs * 0.66) / (durationMs * 0.34))
        : 1;
      ctx!.clearRect(0, 0, width, height);

      for (const p of items) {
        p.vy += GRAVITY;
        p.vx *= 0.992;         // air
        p.vy *= 0.995;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        p.phase += p.spin;

        if (p.y > height + 40) continue;

        ctx!.save();
        ctx!.globalAlpha = fade;
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);
        // Squashing the height as it spins is what makes a rectangle read as
        // a tumbling piece of paper rather than a sliding block of colour.
        ctx!.scale(1, Math.abs(Math.cos(p.phase)) * 0.85 + 0.15);
        ctx!.fillStyle = p.colour;
        ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62);
        ctx!.restore();
      }

      if (elapsed < durationMs) {
        frame = requestAnimationFrame(draw);
      } else {
        ctx!.clearRect(0, 0, width, height);
        // Nothing left compositing for the rest of the visit.
        el.style.display = "none";
      }
    }
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", size);
    };
  }, [durationMs, pieces]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        // Never swallows a tap on the buttons underneath it.
        pointerEvents: "none",
        zIndex: 40,
      }}
    />
  );
}
