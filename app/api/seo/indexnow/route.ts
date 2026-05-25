import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

/**
 * IndexNow ping (used by Bing, Yandex, Naver, Seznam, Google is also
 * piloting it). Bulk-submit up to 10,000 URLs in one POST.
 *
 * Pre-reqs:
 *  1. Put your key file at `/public/<INDEXNOW_KEY>.txt` containing the key
 *  2. Set INDEXNOW_KEY env var on Vercel
 *
 * Call as part of a post-deploy hook or whenever a new blog post lands:
 *   curl -X POST https://vyrek.com/api/seo/indexnow \
 *     -H 'Content-Type: application/json' \
 *     -d '{"urls":["https://vyrek.com/blog/your-new-post"]}'
 *
 * The endpoint also accepts a GET with no body and submits every blog
 * post + every static route, useful as a one-shot "refresh
 * everything" after a sitemap rebuild.
 */

const HOST = "vyrek.com";

function indexNowKey(): string | null {
  return process.env.INDEXNOW_KEY?.trim() || null;
}

/**
 * Bearer auth check. Either ADMIN bearer or CRON_SECRET. Without this,
 * the endpoint was a free SEO-quota burn target. Security audit H-6.
 * Comparisons are constant-time to defeat timing side-channels.
 */
function eqConstantTime(a: string, b: string): boolean {
  const buf1 = Buffer.from(a);
  const buf2 = Buffer.from(b);
  if (buf1.length !== buf2.length) return false;
  return timingSafeEqual(buf1, buf2);
}

function authorised(req: Request): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!bearer) return false;
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && eqConstantTime(bearer, cronSecret)) return true;
  const indexnowAdmin = process.env.INDEXNOW_ADMIN_TOKEN?.trim();
  if (indexnowAdmin && eqConstantTime(bearer, indexnowAdmin)) return true;
  return false;
}

async function submit(urls: string[]): Promise<{
  ok: boolean;
  submitted: number;
  status?: number;
  detail?: string;
}> {
  const key = indexNowKey();
  if (!key) {
    return {
      ok: false,
      submitted: 0,
      detail: "INDEXNOW_KEY not set",
    };
  }
  if (urls.length === 0) {
    return { ok: true, submitted: 0 };
  }
  const body = {
    host: HOST,
    key,
    keyLocation: `https://${HOST}/${key}.txt`,
    urlList: urls,
  };
  try {
    const res = await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, submitted: urls.length, status: res.status };
  } catch (err) {
    return {
      ok: false,
      submitted: 0,
      detail: err instanceof Error ? err.message : "fetch failed",
    };
  }
}

export async function POST(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ ok: false, error: "unauthorised" }, { status: 401 });
  }
  let body: { urls?: string[] };
  try {
    body = (await req.json()) as { urls?: string[] };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  if (!Array.isArray(body.urls) || body.urls.length === 0) {
    return NextResponse.json(
      { ok: false, error: "urls must be a non-empty array" },
      { status: 400 },
    );
  }
  const clean = body.urls
    .filter((u) => typeof u === "string")
    .filter((u) => u.startsWith(`https://${HOST}/`));
  const result = await submit(clean);
  return NextResponse.json(result);
}

/**
 * GET = re-submit every blog post + every primary route. Useful
 * after a content batch. Also requires authorisation.
 */
export async function GET(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ ok: false, error: "unauthorised" }, { status: 401 });
  }
  const { listPostMeta } = await import("@/lib/blog/posts");
  const posts = await listPostMeta();
  const urls = [
    `https://${HOST}/`,
    `https://${HOST}/blog`,
    `https://${HOST}/programmes`,
    `https://${HOST}/how-it-works`,
    `https://${HOST}/quiz`,
    ...posts.map((p) => `https://${HOST}/blog/${p.slug}`),
  ];
  const result = await submit(urls);
  return NextResponse.json(result);
}
