"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * "What you unlock" — 5-item value list above the paywall.
 *
 * Style (per spec):
 *   [ NN ] marker  chartreuse, Geist Mono, weight 500
 *   Title          off-white, Geist, weight 700, ALL CAPS, tracking 0.04em
 *   Body           off-white at 75% opacity, Geist regular weight 400
 *
 * Items fade up with a 12px Y offset, staggered 80ms.
 * PRIVATE COACH CALL sits at #02 (top-2-3 per spec) as the headline USP.
 */

type Item = { number: string; title: string; body: string };

const ITEMS: Item[] = [
  {
    number: "01",
    title: "12 WEEKS, DATED TO YOUR RACE",
    body: "Every session scheduled. Open the app, see today's workout, log it. No guesswork between now and the start line.",
  },
  {
    number: "02",
    title: "PRIVATE COACH CALL",
    body: "30-minute 1-on-1 with an Elite 15 coach in your first week. Goals, kit, schedule, recovery: answered by a person, not a chatbot.",
  },
  {
    number: "03",
    title: "ADAPTIVE SUNDAY REBUILDS",
    body: "Your plan recalibrates every Sunday from what you actually logged. Strong week pushes harder. Missed sessions reshape the next block.",
  },
  {
    number: "04",
    title: "HYROX-SPECIFIC STATION WORK",
    body: "Built backwards from the 8 stations + 8 km of running. Sled push, sled pull, wall ball, sandbag lunges. Every block has a purpose.",
  },
  {
    number: "05",
    title: "PROGRESS YOU CAN SEE",
    body: "Splits, sled times, wall-ball cycles tracked across every week. The data drives the next plan, and you can watch yourself improve.",
  },
];

export function PlanValueSection() {
  const rootRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={rootRef}
      aria-labelledby="plan-value-heading"
      className="mt-10"
    >
      <h2
        id="plan-value-heading"
        className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary"
      >
        [ WHAT YOU UNLOCK ]
      </h2>

      {/* James Wright coach card. Sits above the 5-item list so the
          PRIVATE COACH CALL item has a real face attached to it — was
          missing per user "James Wright image disappeared" feedback. */}
      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-vyrek-accent/30 bg-vyrek-elevated p-4">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-vyrek-overlay">
          <Image
            src="/media/images/v2/coach-james-wright-warm.jpg"
            alt="James Wright, founding coach"
            fill
            sizes="64px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-accent">
            [ YOUR COACH ]
          </p>
          <p className="mt-1 text-sm font-bold text-vyrek-text">
            James Wright
          </p>
          <p className="mt-0.5 text-xs text-vyrek-text-secondary">
            Elite 15 athlete · Top 50 World Championships finisher
          </p>
        </div>
      </div>

      <ol role="list" className="mt-6 space-y-7">
        {ITEMS.map((item, i) => (
          <li
            key={item.number}
            className="will-change-[opacity,transform]"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(12px)",
              transition:
                "opacity 480ms cubic-bezier(0.16,1,0.3,1), transform 480ms cubic-bezier(0.16,1,0.3,1)",
              transitionDelay: visible ? `${i * 80}ms` : "0ms",
            }}
          >
            <div className="flex items-baseline gap-3">
              <span
                aria-hidden
                className="font-mono text-sm font-medium text-vyrek-accent"
              >
                [ {item.number} ]
              </span>
              <h3 className="text-base font-bold uppercase tracking-[0.04em] text-vyrek-text md:text-lg">
                {item.title}
              </h3>
            </div>
            <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-vyrek-text/75 md:text-base">
              {item.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
