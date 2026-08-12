"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin/auth";
import { logEvent } from "@/lib/admin/events";
import {
  upsertDbPost,
  deleteDbPost,
  getDbPost,
  type BlogPostStatus,
} from "@/lib/blog/store";
import { listFilePosts, CATEGORIES, type Category } from "@/lib/blog/posts";

/**
 * The write half of Ben's blog editor. Same rules as every admin action:
 * re-check admin on entry, return { ok, error? } for inline status, and
 * revalidate the public pages so a save is visible on the next request
 * rather than an hour later.
 */

type Result = { ok: true } | { ok: false; error: string };

export type BlogEditorInput = {
  slug: string;
  status: BlogPostStatus;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  publishedAt: string;
  authorSlug: string;
  heroImage: string;
  heroAlt: string;
  seoTitle: string;
  seoDescription: string;
  featured: boolean;
  content: string;
};

function revalidateBlog(slug: string, category?: string) {
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  if (category) revalidatePath(`/blog/category/${category}`);
  revalidatePath("/admin/blog");
}

export async function saveBlogPost(input: BlogEditorInput): Promise<Result> {
  try {
    const { user } = await assertAdmin();

    const slug = input.slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return {
        ok: false,
        error: "The link name can only use lowercase letters, numbers and dashes.",
      };
    }
    if (!input.title.trim()) return { ok: false, error: "Give the post a title." };
    if (!input.content.trim()) return { ok: false, error: "The post has no words yet." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.publishedAt)) {
      return { ok: false, error: "The publish date doesn't look like a date." };
    }
    const category = CATEGORIES[input.category as Category]
      ? input.category
      : "training";

    // Compile the words BEFORE saving. Broken MDX that only failed at
    // render time would take the live post down with a 500, and the first
    // person to find out would be a reader.
    try {
      const { compileMDX } = await import("next-mdx-remote/rsc");
      await compileMDX({ source: input.content });
    } catch (e) {
      const detail = e instanceof Error ? e.message.split("\n")[0] : "";
      return {
        ok: false,
        error: `Something in the post won't render${detail ? `: ${detail}` : ""}. The usual culprit is a stray < symbol — write "less than" instead.`,
      };
    }

    const res = await upsertDbPost({
      slug,
      status: input.status,
      title: input.title.trim(),
      excerpt: input.excerpt.trim(),
      category,
      tags: input.tags.map((t) => t.trim()).filter(Boolean).slice(0, 12),
      publishedAt: input.publishedAt,
      authorSlug: input.authorSlug || "suth-team",
      heroImage: input.heroImage.trim() || null,
      heroAlt: input.heroAlt.trim() || null,
      seoTitle: input.seoTitle.trim() || null,
      seoDescription: input.seoDescription.trim() || null,
      featured: input.featured,
      content: input.content,
    });
    if (!res.ok) return { ok: false, error: res.error ?? "Couldn't save." };

    revalidateBlog(slug, category);
    await logEvent({
      actor: user.email ?? "admin",
      action: "blog.post_saved",
      targetKind: "blog_post",
      targetId: slug,
      metadata: { event: "saved", status: input.status },
    }).catch(() => {});
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown error" };
  }
}

/**
 * Hide or show a post. For a file post with no database row yet, the
 * file's content is copied into a row first, so hiding is just a status
 * and nothing about the words is lost.
 */
export async function setBlogPostStatus(
  slug: string,
  status: BlogPostStatus,
): Promise<Result> {
  try {
    const { user } = await assertAdmin();
    const existing = await getDbPost(slug);
    if (existing) {
      const res = await upsertDbPost({ ...existing, status });
      if (!res.ok) return { ok: false, error: res.error ?? "Couldn't save." };
    } else {
      const file = (await listFilePosts()).find((p) => p.slug === slug);
      if (!file) return { ok: false, error: "No post with that name." };
      const res = await upsertDbPost({
        slug,
        status,
        title: file.title,
        excerpt: file.excerpt,
        category: file.category,
        tags: file.tags,
        publishedAt: file.publishedAt,
        authorSlug: file.authorSlug,
        heroImage: file.heroImage,
        heroAlt: file.heroAlt,
        seoTitle: file.seoTitle ?? null,
        seoDescription: file.seoDescription ?? null,
        featured: Boolean(file.featured),
        content: file.content,
      });
      if (!res.ok) return { ok: false, error: res.error ?? "Couldn't save." };
    }
    revalidateBlog(slug);
    await logEvent({
      actor: user.email ?? "admin",
      action: "blog.post_saved",
      targetKind: "blog_post",
      targetId: slug,
      metadata: { event: "status", status },
    }).catch(() => {});
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown error" };
  }
}

/**
 * Throw away the database version. A file post with this slug goes back
 * to its committed words; a database-only post disappears completely.
 */
export async function discardBlogOverride(slug: string): Promise<Result> {
  try {
    const { user } = await assertAdmin();
    const res = await deleteDbPost(slug);
    if (!res.ok) return { ok: false, error: res.error ?? "Couldn't delete." };
    revalidateBlog(slug);
    await logEvent({
      actor: user.email ?? "admin",
      action: "blog.post_saved",
      targetKind: "blog_post",
      targetId: slug,
      metadata: { event: "discarded" },
    }).catch(() => {});
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown error" };
  }
}
