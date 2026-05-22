import { PostCard } from "@/components/blog/post-card";
import type { PostMeta } from "@/lib/blog/posts";

export function RelatedPosts({ posts }: { posts: PostMeta[] }) {
  if (!posts.length) return null;
  return (
    <section
      aria-labelledby="related-heading"
      className="mt-16 border-t border-vyrek-border-subtle pt-12"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
        [ KEEP READING ]
      </p>
      <h2
        id="related-heading"
        className="mt-3 text-2xl font-black leading-tight tracking-[-0.02em] text-vyrek-text md:text-3xl"
      >
        Related guides
      </h2>
      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <PostCard key={p.slug} post={p} />
        ))}
      </div>
    </section>
  );
}
