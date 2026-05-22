"use client";

import { useEffect, useState } from "react";

/**
 * Sticky reading progress bar for long-form posts. Tracks scroll position
 * against `#article-body` (rendered by the post page) and fills a thin
 * accent bar across the top.
 */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const article = document.getElementById("article-body");
    if (!article) return;

    const onScroll = () => {
      const rect = article.getBoundingClientRect();
      const viewport = window.innerHeight;
      const scrolled = -rect.top;
      const total = rect.height - viewport;
      const pct = Math.max(0, Math.min(1, scrolled / total));
      setProgress(pct);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-50 h-0.5"
      style={{ pointerEvents: "none" }}
    >
      <div
        className="h-full bg-vyrek-accent"
        style={{
          width: `${progress * 100}%`,
          transition: "width 80ms linear",
        }}
      />
    </div>
  );
}
