"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Heading = { id: string; text: string; level: number };

/**
 * Auto-generated TOC from h2/h3 elements inside `#article-body`. Sticky on
 * desktop (left rail), collapsible disclosure on mobile.
 */
export function TableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const article = document.getElementById("article-body");
    if (!article) return;

    const found: Heading[] = Array.from(
      article.querySelectorAll("h2[id], h3[id]"),
    ).map((el) => ({
      id: (el as HTMLElement).id,
      text: el.textContent?.trim() ?? "",
      level: el.tagName === "H2" ? 2 : 3,
    }));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeadings(found);

    if (!found.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) setActiveId(visible[0].target.id);
      },
      { rootMargin: "0px 0px -60% 0px", threshold: 0.1 },
    );
    for (const h of found) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  if (!headings.length) return null;

  return (
    <details className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated px-4 py-3 lg:open:py-3 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:border-0 lg:bg-transparent lg:p-0 [&[open]>summary>span:last-child]:rotate-180">
      <summary className="flex cursor-pointer items-center justify-between font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary lg:cursor-default lg:pointer-events-none lg:mb-3 [&::-webkit-details-marker]:hidden">
        <span>[ ON THIS PAGE ]</span>
        <span aria-hidden className="transition-transform lg:hidden">
          ▾
        </span>
      </summary>
      <ol className="mt-3 space-y-1 text-sm lg:mt-0">
        {headings.map((h) => (
          <li
            key={h.id}
            className={cn(h.level === 3 && "pl-4")}
          >
            <a
              href={`#${h.id}`}
              className={cn(
                "block py-1.5 leading-snug transition-colors",
                activeId === h.id
                  ? "text-vyrek-accent"
                  : "text-vyrek-text-secondary hover:text-vyrek-text",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </details>
  );
}
