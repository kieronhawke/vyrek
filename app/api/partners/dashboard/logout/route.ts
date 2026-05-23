import { NextResponse } from "next/server";
import { clearPartnerSessionCookie } from "@/lib/partners/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const res = NextResponse.redirect(
    new URL("/partners/dashboard", url.origin),
    303,
  );
  return clearPartnerSessionCookie(res);
}
