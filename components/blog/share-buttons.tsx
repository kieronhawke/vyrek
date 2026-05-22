"use client";

import { useEffect, useState } from "react";

export function ShareButtons({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  const onWebShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ url, title });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await onCopy();
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      /* clipboard blocked */
    }
  };

  const twitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    title,
  )}&url=${encodeURIComponent(url)}`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    url,
  )}`;
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    url,
  )}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onWebShare}
        className="inline-flex h-10 items-center gap-2 rounded-pill border border-vyrek-border bg-vyrek-elevated px-4 text-sm text-vyrek-text transition-colors hover:border-vyrek-border-strong"
      >
        <span aria-hidden>↗</span>
        <span>{copied ? "Copied" : "Share"}</span>
      </button>
      <a
        href={twitter}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-10 items-center justify-center rounded-pill border border-vyrek-border bg-vyrek-elevated px-3 text-sm text-vyrek-text-secondary transition-colors hover:border-vyrek-border-strong hover:text-vyrek-text"
        aria-label="Share on X (Twitter)"
      >
        X
      </a>
      <a
        href={linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-10 items-center justify-center rounded-pill border border-vyrek-border bg-vyrek-elevated px-3 text-sm text-vyrek-text-secondary transition-colors hover:border-vyrek-border-strong hover:text-vyrek-text"
        aria-label="Share on LinkedIn"
      >
        LinkedIn
      </a>
      <a
        href={facebook}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-10 items-center justify-center rounded-pill border border-vyrek-border bg-vyrek-elevated px-3 text-sm text-vyrek-text-secondary transition-colors hover:border-vyrek-border-strong hover:text-vyrek-text"
        aria-label="Share on Facebook"
      >
        Facebook
      </a>
    </div>
  );
}
