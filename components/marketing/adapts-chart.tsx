"use client";

import * as motion from "motion/react-client";

const PATH = "M0,70 L25,62 L50,58 L75,48 L100,42 L125,32 L150,28 L175,18 L200,12";
const FILL_PATH =
  "M0,70 L25,62 L50,58 L75,48 L100,42 L125,32 L150,28 L175,18 L200,12 L200,80 L0,80 Z";

/**
 * Ascending performance chart for the "Adapts as you improve" bento card.
 * Draws the line + fades in the fill + dots when scrolled into view.
 */
export function AdaptsChart() {
  return (
    <svg viewBox="0 0 200 80" aria-hidden className="h-32 w-full md:h-40">
      <defs>
        <linearGradient id="adapt-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#FF5A1F" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FF5A1F" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={FILL_PATH}
        fill="url(#adapt-fill)"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        transition={{ delay: 0.55, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.path
        d={PATH}
        fill="none"
        stroke="#FF5A1F"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      />
      {[
        [25, 62, 0],
        [75, 48, 0.25],
        [125, 32, 0.5],
        [175, 18, 0.75],
      ].map(([x, y, delay]) => (
        <motion.circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r="2.5"
          fill="#FF5A1F"
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          transition={{
            delay: 0.7 + (delay as number) * 0.4,
            duration: 0.35,
            ease: "backOut",
          }}
        />
      ))}
    </svg>
  );
}
