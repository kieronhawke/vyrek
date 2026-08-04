"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Confetti for a new lead, fireworks and a ka-ching for a new paying client.
 *
 * Written by hand on a canvas rather than pulled from a library. The whole
 * thing is about 4 KB and needs no dependency, and the two effects want
 * different physics anyway: confetti is paper falling, fireworks are shells
 * bursting. A generic particle library does one of those convincingly.
 *
 * THREE THINGS IT REFUSES TO DO
 *
 * 1. Run when the operator has asked for less motion. prefers-reduced-motion
 *    exists because this kind of thing makes some people ill, and an Easter
 *    egg is not worth that. Those users get the toast and no animation.
 * 2. Play sound without a prior interaction. Browsers block it, and correctly:
 *    a page that makes noise on load is a page you close. The ka-ching plays
 *    on a click-driven celebration and stays silent on a page-load one.
 * 3. Block anything. The canvas is fixed, pointer-events: none, removed when
 *    the run finishes.
 */

type Level = "lead" | "client";

const COLOURS = ["#c3f53c", "#8ed81f", "#ffffff", "#9aa0a6", "#f5d33c"];

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * "Ka-ching", synthesised. Two bright bell partials and a short noise burst
 * for the drawer. A real sample would be a network request and a licence
 * question for four notes.
 */
function kaChing(): void {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    // Suspended means no interaction has unlocked audio yet. Give up quietly.
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);

    // Two chimes, a rising fifth, which is what a till sounds like.
    for (const [freq, at] of [
      [1318.5, 0],
      [1975.5, 0.09],
    ] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.9, now + at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.55);
      osc.connect(gain).connect(master);
      osc.start(now + at);
      osc.stop(now + at + 0.6);
    }

    // The drawer: filtered noise, very short.
    const len = Math.floor(ctx.sampleRate * 0.08);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2400;
    const ng = ctx.createGain();
    ng.gain.value = 0.35;
    noise.connect(bp).connect(ng).connect(master);
    noise.start(now + 0.02);

    setTimeout(() => void ctx.close().catch(() => {}), 1200);
  } catch {
    // Audio is a garnish. Never let it break the celebration.
  }
}

type Particle = {
  x: number; y: number; vx: number; vy: number;
  size: number; colour: string; rot: number; vr: number; life: number;
};

function run(canvas: HTMLCanvasElement, level: Level, done: () => void): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) { done(); return () => {}; }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.scale(dpr, dpr);

  const parts: Particle[] = [];

  const confettiPiece = (x: number, y: number, spread: number, up: number): Particle => ({
    x, y,
    vx: (Math.random() - 0.5) * spread,
    vy: -Math.random() * up - 2,
    size: 5 + Math.random() * 6,
    colour: COLOURS[(Math.random() * COLOURS.length) | 0],
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    life: 1,
  });

  if (level === "lead") {
    // Falls from the top edge, across the width. A new lead is good news,
    // not a jackpot.
    for (let i = 0; i < 140; i++) {
      const p = confettiPiece(Math.random() * w, -20 - Math.random() * h * 0.3, 3, 0);
      p.vy = 1 + Math.random() * 3;
      parts.push(p);
    }
  } else {
    // Fireworks: three bursts, staggered, plus a rain of money-green.
    const bursts = [
      { x: w * 0.25, y: h * 0.35, at: 0 },
      { x: w * 0.72, y: h * 0.28, at: 22 },
      { x: w * 0.5, y: h * 0.48, at: 44 },
    ];
    bursts.forEach((b) => {
      for (let i = 0; i < 90; i++) {
        const a = (Math.PI * 2 * i) / 90 + Math.random() * 0.2;
        const speed = 3 + Math.random() * 6;
        parts.push({
          x: b.x, y: b.y,
          vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          size: 3 + Math.random() * 4,
          colour: COLOURS[(Math.random() * COLOURS.length) | 0],
          rot: 0, vr: 0,
          life: 1 + b.at / 60,
        });
      }
    });
    for (let i = 0; i < 90; i++) parts.push(confettiPiece(Math.random() * w, -20, 2, 0));
  }

  let raf = 0;
  let frame = 0;
  const maxFrames = level === "lead" ? 190 : 260;

  const tick = () => {
    frame++;
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.vy += 0.11;          // gravity
      p.vx *= 0.995;         // drag
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      const fade = Math.max(0, 1 - frame / maxFrames);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.colour;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    if (frame < maxFrames) raf = requestAnimationFrame(tick);
    else done();
  };
  raf = requestAnimationFrame(tick);

  return () => cancelAnimationFrame(raf);
}

/**
 * Imperative handle. `celebrate("client")` from anywhere that has it.
 */
export function useCelebration() {
  const holder = useRef<HTMLCanvasElement | null>(null);
  const stop = useRef<(() => void) | null>(null);

  const celebrate = useCallback((level: Level, opts?: { sound?: boolean }) => {
    if (prefersReducedMotion()) return;
    const canvas = holder.current;
    if (!canvas) return;
    stop.current?.();
    canvas.style.display = "block";
    if (level === "client" && opts?.sound !== false) kaChing();
    stop.current = run(canvas, level, () => {
      canvas.style.display = "none";
    });
  }, []);

  const Canvas = useCallback(
    () => (
      <canvas
        ref={holder}
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          pointerEvents: "none",
          display: "none",
        }}
      />
    ),
    [],
  );

  useEffect(() => () => stop.current?.(), []);

  return { celebrate, Canvas };
}
