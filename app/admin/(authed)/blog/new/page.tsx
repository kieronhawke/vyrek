import { PageHeader } from "@/components/admin/ui";
import { BlogEditor } from "@/components/admin/blog-editor";

export const dynamic = "force-dynamic";

export const metadata = { title: "Write a post" };

export default function NewBlogPostPage() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Write a post"
        description="Save as a draft while you work; nothing shows on the site until you publish."
      />
      <BlogEditor
        initial={{
          slug: "",
          status: "draft",
          title: "",
          excerpt: "",
          category: "training",
          tags: [],
          publishedAt: today,
          authorSlug: "suth-team",
          heroImage: "",
          heroAlt: "",
          seoTitle: "",
          seoDescription: "",
          featured: false,
          content: "",
          isNew: true,
          hasOverride: false,
          isFilePost: false,
        }}
      />
    </>
  );
}
