import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { isConfigured } from "@/lib/member/connections";

/**
 * START AN OAUTH HANDSHAKE WITH A TRAINING PROVIDER.
 *
 * The Connections page has linked here since it was written, and this route
 * did not exist — so the one card that was supposed to work would have 404'd
 * the moment the Strava keys were added. The page even said "no other change
 * needed", which was not true.
 *
 * WHAT IT DOES
 * Builds the provider's authorise URL and redirects. It sets a signed-ish
 * random `state` in an httpOnly cookie and puts the same value on the URL,
 * which is the CSRF protection the OAuth spec asks for: a callback arriving
 * with a state that does not match the cookie did not start here.
 *
 * WHAT STILL HAS TO HAPPEN BEFORE THIS IS USEFUL
 * The callback has to exchange the code for tokens and store them against the
 * member — and there is nowhere to store them yet. That is the honest state
 * and the Connections page now says exactly that rather than implying keys
 * alone finish the job.
 */
export const runtime = "nodejs";

const AUTHORISE: Record<string, string> = {
  strava: "https://www.strava.com/oauth/authorize",
};

/** Read-only, and only the parts a coach needs. Nothing is written back. */
const SCOPES: Record<string, string> = {
  strava: "read,activity:read_all",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const authorise = AUTHORISE[provider];

  if (!authorise) {
    return NextResponse.json(
      { ok: false, error: "That provider cannot be connected from a browser." },
      { status: 404 },
    );
  }

  if (!isConfigured(provider)) {
    /* Keys missing. A redirect to a broken consent screen is worse than an
       honest refusal, because the athlete blames the app rather than the
       missing configuration. */
    return NextResponse.json(
      { ok: false, error: `${provider} is not configured yet.` },
      { status: 503 },
    );
  }

  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://www.suthperformance.com";
  const state = randomBytes(16).toString("hex");

  const url = new URL(authorise);
  url.searchParams.set("client_id", process.env.STRAVA_CLIENT_ID!);
  url.searchParams.set("redirect_uri", `${site}/api/member/connect/${provider}/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", SCOPES[provider] ?? "read");
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set(`oauth_state_${provider}`, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
