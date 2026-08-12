import { PageHeader, Card, Stat, Badge, NoticeCard } from "@/components/admin/ui";
import { listPostMeta } from "@/lib/blog/posts";

export const dynamic = "force-dynamic";

export const metadata = { title: "SEO" };

function CheckItem({
  done,
  children,
}: {
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span
        aria-hidden
        className={
          done
            ? "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-[11px] font-bold text-emerald-300"
            : "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-[11px] font-bold text-amber-300"
        }
      >
        {done ? "✓" : "•"}
      </span>
      <span className="text-sm text-suth-text-secondary">{children}</span>
    </li>
  );
}

/**
 * SEO health, from real signals only.
 *
 * The headline is honest: the whole site is noindexed until launch, so no
 * amount of the rest matters to a search engine yet. The checklist states
 * what is genuinely built (metadata, OG images, RSS, JSON-LD, sitemap) and
 * the one thing left before launch (lift the noindex).
 */
export default async function AdminSeoPage() {
  let publishedCount: number | null = null;
  try {
    const posts = await listPostMeta();
    publishedCount = posts.length;
  } catch {
    publishedCount = null;
  }

  return (
    <>
      <PageHeader
        eyebrow="Growth"
        title="SEO"
        description="A health overview from real signals. Informational: the numbers here are the ones we can actually compute."
      />

      <div className="mb-8">
        <NoticeCard
          title="Indexing blocked"
          body={
            <>
              The whole site is <strong>noindexed</strong> until launch. An{" "}
              <code className="rounded bg-suth-base px-1 py-0.5 font-mono text-xs">
                X-Robots-Tag: noindex, nofollow
              </code>{" "}
              header in <code className="font-mono text-xs">next.config.ts</code>{" "}
              applies sitewide and outranks any per-page metadata, so nothing
              can be indexed while it is present. Everything below is in place
              and ready for the moment that header comes off.
            </>
          }
        />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3">
        <Stat
          label="Indexing"
          value="Blocked"
          hint="Noindexed sitewide until launch."
        />
        <Stat
          label="Published posts"
          value={publishedCount === null ? "—" : publishedCount}
          hint="Live blog articles."
        />
        <Stat label="Sitemap" value="Live" hint="Generated per deploy." />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Key files
        </h2>
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center rounded-pill border border-suth-border bg-suth-elevated px-4 text-sm text-suth-text hover:border-suth-border-strong"
            >
              /sitemap.xml ↗
            </a>
            <a
              href="/blog/rss.xml"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center rounded-pill border border-suth-border bg-suth-elevated px-4 text-sm text-suth-text hover:border-suth-border-strong"
            >
              /blog/rss.xml ↗
            </a>
            <a
              href="/robots.txt"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center rounded-pill border border-suth-border bg-suth-elevated px-4 text-sm text-suth-text hover:border-suth-border-strong"
            >
              /robots.txt ↗
            </a>
          </div>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          In place
        </h2>
        <Card>
          <ul>
            <CheckItem done>
              Per-page metadata (titles and descriptions) across marketing,
              blog and programme pages.
            </CheckItem>
            <CheckItem done>
              Open Graph images for social sharing, generated per page.
            </CheckItem>
            <CheckItem done>RSS feed for the blog at /blog/rss.xml.</CheckItem>
            <CheckItem done>
              JSON-LD structured data on landing, blog and programme pages.
            </CheckItem>
            <CheckItem done>
              A sitemap generated on every deploy at /sitemap.xml.
            </CheckItem>
          </ul>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Before launch
        </h2>
        <Card>
          <ul>
            <CheckItem done={false}>
              Remove the sitewide noindex header once Kieron confirms the site
              is ready to be found. Until then, keep it. <Badge tone="warn">pending</Badge>
            </CheckItem>
          </ul>
        </Card>
      </section>
    </>
  );
}
