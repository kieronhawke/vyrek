import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { limiters, requestIp } from "@/lib/rate-limit";

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
};

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

  try {
    const key = process.env.RESEND_API_KEY;
    if (key) {
      const resend = new Resend(key);
      // Until suthperformance.com is verified in Resend, the test sender
      // can only deliver to the account owner's address. Switch
      // CONSULTATION_INBOX to hello@suthperformance.com after verifying.
      const inbox =
        process.env.CONSULTATION_INBOX ?? "kieron.hawke@gmail.com";
      const { error } = await resend.emails.send({
        from:
          process.env.RESEND_FROM ??
          "Suth Performance <onboarding@resend.dev>",
        to: inbox,
        subject: `Free consultation request: ${lead.name} (${lead.goal})`,
        text: [
          `Name: ${lead.name}`,
          `Email: ${lead.email}`,
          `Phone: ${lead.phone ?? "not given"}`,
          `Goal: ${lead.goal}`,
          `Message: ${lead.message ?? "none"}`,
          `From page: ${lead.source_path ?? "unknown"}`,
        ].join("\n"),
      });
      if (!error) emailed = true;
      else console.error("[consultation] email failed", error);
    }
  } catch (e) {
    console.error("[consultation] resend threw", e);
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
