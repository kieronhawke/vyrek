"use client";

import { useEffect, useState } from "react";
import { Share2, Check, Link2, Download, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { formatTime, formatOrdinal } from "@/lib/results/format";

/**
 * Share sheet.
 *
 * The reference site has no share affordance at all, which means a PB — the
 * most shareable moment in the sport — dead-ends on their page. This does
 * three things theirs does not:
 *
 * 1. **Shows the card before you send it.** The branded image is generated
 *    server-side and previewed here, so you know exactly what will appear.
 * 2. **Downloads the image.** Instagram and WhatsApp statuses want a file, not
 *    a link with an OG tag. This is the share that actually happens after a
 *    race, on a phone, in a car park.
 * 3. **Writes the caption for you**, with the numbers already in it.
 *
 * Native share sheet where it exists, clipboard everywhere else.
 */
export function ShareResult({
  athleteName, eventName, finishSeconds, cardUrl, rank, fieldSize, division,
}: {
  athleteName: string;
  eventName: string;
  finishSeconds: number;
  cardUrl: string;
  rank: number;
  fieldSize: number;
  division: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-sm border
                   border-suth-accent/40 bg-suth-accent/10 px-4 text-sm font-medium text-suth-accent
                   transition-colors hover:bg-suth-accent/15
                   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
      >
        <Share2 className="size-4" aria-hidden />
        Share
      </button>

      <AnimatePresence>
        {open ? (
          <ShareSheet
            onClose={() => setOpen(false)}
            athleteName={athleteName}
            eventName={eventName}
            finishSeconds={finishSeconds}
            cardUrl={cardUrl}
            rank={rank}
            fieldSize={fieldSize}
            division={division}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

type Status = "idle" | "copied-link" | "copied-caption" | "downloading" | "failed";

function ShareSheet({
  onClose, athleteName, eventName, finishSeconds, cardUrl, rank, fieldSize, division,
}: {
  onClose: () => void;
  athleteName: string;
  eventName: string;
  finishSeconds: number;
  cardUrl: string;
  rank: number;
  fieldSize: number;
  division: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [cardLoaded, setCardLoaded] = useState(false);
  const reduceMotion = useReducedMotion();

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const caption =
    `${formatTime(finishSeconds)} at ${eventName} — `
    + `${formatOrdinal(rank)} of ${fieldSize.toLocaleString("en-GB")} in ${division}.`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const flash = (next: Status) => {
    setStatus(next);
    setTimeout(() => setStatus("idle"), 2000);
  };

  const nativeShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) return;
    try {
      await navigator.share({ title: `${athleteName} — ${eventName}`, text: caption, url: pageUrl });
    } catch {
      // Cancelled by the user, or blocked. Nothing to report.
    }
  };

  const copy = async (value: string, next: Status) => {
    try {
      await navigator.clipboard.writeText(value);
      flash(next);
    } catch {
      flash("failed");
    }
  };

  const download = async () => {
    setStatus("downloading");
    try {
      const res = await fetch(cardUrl);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${athleteName.toLowerCase().replace(/\s+/g, "-")}-${eventName.toLowerCase().replace(/\s+/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus("idle");
    } catch {
      flash("failed");
    }
  };

  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Share this result"
    >
      <motion.button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      />

      <motion.div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-lg border
                   border-suth-border bg-suth-elevated md:rounded-lg"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between border-b border-suth-border-subtle px-4 py-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
            [ SHARE THIS RACE ]
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-inline-tap
            className="rounded-sm p-2 text-suth-text-tertiary hover:text-suth-text
                       focus-visible:outline-2 focus-visible:outline-suth-accent"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="p-4">
          {/* Card preview. Fixed 1200×630 aspect so there is no layout shift
              while the image generates. */}
          <div className="relative overflow-hidden rounded-md border border-suth-border-subtle">
            <div className="aspect-[1200/630] w-full">
              {!cardLoaded ? (
                <div className="results-skeleton absolute inset-0 flex items-center justify-center">
                  <Loader2 className="size-5 animate-spin text-suth-text-tertiary" aria-hidden />
                  <span className="sr-only">Generating your share card</span>
                </div>
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element -- generated
                  OG endpoint, not a static asset; next/image would proxy it for
                  no benefit at a fixed known size. */}
              <img
                src={cardUrl}
                alt={`Share card: ${athleteName}, ${formatTime(finishSeconds)} at ${eventName}`}
                width={1200}
                height={630}
                onLoad={() => setCardLoaded(true)}
                className="size-full object-cover"
              />
            </div>
          </div>

          <p className="mt-3 rounded-sm bg-suth-base/60 px-3 py-2 text-sm text-suth-text-secondary">
            {caption}
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {canNativeShare ? (
              <ActionButton onClick={nativeShare} primary>
                <Share2 className="size-4" aria-hidden /> Share
              </ActionButton>
            ) : null}

            <ActionButton onClick={download} primary={!canNativeShare}>
              {status === "downloading"
                ? <><Loader2 className="size-4 animate-spin" aria-hidden /> Saving…</>
                : <><Download className="size-4" aria-hidden /> Save image</>}
            </ActionButton>

            <ActionButton onClick={() => copy(pageUrl, "copied-link")}>
              {status === "copied-link"
                ? <><Check className="size-4 text-suth-accent" aria-hidden /> Link copied</>
                : <><Link2 className="size-4" aria-hidden /> Copy link</>}
            </ActionButton>

            <ActionButton onClick={() => copy(`${caption} ${pageUrl}`, "copied-caption")}>
              {status === "copied-caption"
                ? <><Check className="size-4 text-suth-accent" aria-hidden /> Caption copied</>
                : <><Check className="size-4 opacity-0" aria-hidden /> Copy caption</>}
            </ActionButton>
          </div>

          <p className="mt-3 text-center text-[11px] text-suth-text-tertiary" aria-live="polite">
            {status === "failed"
              ? "That did not work — your browser blocked it. Try Save image instead."
              : "Saved images are 1200×630, sized for Instagram, WhatsApp and X."}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function ActionButton({
  onClick, children, primary,
}: {
  onClick: () => void;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-sm px-4 text-sm "
        + "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 "
        + "focus-visible:outline-suth-accent "
        + (primary
          ? "bg-suth-accent font-semibold text-suth-base hover:bg-suth-accent-hover"
          : "border border-suth-border text-suth-text hover:border-suth-border-strong")
      }
    >
      {children}
    </button>
  );
}
