import { NextResponse } from "next/server";
import { coachAlertText, topicById } from "@/lib/member/coach-actions";
import { isReservedTestNumber, sendSms } from "@/lib/sms/send";

/**
 * An athlete asked something. Tell Ben.
 *
 * WHY A TEXT AND NOT AN EMAIL
 * Ben is a coach, not a support desk. He is on a gym floor most of the day and
 * his inbox is where things go to be read on Sunday. A question about a knee
 * that gets answered three days later is a question that did not need asking.
 *
 * WHAT IS AND IS NOT IN THE TEXT
 * The message says who asked, roughly what about, whether it is urgent, and
 * where to reply. It never carries the question itself — see
 * `coachAlertText`, which is tested for exactly that. Health information on a
 * lock screen is read by whoever is holding the phone.
 *
 * WHAT THIS DOES NOT DO YET
 * It does not persist the message. There is no messages table, so the thread
 * lives in the athlete's browser and this route's job is only the alert. When
 * the table exists this is where the write goes, before the send.
 */
export const runtime = "nodejs";

type Body = {
  firstName?: string;
  topic?: string;
  /** Present so the shape is right when there is somewhere to store it. */
  body?: string;
};

export async function POST(request: Request) {
  let payload: Body;
  try {
    payload = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  const firstName = (payload.firstName ?? "").trim().slice(0, 40) || "An athlete";
  const topic = topicById(payload.topic ?? "");

  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://www.suthperformance.com";

  const text = coachAlertText({
    firstName,
    topic: topic?.id ?? "plan",
    link: `${site}/admin/messaging`,
  });

  /* Same variable the booking notifications already use (lib/booking/notify),
     so there is one place Ben's number is configured rather than two that can
     disagree. */
  const to = process.env.BEN_MOBILE?.trim() || null;
  if (!to) {
    /* No number configured is not an error the athlete should see: their
       message is in the thread either way, and Ben reads it when he opens the
       app. Reporting "sent: false" keeps the UI honest without alarming them. */
    return NextResponse.json({ ok: true, alerted: false, reason: "no-number" });
  }

  const result = await sendSms({ to, body: text });

  return NextResponse.json({
    ok: true,
    alerted: result.ok,
    /* An Ofcom drama-range number is how this is exercised without texting a
       real person, and the UI should not claim a real send happened. */
    test: isReservedTestNumber(to),
    reason: result.ok ? null : "send-failed",
  });
}
