"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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
        data-print-hide
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
  const [cardFile, setCardFile] = useState<File | null>(null);
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

  const fetchCard = async (): Promise<File | null> => {
    try {
      const res = await fetch(cardUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new File([blob], `${fileStem(athleteName, eventName)}.png`, { type: "image/png" });
    } catch {
      return null;
    }
  };

  // Warmed while the sheet is open rather than on tap. Safari drops the
  // transient user activation across an await, so fetching the card inside the
  // tap handler can make the share sheet refuse to open at all.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const file = await fetchCard();
      if (!cancelled) setCardFile(file);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cardUrl is the only real input
  }, [cardUrl]);

  const flash = (next: Status) => {
    setStatus(next);
    setTimeout(() => setStatus("idle"), 2000);
  };

  const nativeShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) return;
    try {
      await navigator.share({
        title: `${athleteName} — ${eventName}`,
        // The link is repeated inside `text` deliberately. Several iOS share
        // targets — Notes, Instagram, and any app that reads only the plain
        // string — take `text` and silently drop `url`, so a share that was
        // meant to bring someone back here arrives as a bare sentence with no
        // way to follow it. Apps that handle `url` properly still get it as a
        // real link and show the card preview.
        text: `${caption} ${pageUrl}`,
        url: pageUrl,
      });
    } catch {
      // Cancelled by the user, or blocked. Nothing to report.
    }
  };

  /**
   * Share the card image itself through the native sheet.
   *
   * This is the share that actually happens after a race: the picture, into a
   * story or a group chat, from a phone. Downloading was the only route before,
   * and on iOS Safari the `download` attribute on a blob is unreliable — it
   * opens the image in a tab and leaves you to long-press it.
   *
   * The fetch happens before `navigator.share`, which costs the transient user
   * activation on some browsers, so the file is fetched on open rather than on
   * tap where possible. Where it is not, the catch below keeps it silent.
   */
  const shareImage = async () => {
    if (typeof navigator === "undefined" || !navigator.share) return;
    setStatus("downloading");
    try {
      const file = cardFile ?? (await fetchCard());
      if (!file) { flash("failed"); return; }
      await navigator.share({
        files: [file],
        title: `${athleteName} — ${eventName}`,
        text: `${caption} ${pageUrl}`,
      });
      setStatus("idle");
    } catch {
      // AbortError is a cancelled sheet, which is not a failure.
      setStatus("idle");
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
      const file = cardFile ?? (await fetchCard());
      if (!file) throw new Error("card unavailable");
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileStem(athleteName, eventName)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus("idle");
    } catch {
      flash("failed");
    }
  };

  // Capability is read through `useSyncExternalStore`, which is exactly what it
  // is for: a value that lives outside React, never changes, and must have an
  // SSR snapshot. Reading `navigator` during render would make the server HTML
  // and the first client render disagree, and setting it from an effect trips
  // the cascading-render rule — this does neither.
  const canShareLink = useSyncExternalStore(subscribeNever, canShareLinkNow, () => false);
  const canShareImage = useSyncExternalStore(subscribeNever, canShareImageNow, () => false);

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
            {canShareImage ? (
              <ActionButton onClick={shareImage} primary>
                <Share2 className="size-4" aria-hidden /> Share the card
              </ActionButton>
            ) : null}

            {canShareLink ? (
              <ActionButton onClick={nativeShare} primary={!canShareImage}>
                <Link2 className="size-4" aria-hidden /> Share the link
              </ActionButton>
            ) : null}

            <ActionButton onClick={download} primary={!canShareLink}>
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

/** One filename rule, used by both the download and the shared file. */
function fileStem(athleteName: string, eventName: string): string {
  const slug = (value: string) =>
    value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${slug(athleteName)}-${slug(eventName)}`;
}

/* ── Browser capability probes ──────────────────────────────────────── */

/** These never change during a session, so the store never notifies. */
function subscribeNever(): () => void {
  return () => {};
}

function canShareLinkNow(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/**
 * Whether the browser will actually accept a *file* in the share sheet.
 *
 * `canShare` has to be probed with a real `File`. Passing a plain object
 * returns true on browsers that cannot take one, and the share then fails
 * silently at the moment the user taps it — the worst possible place to find
 * out. Memoised because constructing a probe file on every render is waste.
 */
let fileShareSupport: boolean | null = null;

function canShareImageNow(): boolean {
  if (fileShareSupport !== null) return fileShareSupport;
  if (!canShareLinkNow() || typeof File === "undefined") {
    fileShareSupport = false;
    return false;
  }
  try {
    const probe = new File([new Blob([""], { type: "image/png" })], "probe.png", {
      type: "image/png",
    });
    fileShareSupport = Boolean(navigator.canShare?.({ files: [probe] }));
  } catch {
    fileShareSupport = false;
  }
  return fileShareSupport;
}
