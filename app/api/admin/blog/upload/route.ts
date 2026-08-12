import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Image uploads for the blog editor. Ben drags a photo in, it lands in
 * Supabase Storage, and the public URL comes back to go in the post.
 *
 * The bucket is created on first use rather than by a migration, because
 * storage buckets live outside the SQL schema and a missing bucket
 * should cost one retry, not a support call.
 */

const BUCKET = "blog-images";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export async function POST(req: Request) {
  await assertAdmin();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad upload" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json(
      { ok: false, error: "Use a JPG, PNG, WebP, AVIF or GIF image." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "That image is over 8MB. Export it smaller and try again." },
      { status: 400 },
    );
  }

  const sb = supabaseAdmin();
  const name = `${randomUUID().slice(0, 13)}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  let { error } = await sb.storage
    .from(BUCKET)
    .upload(name, bytes, { contentType: file.type, upsert: false });

  if (error && /bucket/i.test(error.message)) {
    // First image ever: make the bucket, then try once more.
    await sb.storage
      .createBucket(BUCKET, { public: true })
      .catch(() => undefined);
    ({ error } = await sb.storage
      .from(BUCKET)
      .upload(name, bytes, { contentType: file.type, upsert: false }));
  }
  if (error) {
    return NextResponse.json(
      { ok: false, error: `Upload failed: ${error.message}` },
      { status: 500 },
    );
  }

  const { data } = sb.storage.from(BUCKET).getPublicUrl(name);
  return NextResponse.json({ ok: true, url: data.publicUrl });
}
