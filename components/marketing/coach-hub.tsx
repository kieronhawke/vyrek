"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { RevealOnView } from "@/components/shared/reveal-on-view";
import { SplitHeading } from "@/components/shared/split-heading";
import { LoopingVideo } from "@/components/shared/looping-video";
import { cn } from "@/lib/utils";
import { COACHES, type Coach } from "@/lib/coaches";

export function CoachHub() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <RevealOnView
      as="section"
      aria-labelledby="coaches-heading"
      className="border-t border-vyrek-border-subtle py-24 md:py-32"
    >
      <Container>
        <header className="mx-auto max-w-2xl text-center">
          <Eyebrow>Coaches</Eyebrow>
          <SplitHeading
            id="coaches-heading"
            className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
          >
            Built by Elite 15 athletes
          </SplitHeading>
        </header>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COACHES.map((coach) => (
            <CoachTile
              key={coach.slug}
              coach={coach}
              open={open === coach.slug}
              onOpenChange={(v) => setOpen(v ? coach.slug : null)}
            />
          ))}
        </div>
      </Container>
    </RevealOnView>
  );
}

function CoachTile({
  coach,
  open,
  onOpenChange,
}: {
  coach: Coach;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Initials are surfaced large as a brand element behind the bio.
  const initials = coach.name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  // Brief 2.7: "Joining 2026" placeholders are silhouette portraits, not
  // interactive sheets (they don't have a real person to reveal).
  if (coach.role === "JOINING 2026") {
    return (
      <div
        className="relative isolate flex aspect-[5/4] flex-col justify-between overflow-hidden rounded-lg border border-dashed border-vyrek-border bg-vyrek-elevated/40 p-6 sm:aspect-[4/5]"
        aria-label={`Coach placeholder, ${coach.role.toLowerCase()}`}
      >
        {/* Silhouette portrait: gradient + circle for head + trapezoid shoulders */}
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-vyrek-overlay via-vyrek-elevated to-vyrek-base" />
          <svg
            viewBox="0 0 200 240"
            className="absolute inset-x-0 bottom-0 mx-auto h-3/4 w-3/4 text-vyrek-text/15"
            fill="currentColor"
            aria-hidden
          >
            <circle cx="100" cy="80" r="40" />
            <path d="M 30 240 Q 30 150 100 150 Q 170 150 170 240 Z" />
          </svg>
        </div>
        <Eyebrow className="relative z-10 !text-vyrek-accent">
          {coach.role}
        </Eyebrow>
        <div className="relative z-10">
          <h3 className="text-2xl font-black tracking-[-0.04em] text-vyrek-text-tertiary">
            {coach.name}
          </h3>
          {coach.bio ? (
            <p className="mt-3 text-sm leading-relaxed text-vyrek-text-secondary">
              {coach.bio}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger
        render={
          <button
            type="button"
            className={cn(
              "group lift-on-hover shimmer relative isolate flex aspect-[5/4] flex-col justify-between overflow-hidden rounded-lg border border-vyrek-border bg-vyrek-elevated p-6 text-left active:scale-[0.99] sm:aspect-[4/5]",
            )}
          />
        }
      >
        {coach.video ? (
          <LoopingVideo
            src={coach.video.src}
            poster={coach.video.poster}
            className="absolute inset-0"
          />
        ) : (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-[140px] font-black leading-none tracking-[-0.08em] text-vyrek-text/[0.08] sm:text-[200px]"
          >
            {initials}
          </span>
        )}
        {/* Type legibility wash + accent tint */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-vyrek-base/95 via-vyrek-base/45 to-vyrek-base/20"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_0%,rgba(255,90,31,0.18)_0%,rgba(20,20,20,0)_60%)]"
        />
        <Eyebrow className="relative z-10">{coach.role}</Eyebrow>
        <div className="relative z-10">
          <h3 className="text-3xl font-black tracking-[-0.04em] text-vyrek-text">
            {coach.name}
          </h3>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {coach.credentials.slice(0, 2).map((cred) => (
              <Eyebrow key={cred} className="!text-vyrek-text-secondary">
                {cred}
              </Eyebrow>
            ))}
          </div>
        </div>
      </SheetTrigger>
      <SheetContent side="bottom" className="bg-vyrek-elevated">
        <SheetHeader>
          <Eyebrow>{coach.role}</Eyebrow>
          <SheetTitle className="text-2xl font-black tracking-[-0.04em] md:text-3xl">
            {coach.name}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Coach details for {coach.name}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6 md:px-6">
          <div className="flex flex-wrap gap-1.5">
            {coach.credentials.map((cred) => (
              <Eyebrow key={cred} className="!text-vyrek-text-secondary">
                {cred}
              </Eyebrow>
            ))}
          </div>
          {coach.bio && (
            <p className="text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
              {coach.bio}
            </p>
          )}
          {coach.socials && (
            <div className="flex gap-4 text-sm">
              {coach.socials.instagram && (
                <a
                  href={coach.socials.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="text-vyrek-text underline-offset-4 hover:underline"
                >
                  Instagram ↗
                </a>
              )}
              {coach.socials.tiktok && (
                <a
                  href={coach.socials.tiktok}
                  target="_blank"
                  rel="noreferrer"
                  className="text-vyrek-text underline-offset-4 hover:underline"
                >
                  TikTok ↗
                </a>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

