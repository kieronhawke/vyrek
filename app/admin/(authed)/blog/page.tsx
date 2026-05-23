import Link from "next/link";
import { format } from "date-fns";
import { PageHeader, Table, Stat, Card } from "@/components/admin/ui";
import { listPostMeta } from "@/lib/blog/posts";

export const dynamic = "force-dynamic";

const GITHUB_BASE =
  "https://github.com/kieronhawke/vyrek/blob/main/content/blog";

export default async function AdminBlogPage() {
  const posts = await listPostMeta();
  const byCategory = new Map<string, number>();
  for (const p of posts) {
    byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Blog posts"
        description={
          <>
            All posts under <code>content/blog/*.mdx</code>. Edit on GitHub
            and a push to <code>main</code> rebuilds the site automatically.
            New posts go live within ~60 seconds of merge.
          </>
        }
        actions={
          <a
            href={`${GITHUB_BASE}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center rounded-pill bg-vyrek-accent px-4 text-sm font-semibold text-[#0A0A0A]"
          >
            Open content/blog ↗
          </a>
        }
      />

      <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Posts" value={posts.length.toString()} />
        <Stat
          label="Categories"
          value={byCategory.size.toString()}
        />
        <Stat
          label="Newest"
          value={
            posts[0]
              ? format(new Date(posts[0].publishedAt), "dd MMM")
              : "-"
          }
          hint={posts[0]?.title.slice(0, 30) ?? undefined}
        />
        <Stat
          label="Total words"
          value={posts
            .reduce((a, p) => a + (p.words ?? 0), 0)
            .toLocaleString("en-GB")}
        />
      </section>

      <Card className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          How publishing works
        </p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-vyrek-text-secondary">
          <li>
            Open the file on GitHub, edit, commit (or open a PR).
          </li>
          <li>
            Every push to <code>main</code> triggers a Vercel deploy.
          </li>
          <li>
            New routes appear at <code>vyrek.com/blog/[slug]</code> within
            ~60 seconds of deploy success.
          </li>
          <li>
            The sitemap and RSS feed regenerate on the next request after
            the deploy. Search engines pick up the new URL via the next
            crawl (or the IndexNow ping in <code>app/api/seo/indexnow</code>).
          </li>
        </ol>
      </Card>

      <Table
        headers={[
          "Title",
          "Category",
          "Author",
          "Published",
          "Words",
          "Edit",
        ]}
        empty="No posts in content/blog/ yet."
        rows={posts.map((p) => [
          <Link
            key="t"
            href={`/blog/${p.slug}`}
            className="text-vyrek-accent hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {p.title}
          </Link>,
          <span
            key="c"
            className="font-mono text-xs uppercase tracking-[0.18em] text-vyrek-text-secondary"
          >
            {p.category}
          </span>,
          <span key="a" className="text-vyrek-text-secondary">
            {p.author.name}
          </span>,
          format(new Date(p.publishedAt), "dd MMM yyyy"),
          <span key="w" className="tabular-nums text-vyrek-text-secondary">
            {p.words.toLocaleString("en-GB")}
          </span>,
          <a
            key="e"
            href={`${GITHUB_BASE}/${p.slug}.mdx`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-accent hover:underline"
          >
            Edit ↗
          </a>,
        ])}
      />
    </>
  );
}
