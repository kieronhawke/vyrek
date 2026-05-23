"use client";

import * as motion from "motion/react-client";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { RevealOnView } from "@/components/shared/reveal-on-view";
import { SplitHeading } from "@/components/shared/split-heading";

/**
 * Brief 2.8: "Dated weekly plan built around your life".
 *
 * Replaces the static bar chart with an animated phone mockup showing a
 * weekly grid. Each workout shimmers in on scroll (GSAP-free, Motion-based
 * stagger; lighter weight than GSAP). "Today" pulses subtly. Date labels
 * animate from blurred to sharp. Respects prefers-reduced-motion.
 */

type Workout = {
  day: string;
  date: string;
  title: string;
  duration: string;
  isToday?: boolean;
  isRest?: boolean;
};

const SAMPLE_WEEK: Workout[] = [
  { day: "Mon", date: "27 May", title: "Easy aerobic run", duration: "45 min" },
  {
    day: "Tue",
    date: "28 May",
    title: "Hyrox hybrid: run + sled",
    duration: "60 min",
    isToday: true,
  },
  { day: "Wed", date: "29 May", title: "Strength A", duration: "45 min" },
  {
    day: "Thu",
    date: "30 May",
    title: "Active recovery",
    duration: "30 min",
  },
  { day: "Fri", date: "31 May", title: "Threshold intervals", duration: "50 min" },
  { day: "Sat", date: "01 Jun", title: "Race simulation", duration: "90 min" },
  { day: "Sun", date: "02 Jun", title: "Rest", duration: "0 min", isRest: true },
];

export function DatedWeeklyPlan() {
  return (
    <RevealOnView
      as="section"
      aria-labelledby="dated-week-heading"
      className="border-t border-vyrek-border-subtle py-24 md:py-32"
    >
      <Container>
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
          {/* Copy */}
          <div>
            <Eyebrow>Your week</Eyebrow>
            <SplitHeading
              id="dated-week-heading"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
            >
              A dated weekly plan, built around your life.
            </SplitHeading>
            <p className="mt-5 max-w-md text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
              Every Sunday your next seven days appear. Hyrox-specific
              sessions, your equipment, your time. Open the app, see today,
              hit it, log it.
            </p>
          </div>

          {/* Phone mockup */}
          <div className="mx-auto w-full max-w-[320px]">
            <div className="relative aspect-[9/19] overflow-hidden rounded-[44px] border border-vyrek-border-strong bg-vyrek-elevated shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
              {/* Notch */}
              <div className="absolute left-1/2 top-2.5 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />

              <div className="flex h-full flex-col gap-3 px-5 pb-5 pt-12">
                <div className="flex items-baseline justify-between">
                  <Eyebrow bare>WEEK 4</Eyebrow>
                  <Eyebrow bare>27 MAY, 02 JUN</Eyebrow>
                </div>
                <h3 className="text-2xl font-black tracking-[-0.04em] text-vyrek-text">
                  Your week
                </h3>

                <ul className="flex-1 space-y-2 overflow-hidden">
                  {SAMPLE_WEEK.map((w, i) => (
                    <motion.li
                      key={w.day}
                      initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
                      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      viewport={{ once: true, margin: "0px 0px -25% 0px" }}
                      transition={{
                        delay: 0.1 + i * 0.1,
                        duration: 0.5,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className={`relative rounded-md border bg-vyrek-overlay px-3 py-2.5 ${
                        w.isToday
                          ? "border-vyrek-accent/60 bg-vyrek-accent/[0.06]"
                          : "border-vyrek-border-subtle"
                      }`}
                    >
                      <div className="flex items-baseline justify-between text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                        <span className="tabular-nums">
                          {w.day}, {w.date}
                        </span>
                        <span className="tabular-nums">{w.duration}</span>
                      </div>
                      <p
                        className={`mt-1.5 text-sm font-medium ${
                          w.isRest
                            ? "text-vyrek-text-tertiary"
                            : "text-vyrek-text"
                        }`}
                      >
                        {w.title}
                      </p>
                      {w.isToday ? (
                        <motion.span
                          aria-hidden
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 2.4,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-vyrek-accent"
                        />
                      ) : null}
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </RevealOnView>
  );
}
