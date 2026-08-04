import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin/auth";
import { loadQuizCopy, saveQuizCopy } from "@/lib/quiz-copy/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * READ AND WRITE THE QUIZ'S WORDS.
 *
 * Admin-only, and the gate is `assertAdmin` rather than a bearer token
 * because this is reached from a page Ben is already signed in to. Anything
 * written here is on the public quiz within seconds, so it gets the same
 * check the rest of mission control gets.
 */

export async function GET() {
  await assertAdmin();
  return NextResponse.json({ ok: true, copy: await loadQuizCopy() });
}

export async function PUT(request: Request) {
  const { user } = await assertAdmin();

  let body: { entries?: Record<string, string> };
  try {
    body = (await request.json()) as { entries?: Record<string, string> };
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  const entries = body.entries;
  if (!entries || typeof entries !== "object") {
    return NextResponse.json(
      { ok: false, error: "Nothing to save." },
      { status: 400 },
    );
  }

  const result = await saveQuizCopy(entries, user.email ?? "admin");
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
