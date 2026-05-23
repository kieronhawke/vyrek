"use client";

import { useState } from "react";

export function PartnerLinkBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Older browsers: fallback select
      const el = document.createElement("textarea");
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  // Simple QR via Google Charts API. Safe data URI alternative is heavier;
  // a partner-facing dashboard isn't the place to ship a 50KB QR library
  // when a 1KB external image works fine.
  const qrSrc = `https://chart.googleapis.com/chart?cht=qr&chs=240x240&chld=H|0&chl=${encodeURIComponent(link)}`;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_240px]">
      <div className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          Share this link
        </p>
        <p className="mt-3 break-all font-mono text-base text-vyrek-text">
          {link}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex h-10 items-center rounded-pill bg-vyrek-accent px-4 text-sm font-semibold text-[#0A0A0A] hover:bg-vyrek-accent-hover"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center rounded-pill border border-vyrek-border bg-vyrek-elevated px-4 text-sm text-vyrek-text-secondary hover:text-vyrek-text"
          >
            Open in new tab ↗
          </a>
        </div>
        <p className="mt-4 text-xs text-vyrek-text-tertiary">
          When someone signs up after clicking your link, they&rsquo;re
          attributed to you for life. Commission accrues from their first
          paid invoice.
        </p>
      </div>

      <div className="flex items-center justify-center rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrSrc}
          alt={`QR code for ${link}`}
          width={200}
          height={200}
          className="rounded-md"
        />
      </div>
    </div>
  );
}
