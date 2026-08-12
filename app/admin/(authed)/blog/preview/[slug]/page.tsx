import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { proseComponents } from "@/components/blog/prose";
import { getAnyPost } from "@/lib/blog/posts";

export const dynamic = "force-dynamic";

export const metadata = { title: "Preview" };

/**
 * The post exactly as the blog will render it — same components, same
 * pipeline — but behind admin auth, so drafts and hidden posts can be
 * read before anyone else sees them.
 */
export default async function BlogPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getAnyPost(slug);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-suth-border bg-suth-elevated p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
          Preview · only you can see this page
        </p>
        <Link
          href={`/admin/blog/edit/${slug}`}
          className="text-sm text-suth-accent underline underline-offset-4"
        >
          Back to the editor
        </Link>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
        {format(new Date(post.publishedAt), "d MMMM yyyy")} ·{" "}
        {post.readingMinutes} min read
      </p>
      <h1 className="mt-3 text-4xl font-black leading-[1.05] tracking-[-0.03em] text-suth-text">
        {post.title}
      </h1>
      {post.excerpt ? (
        <p className="mt-4 text-lg text-suth-text-secondary">{post.excerpt}</p>
      ) : null}
      {post.heroImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.heroImage}
          alt={post.heroAlt}
          className="mt-8 w-full rounded-xl border border-suth-border object-cover"
        />
      ) : null}

      <div className="prose-blog mt-10 min-w-0">
        <MDXRemote
          source={post.content}
          components={proseComponents}
          options={{
            // Same reasoning as the public page: first-party content only,
            // written by the admin. See app/blog/[slug]/page.tsx.
            blockJS: false,
            mdxOptions: {
              rehypePlugins: [
                rehypeSlug,
                [
                  rehypeAutolinkHeadings,
                  {
                    behavior: "wrap",
                    properties: { className: ["no-underline"] },
                  },
                ],
              ],
            },
          }}
        />
      </div>
    </div>
  );
}
