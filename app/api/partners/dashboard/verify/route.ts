import { NextResponse } from "next/server";
import { verifyMagicToken } from "@/lib/partners/magic";
import { setPartnerSessionCookie } from "@/lib/partners/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  if (!token) {
    return NextResponse.redirect(
      new URL("/partners/dashboard?err=missing", url.origin),
      302,
    );
  }
  const verified = verifyMagicToken(token);
  if (!verified.ok) {
    return NextResponse.redirect(
      new URL(
        `/partners/dashboard?err=${encodeURIComponent(verified.reason)}`,
        url.origin,
      ),
      302,
    );
  }
  const res = NextResponse.redirect(
    new URL("/partners/dashboard", url.origin),
    302,
  );
  return setPartnerSessionCookie(res, verified.partnerId);
}
