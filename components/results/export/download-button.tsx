"use client";

import { useState } from "react";
import { Download, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Client-side file download.
 *
 * Builds the file in the browser from data already on the page, so an export
 * costs no server round trip and works offline once the page has loaded.
 * `build` may be async so a caller can fetch a fuller dataset first (the
 * ranking table exports all 3,221 rows, not just the visible window).
 */
export function DownloadButton({
  filename, mimeType = "text/csv;charset=utf-8", build, label = "Export CSV", className, variant = "quiet",
}: {
  filename: string;
  mimeType?: string;
  build: () => string | Promise<string>;
  label?: string;
  className?: string;
  variant?: "quiet" | "primary";
}) {
  const [state, setState] = useState<"idle" | "working" | "done" | "failed">("idle");

  const run = async () => {
    setState("working");
    try {
      const contents = await build();
      const blob = new Blob([contents], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      // Revoke on the next tick — Safari cancels the download if the URL dies
      // in the same frame as the click.
      setTimeout(() => URL.revokeObjectURL(url), 0);
      setState("done");
      setTimeout(() => setState("idle"), 2200);
    } catch {
      setState("failed");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={state === "working"}
      data-inline-tap
      className={cn(
        "inline-flex min-h-[40px] items-center gap-2 rounded-sm px-3 text-xs transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent",
        variant === "primary"
          ? "bg-suth-accent font-semibold text-suth-base hover:bg-suth-accent-hover"
          : "border border-suth-border bg-suth-elevated text-suth-text-secondary hover:text-suth-text",
        className,
      )}
    >
      {state === "working" ? <Loader2 className="size-3.5 animate-spin" aria-hidden />
        : state === "done" ? <Check className="size-3.5 text-suth-accent" aria-hidden />
        : <Download className="size-3.5" aria-hidden />}
      {state === "done" ? "Downloaded"
        : state === "failed" ? "Download blocked"
        : label}
    </button>
  );
}
