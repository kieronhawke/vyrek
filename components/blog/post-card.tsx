import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { CATEGORIES, type PostMeta } from "@/lib/blog/posts";

export function PostCard({
  post,
  variant = "default",
}: {
  post: PostMeta;
  variant?: "default" | "featured" | "compact";
}) {
  const dateLabel = format(new Date(post.publishedAt), "d MMM yyyy");
  const categoryLabel = CATEGORIES[post.category]?.label ?? post.category;

  if (variant === "featured") {
    return (
      <Link
        href={`/blog/${post.slug}`}
        className="group relative block overflow-hidden rounded-2xl border border-vyrek-border-subtle bg-vyrek-elevated transition-[border,transform,box-shadow] duration-base ease-out hover:-translate-y-0.5 hover:border-vyrek-border hover:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)] active:scale-[0.995]"
      >
        <div
          aria-hidden
          className="absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-base group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(60% 80% at 30% 0%, rgba(163,230,53,0.15), transparent 60%)",
          }}
        />
        <div className="relative grid md:grid-cols-2">
          <div className="relative aspect-[16/10] overflow-hidden bg-vyrek-overlay md:aspect-auto">
            <Image
              src={post.heroImage}
              alt={post.heroAlt}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-r from-transparent to-vyrek-elevated/60 md:from-transparent md:via-transparent md:to-vyrek-elevated/30"
            />
          </div>
          <div className="flex flex-col justify-between gap-6 p-6 md:p-8">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
                [ FEATURED · {categoryLabel} ]
              </p>
              <h2 className="mt-3 text-balance text-2xl font-black leading-tight tracking-[-0.025em] text-vyrek-text md:text-3xl">
                {post.title}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                {post.excerpt}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-vyrek-text-tertiary">
              <span>{post.author.name}</span>
              <span aria-hidden>·</span>
              <time dateTime={post.publishedAt}>{dateLabel}</time>
              <span aria-hidden>·</span>
              <span>{post.readingMinutes} min read</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        href={`/blog/${post.slug}`}
        className="group flex items-start gap-4 rounded-md border border-vyrek-border-subtle bg-vyrek-elevated p-4 transition-[border,transform] duration-fast hover:border-vyrek-border active:scale-[0.99]"
      >
        <div className="relative hidden h-16 w-20 shrink-0 overflow-hidden rounded-md bg-vyrek-overlay sm:block">
          <Image
            src={post.heroImage}
            alt={post.heroAlt}
            fill
            sizes="80px"
            className="object-cover"
          />
        </div>
        <div className="flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
            {categoryLabel} · {post.readingMinutes} min
          </p>
          <h3 className="mt-1 text-base font-semibold leading-snug text-vyrek-text">
            {post.title}
          </h3>
        </div>
      </Link>
    );
  }

  // Default card. Now ships with the hero image (post-imagery audit we
  // have 30 unique photos across ~50 posts, repetition is no longer the
  // bug it once was). Image on top, category + title + excerpt below.
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated transition-[border,transform,box-shadow] duration-base ease-out hover:-translate-y-0.5 hover:border-vyrek-border-strong hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.5)] active:scale-[0.995]"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-vyrek-overlay">
        <Image
          src={post.heroImage}
          alt={post.heroAlt}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
        {/* Soft category accent at the top edge */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-vyrek-accent/70 transition-colors duration-base group-hover:bg-vyrek-accent"
        />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6 md:p-7">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          {categoryLabel}
        </p>
        <h2 className="text-balance text-lg font-bold leading-tight tracking-[-0.015em] text-vyrek-text md:text-xl">
          {post.title}
        </h2>
        <p className="text-sm leading-relaxed text-vyrek-text-secondary">
          {post.excerpt}
        </p>
        <div className="mt-auto flex items-center gap-3 text-xs text-vyrek-text-tertiary">
          <time dateTime={post.publishedAt}>{dateLabel}</time>
          <span aria-hidden>·</span>
          <span>{post.readingMinutes} min read</span>
        </div>
      </div>
    </Link>
  );
}
