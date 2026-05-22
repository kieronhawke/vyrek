"use client";

import * as motion from "motion/react-client";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { CtaButton } from "@/components/shared/cta-button";
import { RevealOnView } from "@/components/shared/reveal-on-view";
import { SplitHeading } from "@/components/shared/split-heading";

type PreviewDay = {
  day: string;
  date: string;
  duration: string;
  intensity: string;
};

// Static preview content — Phase G replaces with a tour through real Week 1
// data generated from the user's quiz answers.
const PREVIEW: PreviewDay[] = [
  { day: "Mon", date: "21 May", duration: "45 min", intensity: "Z2" },
  { day: "Tue", date: "22 May", duration: "60 min", intensity: "Race-pace" },
  { day: "Wed", date: "23 May", duration: "60 min", intensity: "Strength" },
  { day: "Thu", date: "24 May", duration: "45 min", intensity: "Threshold" },
  { day: "Fri", date: "25 May", duration: "30 min", intensity: "Recovery" },
  { day: "Sat", date: "26 May", duration: "90 min", intensity: "Race sim" },
  { day: "Sun", date: "27 May", duration: "—", intensity: "Rest" },
];

const STEPS = [
  { label: "01", text: "Take the three-minute quiz" },
  { label: "02", text: "See your real Week 1 — every workout, every day" },
  { label: "03", text: "Start your trial. First week free." },
];

export function PlanTeaser() {
  return (
    <RevealOnView
      as="section"
      id="plan-teaser"
      aria-labelledby="plan-teaser-heading"
      className="border-t border-vyrek-border-subtle py-24 md:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Plan reveal</Eyebrow>
          <SplitHeading
            id="plan-teaser-heading"
            className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
          >
            See your plan in three minutes
          </SplitHeading>
        </div>

        <div className="mt-16 flex flex-col items-center gap-16 lg:flex-row lg:items-start lg:justify-between lg:gap-24">
          {/* Phone mockup */}
          <PhoneMockup days={PREVIEW} />

          {/* Steps */}
          <div className="flex w-full max-w-md flex-col gap-8 lg:max-w-sm">
            <ol className="space-y-6">
              {STEPS.map((step, i) => (
                <motion.li
                  key={step.label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "0px 0px -15% 0px" }}
                  transition={{
                    delay: i * 0.08,
                    duration: 0.5,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="flex gap-5"
                >
                  <Eyebrow className="shrink-0 pt-1">{step.label}</Eyebrow>
                  <p className="text-base leading-relaxed text-vyrek-text md:text-lg">
                    {step.text}
                  </p>
                </motion.li>
              ))}
            </ol>
            <div className="pt-2">
              <CtaButton href="/quiz" size="md">
                Find your plan →
              </CtaButton>
            </div>
          </div>
        </div>
      </Container>
    </RevealOnView>
  );
}

function PhoneMockup({ days }: { days: PreviewDay[] }) {
  return (
    <div
      className="relative w-full max-w-[300px] shrink-0"
      aria-hidden /* decorative — content is summarised in step list */
    >
      <div className="relative aspect-[9/19] overflow-hidden rounded-[44px] border border-vyrek-border-strong bg-vyrek-elevated shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
        {/* Notch */}
        <div className="absolute left-1/2 top-2.5 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />

        <div className="flex h-full flex-col px-5 pb-5 pt-12">
          <div className="flex items-center justify-between">
            <Eyebrow bare>FIRST RACE · WEEK 1</Eyebrow>
            <Eyebrow bare>4/7</Eyebrow>
          </div>
          <h3 className="mt-3 text-xl font-black tracking-[-0.04em] text-vyrek-text">
            Your week
          </h3>

          <ul className="mt-4 flex-1 space-y-2 overflow-hidden">
            {days.map((d, i) => (
              <motion.li
                key={d.day}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "0px 0px -30% 0px" }}
                transition={{
                  delay: 0.15 + i * 0.08,
                  duration: 0.45,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="rounded-md border border-vyrek-border-subtle bg-vyrek-overlay px-3 py-2"
              >
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                  <span>
                    {d.day} · {d.date}
                  </span>
                  <span>{d.duration}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  {/* Blurred workout name placeholder */}
                  <div className="h-2 flex-1 rounded-pill bg-vyrek-border-strong/70" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-vyrek-text-secondary">
                    {d.intensity}
                  </span>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
