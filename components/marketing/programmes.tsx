"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { RevealOnView } from "@/components/shared/reveal-on-view";
import { SplitHeading } from "@/components/shared/split-heading";
import { PROGRAMMES, type Programme } from "@/lib/programmes";

export function Programmes() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const cards = Array.from(
      scroller.querySelectorAll<HTMLElement>("[data-programme-card]"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const idx = cards.indexOf(entry.target as HTMLElement);
            if (idx !== -1) setActiveIdx(idx);
          }
        }
      },
      { root: scroller, threshold: [0.5, 0.75] },
    );
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <RevealOnView
      as="section"
      id="programmes"
      aria-labelledby="programmes-heading"
      className="border-t border-vyrek-border-subtle py-24 md:py-32"
    >
      <Container>
        <header className="mx-auto max-w-2xl text-center">
          <Eyebrow>Programmes</Eyebrow>
          <SplitHeading
            id="programmes-heading"
            className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
          >
            Find your programme
          </SplitHeading>
          <p className="mt-4 text-base text-vyrek-text-secondary md:text-lg">
            Hyrox is a one-hour fitness race: 8 stations, 8 one-kilometre
            runs. Pick the path that matches yours. Each is a 12-week build.
          </p>
        </header>

        {/* Mobile: horizontal snap carousel · Desktop: 2x2 grid */}
        <div className="mt-12 md:hidden">
          <div
            ref={scrollerRef}
            className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {PROGRAMMES.map((p) => (
              <ProgrammeCard key={p.slug} programme={p} variant="mobile" />
            ))}
          </div>
          <div
            className="mt-5 flex justify-center gap-2"
            role="tablist"
            aria-label="Programme carousel position"
          >
            {PROGRAMMES.map((p, i) => (
              <span
                key={p.slug}
                aria-hidden
                className={cn(
                  "h-1.5 rounded-pill transition-[width,background] duration-base",
                  i === activeIdx
                    ? "w-6 bg-vyrek-accent"
                    : "w-1.5 bg-vyrek-border-strong",
                )}
              />
            ))}
          </div>
        </div>

        <div className="mt-12 hidden grid-cols-2 gap-6 md:grid">
          {PROGRAMMES.map((p) => (
            <ProgrammeCard key={p.slug} programme={p} variant="desktop" />
          ))}
        </div>
      </Container>
    </RevealOnView>
  );
}

function ProgrammeCard({
  programme,
  variant,
}: {
  programme: Programme;
  variant: "mobile" | "desktop";
}) {
  return (
    <Link
      data-programme-card
      href={`/quiz?program=${programme.slug}`}
      className={cn(
        "group lift-on-hover shimmer relative isolate flex flex-col justify-between overflow-hidden rounded-lg border border-vyrek-border bg-vyrek-elevated p-6 active:scale-[0.99]",
        variant === "mobile" && "min-h-[300px] w-[78%] shrink-0 snap-center",
        variant === "desktop" && "aspect-[5/3]",
      )}
    >
      {/* B&W station imagery backdrop. next/image so Vercel serves
          viewport-sized WebP/AVIF instead of the raw 400-600 KB JPEG. */}
      <Image
        src={programme.image}
        alt=""
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 78vw"
        className="-z-20 grayscale object-cover transition-transform duration-slow ease-out group-hover:scale-[1.04]"
      />
      {/* Type legibility wash + accent tint that intensifies on hover */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-vyrek-base/95 via-vyrek-base/55 to-vyrek-base/25"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_85%_0%,rgba(163,230,53,0.20)_0%,rgba(20,20,20,0)_60%)] opacity-60 transition-opacity duration-base group-hover:opacity-100"
      />
      <div className="relative flex items-start justify-between gap-3">
        <Eyebrow className="whitespace-nowrap">{programme.tag}</Eyebrow>
        <span
          aria-hidden
          className="font-mono text-xs uppercase tracking-[0.18em] text-vyrek-text-tertiary transition-colors group-hover:text-vyrek-accent"
        >
          →
        </span>
      </div>
      <div className="relative mt-12 md:mt-0">
        <h3 className="font-display text-3xl font-bold uppercase leading-[0.95] tracking-[-0.01em] text-vyrek-text md:text-4xl">
          {programme.name}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-vyrek-text-secondary md:text-base">
          {programme.audience}
        </p>
      </div>
    </Link>
  );
}
