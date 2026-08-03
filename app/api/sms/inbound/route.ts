import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * WHEN SOMEBODY TEXTS BACK.
 *
 * Ben's clients will reply — "can't make Thursday", "calf's sore". Without
 * this the reply reaches Twilio and stops there, and he never knows they
 * tried. That is worse than not having SMS at all: they think they have told
 * him.
 *
 * THE SIGNATURE IS CHECKED, NOT ASSUMED. This URL is public and unauthenticated
 * by necessity — Twilio has to be able to reach it. Anyone who finds it could
 * otherwise post fabricated messages from any number. Twilio signs every
 * request with the account's auth token over the URL and the sorted body, and
 * a request that does not match is refused before it is read.
 *
 * IT ALWAYS RETURNS 200 WITH EMPTY TwiML once verified. Returning an error
 * makes Twilio retry, and a retry storm on a webhook that is failing for its
 * own reasons is how one bad message becomes thousands. An empty <Response/>
 * means "received, send nothing back".
 *
 * WHERE THE MESSAGE GOES. Logged for now, because there is no shared database
 * to put it in — the admin's message list lives in Ben's browser. This is the
 * honest half of the feature: the reply is received and recorded in the
 * platform logs rather than silently dropped, and one datastore credential
 * turns it into a row in his inbox.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Twilio's scheme: HMAC-SHA1 of the full URL with every POST parameter
 * appended in sorted key order, base64-encoded.
 */
function expectedSignature(url: string, params: Record<string, string>, token: string): string {
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((k) => k + params[k])
      .join("");
  return createHmac("sha1", token).update(Buffer.from(data, "utf-8")).digest("base64");
}

function signatureMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  // Length check first: timingSafeEqual throws on a mismatch, which would turn
  // a forged request into a 500 instead of a refusal.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) {
    // Nothing to verify against. Refusing is the only safe answer — accepting
    // unverified webhooks because we cannot check them is how the check gets
    // quietly disabled for ever.
    return new Response("Not configured", { status: 503 });
  }

  const raw = await request.text();
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(raw)) params[k] = v;

  const given = request.headers.get("x-twilio-signature") ?? "";
  /**
   * The URL Twilio signed, which is the public one. Behind Vercel's proxy
   * `request.url` can be the internal address, so the forwarded host wins when
   * it is present — otherwise every signature fails in production and nowhere
   * else.
   */
  const forwardedHost = request.headers.get("x-forwarded-host");
  const url = forwardedHost
    ? `https://${forwardedHost}${new URL(request.url).pathname}`
    : request.url;

  if (!signatureMatches(given, expectedSignature(url, params, token))) {
    return new Response("Bad signature", { status: 403 });
  }

  const from = params.From ?? "unknown";
  const body = (params.Body ?? "").trim();

  console.info("[sms/inbound]", JSON.stringify({ from, body, sid: params.MessageSid }));

  // Empty TwiML: received, nothing to send back. An auto-reply here would be
  // a message Ben did not write going to his client.
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
