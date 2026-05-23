import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { mintMagicToken } from "@/lib/partners/magic";
import { sendMagicLinkEmail, partnerMagicLinkUrl } from "@/lib/partners/emails";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid email." },
      { status: 400 },
    );
  }

  // Always return ok to avoid leaking which emails are partners. If the
  // email belongs to a partner, mint + send; otherwise pretend.
  try {
    const sb = supabaseAdmin();
    const { data: partner } = await sb
      .from("partners")
      .select("id, email, suspended_at")
      .eq("email", email)
      .maybeSingle();

    if (partner && !partner.suspended_at) {
      const { token } = mintMagicToken(partner.id);
      await sendMagicLinkEmail({
        to: partner.email,
        magicUrl: partnerMagicLinkUrl(token),
      });
    } else {
      console.info(
        `[partners/login] no-op for ${email} (partner=${!!partner}, suspended=${
          partner?.suspended_at ?? "n/a"
        })`,
      );
    }
  } catch (e) {
    console.error("[partners/login] threw", e);
    // Still respond ok to the client.
  }

  return NextResponse.json({ ok: true });
}
