import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { limiters, requestIp } from "@/lib/rate-limit";
import {
  cleanSessionContext,
  describeDuration,
  googleMapsUrl,
  requestLocation,
} from "@/lib/geo/request-location";
import { siteUrl } from "@/lib/site-url";
import { newLeadId, shortPlace, type Lead } from "@/lib/leads/model";
import { saveLead } from "@/lib/leads/store";
import { leadAlertSms } from "@/lib/leads/alert";
import { mapImagePath } from "@/lib/geo/static-map";
import { sendSms } from "@/lib/sms/send";
import { adminEmails, adminMobiles } from "@/lib/admin/recipients";
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
  /** How they got here, sent by the browser. Sanitised before use. */
  session?: unknown;
};

/** Trim and cap a free-text field coming from the client. */
function short(v: string | undefined, max = 80): string | undefined {
  const t = v?.trim();
  return t ? t.slice(0, max) : undefined;
}

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}$/;
/**
 * The values the form posts, and what they are called in front of a person.
 *
 * The slug was going straight into Ben's email and onto the lead page —
 * "GOAL: get-fit" — which is the form's internal vocabulary leaking into
 * the one place a human reads it.
 */
const GOAL_LABELS: Record<string, string> = {
  "get-fit": "Get fit",
  "lose-weight": "Lose weight",
  "first-hyrox": "First HYROX race",
  "improve-hyrox-time": "A faster HYROX time",
  "elite-ambitions": "Elite ambitions",
  "not-sure": "Not sure yet",
};
const GOALS = Object.keys(GOAL_LABELS);

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

  // City-level, off the Vercel edge headers. Null everywhere else, which
  // the template is written to handle.
  const loc = requestLocation(req);
  const session = cleanSessionContext(body.session);

  // Stored first, so the email and the text both have a link to point at.
  // A storage failure is survivable — the alerts still carry everything —
  // so the id is dropped rather than the enquiry.
  const record: Lead = {
    id: newLeadId(),
    createdISO: new Date().toISOString(),
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    invitedAtISO: null,
    rail: short(body.rail) ?? null,
    wants: short(body.wants) ?? "A free consultation",
    readiness: short(body.readiness) ?? null,
    goal: GOAL_LABELS[lead.goal] ?? lead.goal,
    programme: short(body.programme) ?? null,
    injury: short(body.injury) ?? null,
    brief: lead.message ?? "No quiz answers: came from the consultation form.",
    city: loc.city,
    region: loc.region,
    country: loc.country,
    latitude: loc.latitude,
    longitude: loc.longitude,
    landingPath: session.landingPath ?? null,
    referrer: session.referrer ?? null,
    secondsOnSite: session.secondsOnSite ?? null,
    pageViews: session.pageViews ?? null,
    sourcePath: lead.source_path,
  };
  const leadStored = await saveLead(record);
  // Server-side only, and worth having: when Ben says "the link in the text
  // 404s", this is the difference between diagnosing it and guessing. The
  // id is the capability, so it goes to the log and never to the browser.
  console.info(
    `[consultation] lead ${record.id} ${leadStored ? "stored" : "NOT STORED"} · ${lead.name}`,
  );
  const leadUrl = leadStored ? `${siteUrl()}/l/${record.id}` : null;
  const place = shortPlace(record);

  const briefArgs = {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    rail: short(body.rail) ?? "Direct enquiry",
    wants: short(body.wants) ?? "A free consultation",
    readiness: short(body.readiness),
    goal: GOAL_LABELS[lead.goal] ?? lead.goal,
    programme: short(body.programme),
    injury: short(body.injury),
    sourcePath: lead.source_path,
    brief: lead.message ?? "No quiz answers: came from the consultation form.",
    place,
    mapUrl: googleMapsUrl(loc),
    // Our own endpoint, composed from OSM tiles. The keyless third-party
    // static-map host does not resolve any more; see lib/geo/static-map.ts.
    mapImageUrl:
      loc.latitude !== null && loc.longitude !== null
        ? `${siteUrl()}${mapImagePath(loc.latitude, loc.longitude)}`
        : null,
    landingPath: session.landingPath ?? null,
    referrer: session.referrer ?? null,
    timeOnSite: describeDuration(session.secondsOnSite),
    pageViews: session.pageViews ?? null,
    leadUrl,
  };
  // Kieron gets the primary send (its result drives the response); Ben and
  // any other admins get their own copy, best-effort.
  const internal = await sendInternalLeadBrief({ to: inbox, ...briefArgs });
  void Promise.all(
    adminEmails()
      .filter((to) => to !== inbox)
      .map((to) =>
        sendInternalLeadBrief({ to, ...briefArgs }).catch((e) =>
          console.error("[consultation] admin brief copy failed", e),
        ),
      ),
  );

  // The text. Short on purpose — it fires on every enquiry and every
  // segment is billed, so it carries the four facts Ben needs to decide
  // whether to ring now and puts everything else one tap away. Sent to
  // every admin number (Kieron and Ben).
  if (leadUrl) {
    const smsBody = leadAlertSms(record, siteUrl());
    for (const to of adminMobiles()) {
      void sendSms({ to, body: smsBody, sender: "brand" }).then((r) => {
        if (!r.ok && r.reason !== "NOT_A_PHONE_NUMBER") {
          console.warn("[consultation] lead text failed", r.reason);
        }
      });
    }
  }
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

  /* THREE CHANNELS NOW, NOT TWO. The lead record in Redis is a real
     delivery channel: it is what the text message links to and what Ben
     opens on his phone, and it is currently the most reliable of the
     three, because the Supabase project this app points at has been
     deleted and every insert fails.

     Before this, an enquiry was rejected unless Supabase or Resend
     accepted it. With Supabase gone that made Resend a single point of
     failure for the entire funnel: one transient email error and a real
     person got "we couldn't submit your request" for a lead we had in
     fact captured. */
  if (!stored && !emailed && !leadStored) {
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
