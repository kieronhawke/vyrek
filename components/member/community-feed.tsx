import type { CommunityPost } from "@/lib/member/demo";

export function CommunityFeed({ posts }: { posts: CommunityPost[] }) {
  return (
    <ul role="list" className="space-y-3">
      {posts.map((p) => (
        <li
          key={p.id}
          className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated/60 p-4"
        >
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-vyrek-border bg-vyrek-base text-xs font-semibold uppercase text-vyrek-text">
                {p.author
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((s) => s[0])
                  .join("")}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-vyrek-text">
                  {p.author}
                </p>
                <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                  {p.programme}
                  {p.badge ? ` · ${p.badge}` : ""} · {p.city}
                </p>
              </div>
            </div>
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
              {p.ago}
            </span>
          </header>
          <p className="mt-3 text-sm leading-relaxed text-vyrek-text">
            {p.body}
          </p>
          <footer className="mt-3 flex items-center gap-4 text-vyrek-text-tertiary">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]">
              ♥ {p.reactions}
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]">
              💬 {p.comments}
            </span>
          </footer>
        </li>
      ))}
    </ul>
  );
}
