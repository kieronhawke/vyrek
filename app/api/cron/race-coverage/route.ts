import { NextResponse } from "next/server";
import { HYROX_EVENTS } from "@/lib/hyrox-events";
import {
  milestoneFor,
  generateCoveragePost,
  postToMdx,
  type CoverageMilestone,
} from "@/lib/race-coverage";

/**
 * Daily cron — scans HYROX_EVENTS, generates templated race coverage posts
 * when an event hits a milestone (T-14, T-7, T-1, T+1, T+7).
 *
 * Vercel serverless functions have a read-only filesystem, so this route
 * **does not write files**. Instead it returns the generated MDX in the
 * JSON response. Two consumer paths:
 *
 *   1. **Manual review (default)** — an editor reads the response (via
 *      Vercel logs or a Slack webhook) and copy-pastes the MDX into a new
 *      file in `content/blog/`, then commits.
 *
 *   2. **GitHub commit** — if `GITHUB_TOKEN` + `GITHUB_REPO` env vars are
 *      set, the route uses the GitHub Contents API to commit the new MDX
 *      file directly to the main branch (or a draft branch if
 *      `VYREK_BOT_BRANCH` is set). This triggers a Vercel deploy.
 *
 *   3. **Slack notification** — if `SLACK_WEBHOOK_URL` is set, posts a
 *      summary to Slack so editors see what was generated.
 *
 * Authentication: requires `CRON_SECRET` env var to match the
 * `Authorization: Bearer <CRON_SECRET>` header Vercel Cron sends.
 *
 * Schedule: declared in `vercel.json` — daily at 06:00 UTC.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Generated = {
  event: string;
  milestone: CoverageMilestone;
  slug: string;
  path: string;
  /** Generated MDX file contents (frontmatter + body). */
  mdx: string;
  /** GitHub commit status if attempted. */
  github?: { ok: boolean; sha?: string; error?: string };
};

async function commitToGitHub(
  path: string,
  contents: string,
): Promise<{ ok: boolean; sha?: string; error?: string }> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // e.g. "kieronhawke/vyrek"
  const branch = process.env.VYREK_BOT_BRANCH ?? "main";
  if (!token || !repo) {
    return { ok: false, error: "GITHUB_TOKEN or GITHUB_REPO not set" };
  }
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
  const body = {
    message: `bot: race coverage — ${path.split("/").pop()}`,
    content: Buffer.from(contents, "utf8").toString("base64"),
    branch,
  };
  try {
    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `${res.status} ${errText.slice(0, 200)}` };
    }
    const data = (await res.json()) as { content?: { sha?: string } };
    return { ok: true, sha: data.content?.sha };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

async function notifySlack(generated: Generated[], todayLabel: string) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url || generated.length === 0) return;
  const lines = generated.map(
    (g) =>
      `• *${g.milestone}* · ${g.event} → \`content/blog/${g.slug}.mdx\`` +
      (g.github ? ` (GitHub: ${g.github.ok ? "✅" : "❌ " + g.github.error})` : ""),
  );
  const text = `*Vyrek race-coverage bot* (${todayLabel})\n${lines.join("\n")}`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    /* slack failures are non-fatal */
  }
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        error: "CRON_SECRET not configured — see docs/marketing-seo-strategy.md",
      },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorised" }, { status: 401 });
  }

  // Optional override for testing: ?date=2026-03-07 acts as "today".
  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const today = dateParam ? new Date(dateParam) : new Date();
  const todayLabel = today.toISOString().slice(0, 10);
  const autoCommit = process.env.VYREK_BOT_AUTOPUBLISH === "true";

  const generated: Generated[] = [];

  for (const event of HYROX_EVENTS) {
    const m = milestoneFor(event, today);
    if (!m) continue;
    const post = generateCoveragePost(event, m, today);
    const mdx = postToMdx(post);
    const filePath = `content/blog/${post.slug}.mdx`;

    const entry: Generated = {
      event: event.slug,
      milestone: m,
      slug: post.slug,
      path: filePath,
      mdx,
    };

    if (autoCommit) {
      entry.github = await commitToGitHub(filePath, mdx);
    }
    generated.push(entry);
  }

  await notifySlack(generated, todayLabel);

  return NextResponse.json({
    ok: true,
    today: todayLabel,
    autoCommit,
    eventsScanned: HYROX_EVENTS.length,
    generated: generated.map((g) => ({
      ...g,
      // Trim MDX in the response to avoid log spam; full content is in the
      // bot's GitHub commit (when enabled) and Slack notification.
      mdx: g.mdx.slice(0, 200) + "…",
    })),
  });
}
