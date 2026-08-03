"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Share2, Check, Link2, X } from "lucide-react";

/**
 * SHARING THE REPORT ITSELF.
 *
 * The result page has had a share sheet for a while. The report — the longer,
 * better, more impressive document, and the one somebody is most likely to want
 * to show another person — had only "Save as PDF". On a phone that is close to
 * useless: iOS routes it through the print dialog, and the thing that actually
 * happens after a race is a link into a group chat.
 *
 * That gap costs backlinks, which is the point. A shared PDF is invisible to
 * search; a shared *link* is the report, on our domain, with an OG card.
 *
 * Differences from the result-page sheet, all deliberate:
 *
 *   • **The link is the product**, not an image. The report is twelve sections
 *     of analysis — a 1200×630 card cannot carry it, and offering an image
 *     download here would send people to share the wrong artefact.
 *   • **The message says what the recipient gets.** "My race report" means
 *     nothing to somebody who has not seen one. Naming the finish time and the
 *     standing is what makes the link worth opening.
 *   • **The primary action is the native sheet** where it exists, because that
 *     is where WhatsApp, Messages and Instagram live.
 *
 * Copy-to-clipboard is the fallback everywhere else, and both paths put the URL
 * in the plain text as well as the `url` field — several iOS share targets read
 * only the string and silently drop `url`, which turns a backlink into a
 * sentence nobody can follow.
 */

export function ShareReport({
  athleteName,
  eventName,
  finishTime,
  standing,
}: {
  athleteName: string;
  eventName: string;
  finishTime: string;
  standing: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-inline-tap
        data-print-hide
        className="inline-flex min-h-[40px] items-center gap-2 rounded-sm border border-suth-accent/40
                   bg-suth-accent/10 px-4 text-xs font-semibold text-suth-accent transition-colors
                   hover:bg-suth-accent/15
                   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
      >
        <Share2 className="size-4" aria-hidden />
        Share report
      </button>

      {open ? (
        <ShareSheet
          onClose={() => setOpen(false)}
          athleteName={athleteName}
          eventName={eventName}
          finishTime={finishTime}
          standing={standing}
        />
      ) : null}
    </>
  );
}

function ShareSheet({
  onClose, athleteName, eventName, finishTime, standing,
}: {
  onClose: () => void;
  athleteName: string;
  eventName: string;
  finishTime: string;
  standing: string;
}) {
  const [copied, setCopied] = useState<"link" | "message" | null>(null);
  const [failed, setFailed] = useState(false);

  const url = typeof window !== "undefined" ? window.location.href : "";
  const message =
    `${athleteName} — ${finishTime} at ${eventName}. ${standing}. `
    + `Full race report, free:`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canShare = useSyncExternalStore(
    subscribeNever,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );

  const nativeShare = async () => {
    try {
      await navigator.share({
        title: `${athleteName} — HYROX race report`,
        // URL repeated inside `text` on purpose: targets that read only the
        // plain string would otherwise drop the link entirely.
        text: `${message} ${url}`,
        url,
      });
    } catch {
      // A cancelled sheet is not a failure and needs no message.
    }
  };

  const copy = async (value: string, which: "link" | "message") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setFailed(false);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setFailed(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Share this race report"
      data-print-hide
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-t-lg border
                      border-suth-border bg-suth-elevated md:rounded-lg">
        <div className="flex items-center justify-between border-b border-suth-border-subtle px-4 py-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
            [ SHARE THIS REPORT ]
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
          <p className="rounded-sm bg-suth-base/60 px-3 py-2 text-sm text-suth-text-secondary">
            {message} <span className="text-suth-accent">{url}</span>
          </p>

          <div className="mt-3 grid gap-2">
            {canShare ? (
              <button
                type="button"
                onClick={nativeShare}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-sm
                           bg-suth-accent px-4 text-sm font-semibold text-suth-base
                           hover:bg-suth-accent-hover
                           focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
              >
                <Share2 className="size-4" aria-hidden />
                Share
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => copy(url, "link")}
              className={
                "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-sm px-4 text-sm "
                + "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent "
                + (canShare
                  ? "border border-suth-border text-suth-text hover:border-suth-border-strong"
                  : "bg-suth-accent font-semibold text-suth-base hover:bg-suth-accent-hover")
              }
            >
              {copied === "link"
                ? <><Check className="size-4" aria-hidden /> Link copied</>
                : <><Link2 className="size-4" aria-hidden /> Copy link</>}
            </button>

            <button
              type="button"
              onClick={() => copy(`${message} ${url}`, "message")}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-sm
                         border border-suth-border px-4 text-sm text-suth-text
                         hover:border-suth-border-strong
                         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
            >
              {copied === "message"
                ? <><Check className="size-4" aria-hidden /> Message copied</>
                : <><Check className="size-4 opacity-0" aria-hidden /> Copy with the times</>}
            </button>
          </div>

          <p className="mt-3 text-center text-[11px] text-suth-text-tertiary" aria-live="polite">
            {failed
              ? "Your browser blocked the clipboard. Select the link above and copy it."
              : "Anyone with the link gets the full report — free, no account."}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Capability never changes during a session, so the store never notifies. */
function subscribeNever(): () => void {
  return () => {};
}
