import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * The database half of the blog.
 *
 * The MDX files under content/blog are the seed library: 120 posts,
 * versioned, reviewed, immutable per deploy. This table is what Ben
 * changes from the admin without a deploy. A row with the same slug as a
 * file wins; a row with a new slug is a new post; status decides whether
 * the public site sees it at all.
 *
 * Every reader degrades to "no overrides" rather than throwing, because
 * the blog rendering 120 file posts is always better than a 500.
 */

export type BlogPostStatus = "published" | "draft" | "hidden";

export type BlogPostRow = {
  slug: string;
  status: BlogPostStatus;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  publishedAt: string; // yyyy-mm-dd
  authorSlug: string;
  heroImage: string | null;
  heroAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  featured: boolean;
  content: string;
  updatedAtISO: string;
};

function dbConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
  );
}

type RawRow = {
  slug: string;
  status: string;
  title: string;
  excerpt: string;
  category: string;
  tags: unknown;
  published_at: string;
  author_slug: string;
  hero_image: string | null;
  hero_alt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  featured: boolean;
  content: string;
  updated_at: string;
};

function fromRaw(r: RawRow): BlogPostRow {
  return {
    slug: r.slug,
    status: (["published", "draft", "hidden"].includes(r.status)
      ? r.status
      : "draft") as BlogPostStatus,
    title: r.title,
    excerpt: r.excerpt,
    category: r.category,
    tags: Array.isArray(r.tags) ? (r.tags as string[]).map(String) : [],
    publishedAt: r.published_at,
    authorSlug: r.author_slug,
    heroImage: r.hero_image,
    heroAlt: r.hero_alt,
    seoTitle: r.seo_title,
    seoDescription: r.seo_description,
    featured: r.featured,
    content: r.content,
    updatedAtISO: r.updated_at,
  };
}

export async function listDbPosts(): Promise<BlogPostRow[]> {
  if (!dbConfigured()) return [];
  try {
    const { data, error } = await supabaseAdmin()
      .from("blog_posts")
      .select("*")
      .order("published_at", { ascending: false });
    if (error || !data) return [];
    return (data as RawRow[]).map(fromRaw);
  } catch {
    return [];
  }
}

export async function getDbPost(slug: string): Promise<BlogPostRow | null> {
  if (!dbConfigured()) return null;
  try {
    const { data, error } = await supabaseAdmin()
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    return fromRaw(data as RawRow);
  } catch {
    return null;
  }
}

export type UpsertBlogPost = Omit<BlogPostRow, "updatedAtISO">;

export async function upsertDbPost(
  post: UpsertBlogPost,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin()
      .from("blog_posts")
      .upsert({
        slug: post.slug,
        status: post.status,
        title: post.title,
        excerpt: post.excerpt,
        category: post.category,
        tags: post.tags,
        published_at: post.publishedAt,
        author_slug: post.authorSlug,
        hero_image: post.heroImage,
        hero_alt: post.heroAlt,
        seo_title: post.seoTitle,
        seo_description: post.seoDescription,
        featured: post.featured,
        content: post.content,
        updated_at: new Date().toISOString(),
      });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "save failed" };
  }
}

/** Remove the override entirely; a file post with this slug resurfaces. */
export async function deleteDbPost(
  slug: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin()
      .from("blog_posts")
      .delete()
      .eq("slug", slug);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "delete failed" };
  }
}
