import { ImageResponse } from "next/og";
import { getPost, CATEGORIES } from "@/lib/blog/posts";

/**
 * Dynamic OG image generator for blog posts. 1200×630, dark Vyrek palette,
 * accent eyebrow + bold headline + author/date footer. Used by every blog
 * page's `<meta property="og:image">` so X / LinkedIn / Slack / etc. show
 * a custom preview card for each post.
 */

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const post = await getPost(slug);

  const title = post?.title ?? "Vyrek Journal";
  const category = post
    ? (CATEGORIES[post.category]?.label ?? post.category)
    : "Hyrox training";
  const author = post?.author.name ?? "Vyrek Team";
  const dateLabel = post
    ? new Date(post.publishedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#0A0A0A",
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            color: "#A3E635",
            fontSize: 22,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          [ {category} · Vyrek Journal ]
        </div>

        <div
          style={{
            color: "#F5F5F3",
            fontSize: 64,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            display: "flex",
            maxWidth: 1000,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                color: "#A8A8A6",
                fontSize: 22,
                letterSpacing: "-0.005em",
              }}
            >
              {author}
            </div>
            {dateLabel ? (
              <div
                style={{
                  color: "#8A8A88",
                  fontSize: 18,
                  letterSpacing: "0.1em",
                }}
              >
                {dateLabel}
              </div>
            ) : null}
          </div>
          <div
            style={{
              color: "#F5F5F3",
              fontSize: 32,
              fontWeight: 900,
              letterSpacing: "0.04em",
            }}
          >
            VYREK
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
