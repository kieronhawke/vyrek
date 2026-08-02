"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { formatTime } from "@/lib/results/format";

/**
 * Share button.
 *
 * Uses the native share sheet where it exists (which is where sharing actually
 * happens — a phone, straight after a race), and falls back to copying the
 * link. The branded OG card that makes the share worth looking at is generated
 * server-side by the /api/og route; this is the trigger for it.
 *
 * The reference site has no share affordance at all, which means a PB — the
 * most shareable moment in the sport — dead-ends on their page.
 */
export function ShareResult({
  athleteName, eventName, finishSeconds,
}: {
  athleteName: string;
  eventName: string;
  finishSeconds: number;
}) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `${athleteName} — ${formatTime(finishSeconds)} at ${eventName}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: text, text, url });
        return;
      } catch {
        // Cancelled, or unavailable in this context — fall through to copy.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked. Nothing useful to do; the URL is in the address bar.
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-sm border
                 border-suth-border bg-suth-elevated px-4 text-sm text-suth-text
                 transition-colors hover:border-suth-border-strong
                 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
    >
      {copied
        ? <><Check className="size-4 text-suth-accent" aria-hidden /> Link copied</>
        : <><Share2 className="size-4" aria-hidden /> Share</>}
    </button>
  );
}
