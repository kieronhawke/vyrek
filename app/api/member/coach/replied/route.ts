import { NextResponse } from "next/server";
import { memberSms } from "@/lib/sms/messages";
import { isReservedTestNumber, sendSms } from "@/lib/sms/send";
import { looksLikeNumber, splitNumber } from "@/lib/member/dial-codes";

/**
 * BEN REPLIED. TELL THE ATHLETE.
 *
 * The other half of /api/member/coach/ask, and the half that makes the thread
 * worth having. An athlete asks something on Tuesday, Ben answers on
 * Wednesday, and without this they find out on Friday when they next happen
 * to open the app — by which point the answer is about a session they have
 * already done. The question loop is only as fast as its slowest hop, and
 * "waits until they open the app" is by far the slowest one.
 *
 * WHAT IT DOES NOT SEND
 * The reply. `memberSms.coachReplied` carries the fact and the link, never
 * the words, and the SMS tests assert it. These conversations are frequently
 * about an injury, and an answer about somebody's knee sitting on a lock
 * screen is read by whoever is holding the phone.
 *
 * WHERE THE LINK GOES
 * Straight into the thread. Not the dashboard, not a notifications list — the
 * conversation, open, at the message. A link that lands somewhere they then
 * have to navigate from is a link that half of them abandon.
 *
 * WHAT IS NOT WIRED YET, PLAINLY
 * ------------------------------
 * There is no messages table, so the thread lives in the athlete's browser
 * and Ben has no screen to reply from — /coach/messages is still a stub. This
 * route is the seam that screen will call, and it works today: post a number
 * and a name and the text sends through the real Twilio transport. What does
 * not exist yet is the caller, and no amount of code here creates one.
 *
 * It is deliberately not open to the public: without the shared secret it
 * refuses, because an endpoint that texts anybody on request is an endpoint
 * for texting strangers.
 */
export const runtime = "nodejs";

type Body = {
  /** The athlete's first name, for the greeting. */
  firstName?: string;
  /** E.164, as stored on the account. */
  phone?: string;
  /** Shared secret. See COACH_HOOK_SECRET. */
  secret?: string;
};

export async function POST(request: Request) {
  const expected = process.env.COACH_HOOK_SECRET?.trim();
  let payload: Body;
  try {
    payload = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  /*
   * No secret configured means the hook is closed, not open. The opposite
   * default — unset means unguarded — is how a text-anybody endpoint ends up
   * live on a Friday afternoon.
   */
  if (!expected || payload.secret !== expected) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
  }

  const firstName = (payload.firstName ?? "").trim().slice(0, 40) || "Hi";
  const phone = (payload.phone ?? "").trim();
  const { iso, rest } = splitNumber(phone);
  if (!looksLikeNumber(iso, rest)) {
    return NextResponse.json({ ok: false, error: "Bad number" }, { status: 400 });
  }

  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://www.suthperformance.com";

  const text = memberSms.coachReplied({
    firstName,
    /* Without the scheme. A bare host is shorter, and every phone links it
       anyway — and the segment budget is 160 characters. */
    link: `${site.replace(/^https?:\/\//, "")}/app/coach`,
  });

  const result = await sendSms({ to: phone, body: text });

  return NextResponse.json({
    ok: true,
    sent: result.ok,
    test: isReservedTestNumber(phone),
    reason: result.ok ? null : "send-failed",
  });
}
