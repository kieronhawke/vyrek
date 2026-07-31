import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { limiters, requestIp } from "@/lib/rate-limit";
import {
  sendInternalLeadBrief,
  sendLeadConfirmation,
} from "@/lib/email/send";

export const runtime = "nodejs";

/**
 * Free-consultation lead capture. Two delivery channels, best-effort:
 *
 *  1. Supabase insert into consultation_requests (shows in admin once the
 *     paused project is restored and the table migrated).
 *  2. Resend email to hello@suthperformance.com (delivers once the domain
 *     is verified in Resend; the test sender only reaches the account
 *     owner's inbox).
 *
 * Succeeds if EITHER channel works. If both fail the client shows the
 * direct-email fallback, so no lead silently vanishes.
 */

type Body = {
  name?: string;
  email?: string;
  phone?: string;
  goal?: string;
  message?: string;
  /** honeypot — real users never fill this */
  company?: string;
  /**
   * Structured context from the quiz. All optional: the /free-consultation
   * page posts without them and must keep working.
   */
  rail?: string;
  wants?: string;
  readiness?: string;
  programme?: string;
  injury?: string;
};

/** Trim and cap a free-text field coming from the client. */
function short(v: string | undefined, max = 80): string | undefined {
  const t = v?.trim();
  return t ? t.slice(0, max) : undefined;
}

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}$/;
const GOALS = [
  "get-fit",
  "lose-weight",
  "first-hyrox",
  "improve-hyrox-time",
  "elite-ambitions",
  "not-sure",
];

function validate(b: Body): string | null {
  if (b.company) return "Something went wrong."; // honeypot tripped
  if (!b.name || b.name.trim().length < 2) return "Please enter your name.";
  if (b.name.length > 120) return "Name is too long.";
  if (!b.email || b.email.length > 254 || !EMAIL_RE.test(b.email))
    return "Please enter a valid email.";
  if (b.phone && b.phone.length > 32) return "Phone number is too long.";
  if (!b.goal || !GOALS.includes(b.goal)) return "Please pick a goal.";
  if (b.message && b.message.length > 2000) return "Message is too long.";
  return null;
}

export async function POST(req: Request) {
  const ip = requestIp(req);
  const r = await limiters.consultation.limit(`ip:${ip}`);
  if (!r.success) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Try again in an hour." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  const invalid = validate(body);
  if (invalid) {
    return NextResponse.json({ ok: false, error: invalid }, { status: 400 });
  }

  const lead = {
    name: body.name!.trim(),
    email: body.email!.trim().toLowerCase(),
    phone: body.phone?.trim() || null,
    goal: body.goal!,
    message: body.message?.trim() || null,
    source_path: req.headers.get("referer") ?? null,
  };

  let stored = false;
  let emailed = false;

  try {
    const admin = supabaseAdmin();
    const { error } = await admin.from("consultation_requests").insert(lead);
    if (!error) stored = true;
    else console.error("[consultation] insert failed", error.message);
  } catch (e) {
    console.error("[consultation] supabase unreachable", e);
  }

  // Branded templates, not hand-rolled text. Both go through
  // lib/email/send.ts so the whole lifecycle shares one sender config.
  const inbox = process.env.CONSULTATION_INBOX ?? "kieron.hawke@gmail.com";
  const firstName = lead.name.split(" ")[0];

  const internal = await sendInternalLeadBrief({
    to: inbox,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    rail: short(body.rail) ?? "Direct enquiry",
    wants: short(body.wants) ?? "A free consultation",
    readiness: short(body.readiness),
    goal: lead.goal,
    programme: short(body.programme),
    injury: short(body.injury),
    sourcePath: lead.source_path,
    brief: lead.message ?? "No quiz answers: came from the consultation form.",
  });
  emailed = internal.ok;
  if (!internal.ok) {
    console.error("[consultation] internal brief failed", internal.reason);
  }

  // Confirmation to the lead. Strictly best-effort and deliberately after
  // the internal brief: the lead is captured either way, and this must
  // never be the reason a submission fails.
  //
  // NOTE: while RESEND_FROM is the shared `onboarding@resend.dev` test
  // sender, Resend only delivers to the account owner, so this fails for
  // real leads and logs below. It starts working the moment
  // suthperformance.com is verified, with no code change.
  try {
    const confirmation = await sendLeadConfirmation({
      to: lead.email,
      firstName,
      programme: short(body.programme) ?? "Your 12-week plan",
      hasPhone: Boolean(lead.phone),
    });
    if (!confirmation.ok) {
      console.error(
        "[consultation] lead confirmation failed",
        confirmation.reason,
      );
    }
  } catch (e) {
    console.error("[consultation] lead confirmation threw", e);
  }

  if (!stored && !emailed) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "We couldn't submit your request just now. Email us directly at hello@suthperformance.com and Ben will come back to you.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
