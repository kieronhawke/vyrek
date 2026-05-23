"use client";

import * as motion from "motion/react-client";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { RevealOnView } from "@/components/shared/reveal-on-view";
import { SplitHeading } from "@/components/shared/split-heading";

/**
 * Brief 2.9: "Adapt as you improve, log your sessions".
 *
 * Replaces the line-going-up chart with:
 *   - Mockup session card: Date, workout completed, split vs last week, RPE.
 *   - 12-week trajectory chart underneath with milestone dots that pop in.
 * Chart line draws over ~1.2s on scroll into view.
 */

// 12-week descending finish-time trajectory in fake minutes (lower is better).
// Designed so the line slopes down with a single milestone-spike at week 6
// (deload) and a peak-and-taper at week 11-12.
const TRAJECTORY = [
  { week: 1, t: 1.0 },
  { week: 2, t: 0.94 },
  { week: 3, t: 0.9 },
  { week: 4, t: 0.86 },
  { week: 5, t: 0.81 },
  { week: 6, t: 0.86 }, // deload
  { week: 7, t: 0.79 },
  { week: 8, t: 0.74 },
  { week: 9, t: 0.69 },
  { week: 10, t: 0.65 },
  { week: 11, t: 0.62 },
  { week: 12, t: 0.6 }, // taper / race-ready
];

const MILESTONES = new Set([6, 12]);

const W = 320; // svg width
const H = 100; // svg height
const PADX = 12;
const PADY = 14;

function buildPath() {
  const step = (W - PADX * 2) / (TRAJECTORY.length - 1);
  const yMin = PADY;
  const yMax = H - PADY;
  const pts = TRAJECTORY.map((p, i) => {
    const x = PADX + i * step;
    const y = yMin + (yMax - yMin) * (p.t - 0.55) / (1.0 - 0.55);
    return [x, y] as const;
  });
  const d = pts
    .map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`))
    .join(" ");
  return { pts, d };
}

export function AdaptAsYouImprove() {
  const { pts, d } = buildPath();

  return (
    <RevealOnView
      as="section"
      aria-labelledby="adapt-heading"
      className="border-t border-vyrek-border-subtle py-24 md:py-32"
    >
      <Container>
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
          {/* Visuals */}
          <div className="space-y-6">
            {/* Logged session card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -20% 0px" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-lg border border-vyrek-border bg-vyrek-elevated p-5 md:p-6"
            >
              <div className="flex items-baseline justify-between">
                <Eyebrow>Tue, 28 May, logged</Eyebrow>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-success">
                  COMPLETE
                </span>
              </div>
              <h3 className="mt-3 text-xl font-bold tracking-[-0.02em] text-vyrek-text">
                Hyrox hybrid: run + sled
              </h3>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                    Duration
                  </p>
                  <p className="mt-1 text-base font-semibold tabular-nums text-vyrek-text">
                    58 min
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                    Split vs week 3
                  </p>
                  <p className="mt-1 text-base font-semibold tabular-nums text-vyrek-accent">
                    -12 sec
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                    RPE
                  </p>
                  <p className="mt-1 text-base font-semibold tabular-nums text-vyrek-text">
                    7 / 10
                  </p>
                </div>
              </div>
            </motion.div>

            {/* 12-week trajectory chart */}
            <div className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5 md:p-6">
              <div className="flex items-baseline justify-between">
                <Eyebrow>12-week trajectory</Eyebrow>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                  RACE-READY WEEK 12
                </span>
              </div>
              <svg
                viewBox={`0 0 ${W} ${H}`}
                role="img"
                aria-label="Projected fitness trajectory across 12 weeks"
                className="mt-4 h-28 w-full"
              >
                {/* Axis baseline */}
                <line
                  x1={PADX}
                  y1={H - PADY}
                  x2={W - PADX}
                  y2={H - PADY}
                  stroke="currentColor"
                  className="text-vyrek-border-subtle"
                  strokeWidth="1"
                />
                {/* Animated path */}
                <motion.path
                  d={d}
                  fill="none"
                  stroke="currentColor"
                  className="text-vyrek-accent"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true, margin: "0px 0px -10% 0px" }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                />
                {/* Milestone dots */}
                {pts.map(([x, y], i) => {
                  const isMilestone = MILESTONES.has(TRAJECTORY[i].week);
                  return (
                    <motion.circle
                      key={i}
                      cx={x}
                      cy={y}
                      r={isMilestone ? 4.5 : 2.5}
                      className={
                        isMilestone
                          ? "fill-vyrek-accent"
                          : "fill-vyrek-text-tertiary"
                      }
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
                      transition={{
                        delay: 1.2 + i * 0.05,
                        duration: 0.35,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    />
                  );
                })}
              </svg>
              <p className="mt-2 text-xs text-vyrek-text-tertiary">
                Every session you log sharpens your plan.
              </p>
            </div>
          </div>

          {/* Copy */}
          <div>
            <Eyebrow>Adaptive</Eyebrow>
            <SplitHeading
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
            >
              Adapts as you improve.
            </SplitHeading>
            <p className="mt-5 max-w-md text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
              Log your splits, your sled times, your wall-ball cycles. Every
              Sunday we recalibrate based on what you actually did. The plan
              is never the same plan twice.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-vyrek-text-secondary">
              <li className="flex gap-3">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-vyrek-accent" />
                <span>Strong week. Next week pushes harder.</span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-vyrek-accent" />
                <span>Missed sessions. Plan rebuilds with more recovery.</span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-vyrek-accent" />
                <span>Race date moves. The 12 weeks rebuild around it.</span>
              </li>
            </ul>
          </div>
        </div>
      </Container>
    </RevealOnView>
  );
}
