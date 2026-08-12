import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";
import { BlogEditor } from "@/components/admin/blog-editor";
import { listFilePosts } from "@/lib/blog/posts";
import { getDbPost } from "@/lib/blog/store";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit post" };

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [row, files] = await Promise.all([getDbPost(slug), listFilePosts()]);
  const file = files.find((p) => p.slug === slug) ?? null;
  if (!row && !file) notFound();

  // The database version is what Ben last saved, so it wins; otherwise
  // the editor opens pre-filled from the file.
  const initial = row
    ? {
        slug: row.slug,
        status: row.status,
        title: row.title,
        excerpt: row.excerpt,
        category: row.category,
        tags: row.tags,
        publishedAt: row.publishedAt,
        authorSlug: row.authorSlug,
        heroImage: row.heroImage ?? "",
        heroAlt: row.heroAlt ?? "",
        seoTitle: row.seoTitle ?? "",
        seoDescription: row.seoDescription ?? "",
        featured: row.featured,
        content: row.content,
      }
    : {
        slug: file!.slug,
        status: "published" as const,
        title: file!.title,
        excerpt: file!.excerpt,
        category: file!.category,
        tags: file!.tags,
        publishedAt: file!.publishedAt,
        authorSlug: file!.authorSlug,
        heroImage: file!.heroImage,
        heroAlt: file!.heroAlt,
        seoTitle: file!.seoTitle ?? "",
        seoDescription: file!.seoDescription ?? "",
        featured: Boolean(file!.featured),
        content: file!.content,
      };

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title={initial.title || "Edit post"}
        description={`suthperformance.com/blog/${slug}`}
      />
      <BlogEditor
        initial={{
          ...initial,
          isNew: false,
          hasOverride: Boolean(row),
          isFilePost: Boolean(file),
        }}
      />
    </>
  );
}
