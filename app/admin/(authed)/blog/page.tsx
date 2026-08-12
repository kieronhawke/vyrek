import Link from "next/link";
import { format } from "date-fns";
import { PageHeader, Stat } from "@/components/admin/ui";
import { listFilePosts, CATEGORIES, type Category } from "@/lib/blog/posts";
import { listDbPosts } from "@/lib/blog/store";

export const dynamic = "force-dynamic";

export const metadata = { title: "Blog posts" };

/**
 * Every post the site has, editable in place. File posts and Ben's own
 * posts sit in one list; status says what the public site sees.
 */
export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();

  const [files, rows] = await Promise.all([listFilePosts(), listDbPosts()]);
  const rowBySlug = new Map(rows.map((r) => [r.slug, r] as const));

  type Item = {
    slug: string;
    title: string;
    category: string;
    publishedAt: string;
    words: number;
    status: "live" | "edited" | "draft" | "hidden";
  };

  const items: Item[] = [];
  for (const p of files) {
    const row = rowBySlug.get(p.slug);
    items.push({
      slug: p.slug,
      title: row?.title || p.title,
      category: row?.category ?? p.category,
      publishedAt: row?.publishedAt ?? p.publishedAt,
      words: p.words,
      status: !row
        ? "live"
        : row.status === "hidden"
          ? "hidden"
          : row.status === "draft"
            ? "live" // the file version is still up; the draft edit isn't
            : "edited",
    });
    rowBySlug.delete(p.slug);
  }
  // What's left are Ben's own posts, with no file behind them.
  for (const row of rowBySlug.values()) {
    items.push({
      slug: row.slug,
      title: row.title || row.slug,
      category: row.category,
      publishedAt: row.publishedAt,
      words: row.content.split(/\s+/).filter(Boolean).length,
      status:
        row.status === "published"
          ? "live"
          : row.status === "hidden"
            ? "hidden"
            : "draft",
    });
  }

  const draftEdits = new Set(
    rows.filter((r) => r.status === "draft").map((r) => r.slug),
  );

  items.sort((a, b) =>
    a.publishedAt === b.publishedAt
      ? a.slug.localeCompare(b.slug)
      : a.publishedAt > b.publishedAt
        ? -1
        : 1,
  );

  const filtered = query
    ? items.filter(
        (i) =>
          i.title.toLowerCase().includes(query) ||
          i.slug.includes(query) ||
          i.category.includes(query),
      )
    : items;

  const liveCount = items.filter((i) => i.status !== "hidden" && i.status !== "draft").length;
  const hiddenCount = items.filter((i) => i.status === "hidden").length;

  const statusChip = (s: Item["status"], hasDraftEdit: boolean) => {
    if (hasDraftEdit)
      return (
        <span className="rounded-pill bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-300">
          draft edit
        </span>
      );
    const map = {
      live: ["bg-emerald-500/15 text-emerald-300", "live"],
      edited: ["bg-emerald-500/15 text-emerald-300", "live · edited"],
      draft: ["bg-amber-500/15 text-amber-300", "draft"],
      hidden: ["bg-suth-danger/15 text-suth-danger", "hidden"],
    } as const;
    const [cls, label] = map[s];
    return (
      <span
        className={`rounded-pill px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${cls}`}
      >
        {label}
      </span>
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Blog posts"
        description="Everything on the journal. Open a post to change it, hide it, or write something new — it's on the site the moment you publish."
        actions={
          <Link
            href="/admin/blog/new"
            className="inline-flex h-10 items-center rounded-pill bg-suth-accent px-4 text-sm font-semibold text-[#0A0A0A] hover:bg-suth-accent-hover"
          >
            Write a post
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="On the site" value={String(liveCount)} />
        <Stat
          label="Drafts"
          value={String(
            items.filter((i) => i.status === "draft").length + draftEdits.size,
          )}
        />
        <Stat label="Hidden" value={String(hiddenCount)} />
      </div>

      <form action="/admin/blog" className="mb-4">
        <label htmlFor="blog-q" className="sr-only">
          Search posts
        </label>
        <input
          id="blog-q"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by title, address or category…"
          className="h-12 w-full rounded-pill border border-suth-border bg-suth-elevated px-5 text-[16px] text-suth-text outline-none focus:border-suth-accent"
        />
      </form>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-suth-text-secondary">
          Nothing matches that search.
        </p>
      ) : (
        <ul role="list" className="space-y-2">
          {filtered.map((i) => (
            <li key={i.slug}>
              <Link
                href={`/admin/blog/edit/${i.slug}`}
                className="block rounded-xl border border-suth-border bg-suth-elevated p-4 transition-colors hover:border-suth-border-strong"
              >
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-suth-text">
                    {i.title}
                  </p>
                  {statusChip(i.status, draftEdits.has(i.slug) && i.status !== "draft")}
                </div>
                <p className="mt-1 text-xs text-suth-text-tertiary">
                  {CATEGORIES[i.category as Category]?.label ?? i.category} ·{" "}
                  {format(new Date(i.publishedAt), "d MMM yyyy")} ·{" "}
                  {i.words.toLocaleString("en-GB")} words
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
