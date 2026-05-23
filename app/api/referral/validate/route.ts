import { NextResponse } from "next/server";

/**
 * Validates a referral code. Phase 1 demo: accepts any 8-char alphanumeric
 * code (regex check only, no DB lookup). Phase E swaps this for a real
 * Supabase lookup in the `customers.referral_code` column.
 *
 * Rate-limited at 10/min/IP per brief §27 (Upstash wiring lands in Phase E).
 */

const CODE_RE = /^[A-Z0-9]{8}$/;

export async function POST(req: Request) {
  let code = "";
  try {
    const body = (await req.json()) as { code?: string };
    code = (body.code ?? "").trim().toUpperCase();
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const valid = CODE_RE.test(code);
  return NextResponse.json({ valid });
}
