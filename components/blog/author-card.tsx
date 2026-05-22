import Link from "next/link";
import { authorUrl } from "@/lib/blog/urls";
import type { Author } from "@/lib/blog/authors";

export function AuthorCard({
  author,
  showLink = true,
}: {
  author: Author;
  showLink?: boolean;
}) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5">
      <div className="size-16 shrink-0 overflow-hidden rounded-full bg-vyrek-overlay">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={author.photo}
          alt={`Portrait of ${author.name}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          Written by
        </p>
        {showLink ? (
          <Link
            href={authorUrl(author.slug).replace(/^https?:\/\/[^/]+/, "")}
            className="mt-1 inline-block text-lg font-bold leading-tight tracking-[-0.01em] text-vyrek-text underline-offset-4 hover:underline"
          >
            {author.name}
          </Link>
        ) : (
          <p className="mt-1 text-lg font-bold leading-tight tracking-[-0.01em] text-vyrek-text">
            {author.name}
          </p>
        )}
        <p className="mt-0.5 text-xs uppercase tracking-[0.16em] text-vyrek-accent">
          {author.role}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-vyrek-text-secondary">
          {author.bio}
        </p>
      </div>
    </div>
  );
}
