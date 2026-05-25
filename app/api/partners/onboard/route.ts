import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyOnboardingToken } from "@/lib/partners/tokens";
import { encryptPii, lastFour } from "@/lib/partners/crypto";
import { setPartnerSessionCookie } from "@/lib/partners/session";
import { logEvent } from "@/lib/admin/events";

export const runtime = "nodejs";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;
const RESERVED = new Set([
  "admin",
  "api",
  "apply",
  "dashboard",
  "login",
  "onboard",
  "p",
  "partners",
  "support",
  "vyrek",
]);

// ─── GET ?check=slug → availability ─────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url);
  const check = url.searchParams.get("check");
  if (!check) {
    return NextResponse.json(
      { ok: false, reason: "missing check param" },
      { status: 400 },
    );
  }
  const slug = check.trim().toLowerCase();
  if (!SLUG_RE.test(slug) || RESERVED.has(slug)) {
    return NextResponse.json({ available: false, reason: "invalid" });
  }
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("partners")
      .select("id")
      .eq("partner_code", slug)
      .maybeSingle();
    if (error) {
      console.error("[/api/partners/onboard?check] failed", error);
      return NextResponse.json({ available: false, reason: "lookup-failed" });
    }
    return NextResponse.json({ available: !data });
  } catch (e) {
    console.error("[/api/partners/onboard?check] threw", e);
    return NextResponse.json({ available: false, reason: "lookup-failed" });
  }
}

// ─── POST → finalise onboarding ─────────────────────────

type Body = {
  token?: string;
  partnerCode?: string;
  bankAccountName?: string;
  bankSortCode?: string;
  bankAccountNumber?: string;
  address?: string;
  vatNumber?: string | null;
  termsAccepted?: boolean;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const verified = verifyOnboardingToken(body.token ?? "");
  if (!verified.ok) {
    return NextResponse.json(
      { ok: false, error: `Invalid token: ${verified.reason}` },
      { status: 400 },
    );
  }
  const applicationId = verified.applicationId;

  const slug = (body.partnerCode ?? "").trim().toLowerCase();
  if (!SLUG_RE.test(slug) || RESERVED.has(slug)) {
    return NextResponse.json(
      { ok: false, error: "Invalid partner code." },
      { status: 400 },
    );
  }

  const required: Array<[keyof Body, string]> = [
    ["bankAccountName", "account name"],
    ["bankSortCode", "sort code"],
    ["bankAccountNumber", "account number"],
    ["address", "address"],
  ];
  for (const [key, label] of required) {
    const v = String(body[key] ?? "").trim();
    if (!v) {
      return NextResponse.json(
        { ok: false, error: `Missing ${label}.` },
        { status: 400 },
      );
    }
  }
  if (!body.termsAccepted) {
    return NextResponse.json(
      { ok: false, error: "Please accept the partner terms." },
      { status: 400 },
    );
  }

  try {
    const sb = supabaseAdmin();

    // Load application to copy email + name onto the partner row.
    const { data: app, error: appErr } = await sb
      .from("partner_applications")
      .select("id, email, name, status")
      .eq("id", applicationId)
      .maybeSingle();
    if (appErr) throw appErr;
    if (!app) {
      return NextResponse.json(
        { ok: false, error: "Application not found." },
        { status: 404 },
      );
    }
    if (app.status !== "approved") {
      return NextResponse.json(
        { ok: false, error: `Application is "${app.status}", not approved.` },
        { status: 409 },
      );
    }

    // Already onboarded?
    const { data: existing } = await sb
      .from("partners")
      .select("id")
      .eq("application_id", applicationId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Already onboarded. Open the dashboard." },
        { status: 409 },
      );
    }

    // Slug collision (race condition between GET ?check and POST).
    const { data: clash } = await sb
      .from("partners")
      .select("id")
      .eq("partner_code", slug)
      .maybeSingle();
    if (clash) {
      return NextResponse.json(
        { ok: false, error: "Partner code was just taken. Pick another." },
        { status: 409 },
      );
    }

    const acctName = body.bankAccountName!.trim();
    const sort = body.bankSortCode!.trim();
    const acctNumber = body.bankAccountNumber!.trim();

    const { data: inserted, error: insErr } = await sb
      .from("partners")
      .insert({
        application_id: applicationId,
        email: app.email,
        name: app.name,
        partner_code: slug,
        bank_account_name_encrypted: encryptPii(acctName),
        bank_sort_code_encrypted: encryptPii(sort),
        bank_account_number_encrypted: encryptPii(acctNumber),
        address: body.address!.trim(),
        vat_number: body.vatNumber ? String(body.vatNumber).trim() : null,
        tier: "starter",
        terms_accepted_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    // (No-op note: bank-account last4 lives only inside the encrypted blob;
    // we display it by re-deriving from the supplied value at onboarding
    // time client-side if needed. Logged once here for completeness.)
    void lastFour(acctNumber);

    await logEvent({
      actor: "system",
      action: "partner.onboarded",
      targetKind: "partner",
      targetId: inserted.id,
      metadata: { partnerCode: slug, applicationId },
    });

    // Sign them straight in so they land on a working dashboard.
    const res = NextResponse.json({ ok: true, partnerId: inserted.id });
    return setPartnerSessionCookie(res, inserted.id);
  } catch (e) {
    console.error("[/api/partners/onboard] failed", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
