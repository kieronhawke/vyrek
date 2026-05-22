import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  determineProgramme,
  type RunnaQuizAnswers,
} from "@/lib/quiz-schema";

/**
 * Email gate endpoint (brief §10, Phase B2 §3.2 screen 15).
 *
 * Accepts: { email, uuid, answers, path? }
 *
 * 1. Upsert into `customers` keyed by email (preserving the quiz UUID).
 * 2. Insert into `quiz_responses` with the snapshot of answers + computed
 *    programme + entry path.
 * 3. Insert into `abandoned_plans` so the +1hr recovery email job can pick
 *    it up if checkout never completes.
 *
 * Returns the customer + quiz response IDs. On any database error, returns
 * 200 with a `persisted: false` flag — the client-side quiz V2 is happy to
 * proceed to the plan reveal regardless (best-effort capture), so we keep
 * the funnel moving rather than blocking on a flaky write.
 *
 * Rate limiting (5/min/IP per brief §27) lands when Upstash is wired up;
 * the IP-level limit is enforced upstream of this route in Phase E.
 */

type Body = {
  email?: string;
  uuid?: string;
  answers?: Partial<RunnaQuizAnswers> & { raceDate?: string | Date };
  path?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function generateReferralCode(): string {
  // 8-char alphanumeric, uppercase. Matches the /api/referral/validate regex.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // skip 0/O/1/I for legibility
  let out = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 8; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function normaliseAnswers(answers: Body["answers"]): RunnaQuizAnswers {
  const a = answers ?? {};
  return {
    intent: (a.intent ?? "first-hyrox") as RunnaQuizAnswers["intent"],
    bestTime: a.bestTime,
    raceDate:
      typeof a.raceDate === "string"
        ? new Date(a.raceDate)
        : (a.raceDate as Date | undefined),
    raceSuggestion: a.raceSuggestion,
    days: (a.days ?? 4) as RunnaQuizAnswers["days"],
    sessionLength: (a.sessionLength ??
      "60") as RunnaQuizAnswers["sessionLength"],
    location: (a.location ??
      "gym-standard") as RunnaQuizAnswers["location"],
    equipment: a.equipment,
    partner: (a.partner ?? "solo") as RunnaQuizAnswers["partner"],
    injuries: a.injuries ?? "none",
  };
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid-body" },
      { status: 400 },
    );
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const uuid = (body.uuid ?? "").trim();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, reason: "invalid-email" },
      { status: 400 },
    );
  }
  if (uuid && !UUID_RE.test(uuid)) {
    return NextResponse.json(
      { ok: false, reason: "invalid-uuid" },
      { status: 400 },
    );
  }

  const answers = normaliseAnswers(body.answers);
  const programme = determineProgramme(answers);
  const path = body.path ?? "quiz-v2";

  let persisted = true;
  let customerId: string | null = null;
  let quizResponseId: string | null = null;

  try {
    const sb = supabaseAdmin();

    // Insert-or-fetch the customer row. Schema requires `id` (UUID) — we use
    // the client-generated UUID when present so the row is stable across
    // resumed quiz sessions; otherwise mint a fresh one.
    const customerRow = {
      id: uuid || crypto.randomUUID(),
      email,
      referral_code: generateReferralCode(),
    };

    const { data: upserted, error: upsertErr } = await sb
      .from("customers")
      .upsert(customerRow, { onConflict: "email", ignoreDuplicates: false })
      .select("id")
      .single();

    if (upsertErr) throw upsertErr;
    customerId = upserted?.id ?? customerRow.id;

    // Snapshot the quiz answers + computed programme + entry path.
    const { data: qr, error: qrErr } = await sb
      .from("quiz_responses")
      .insert({
        customer_id: customerId,
        email,
        // raceDate is a Date — Supabase serialises to ISO string via JSON
        answers: {
          ...answers,
          raceDate: answers.raceDate?.toISOString() ?? null,
        },
        program: programme,
        path,
      })
      .select("id")
      .single();

    if (qrErr) throw qrErr;
    quizResponseId = qr?.id ?? null;

    // Queue the recovery email — `recovered_at` stays null until checkout
    // completes. A scheduled job at +1hr looks for null `recovered_at` rows.
    await sb.from("abandoned_plans").insert({
      email,
      quiz_uuid: customerId,
      program: programme,
    });
  } catch (err) {
    persisted = false;
    // Don't leak DB errors to the client; log on the server.
    console.error("[email-gate] persist failed", err);
  }

  return NextResponse.json({
    ok: true,
    persisted,
    programme,
    customerId,
    quizResponseId,
  });
}
