import { Resend } from "resend";

/**
 * Thin Resend wrappers for partner programme transactional emails.
 * Falls back to a no-op log when RESEND_API_KEY isn't set so callers
 * don't have to special-case it.
 */

const DEFAULT_FROM = "Vyrek Partners <onboarding@resend.dev>";

let cached: Resend | null = null;
function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (cached) return cached;
  cached = new Resend(key);
  return cached;
}

function from(): string {
  return process.env.RESEND_FROM ?? DEFAULT_FROM;
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_URL?.replace(/^/, "https://") ??
    "https://vyrek.vercel.app"
  );
}

async function send(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const c = client();
  if (!c) {
    console.info(
      "[partners/emails] RESEND_API_KEY not set; would send",
      args.subject,
      "to",
      args.to,
    );
    return { ok: false, reason: "RESEND_NOT_CONFIGURED" };
  }
  try {
    const { error } = await c.emails.send({
      from: from(),
      to: args.to,
      subject: args.subject,
      html: args.html,
    });
    if (error) {
      console.error("[partners/emails] resend failed", error);
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.error("[partners/emails] resend threw", e);
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "unknown",
    };
  }
}

const BG = "#0a0a0a";
const TEXT = "#f5f5f5";
const DIM = "#a3a3a3";
const ACCENT = "#ff5a1f";
const SURFACE = "#1a1a1a";

function shell(inner: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:${BG};color:${TEXT};font-family:'Geist',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 24px;">
  <p style="font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${ACCENT};margin:0;">[ VYREK · PARTNERS ]</p>
  ${inner}
  <hr style="border:none;border-top:1px solid #262626;margin:32px 0;" />
  <p style="font-family:'Geist Mono',ui-monospace,monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:${DIM};margin:0;">[ VYREK · MADE IN UK ]</p>
</div>
</body></html>`;
}

// ─── Approval ───────────────────────────────────────────

export async function sendApprovalEmail(args: {
  to: string;
  name: string;
  onboardingUrl: string;
}) {
  const inner = `
    <h1 style="font-size:28px;font-weight:900;letter-spacing:-0.03em;line-height:1.1;margin:16px 0 8px;color:${TEXT};">You&rsquo;re in, ${escape(args.name)}.</h1>
    <p style="font-size:16px;line-height:1.6;color:${DIM};margin:0;">Your Vyrek Partner Programme application has been approved.</p>
    <p style="font-size:16px;line-height:1.6;color:${DIM};margin:16px 0 0;">Three minutes to finish setting up. Pick your partner code, add your payout details, and your dashboard goes live.</p>
    <div style="background:${SURFACE};border:1px solid #262626;border-radius:10px;padding:14px;margin-top:24px;">
      <p style="font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${DIM};margin:0;">Open your onboarding link</p>
      <p style="margin:8px 0 0;font-size:13px;word-break:break-all;"><a href="${args.onboardingUrl}" style="color:${ACCENT};text-decoration:underline;">${args.onboardingUrl}</a></p>
    </div>
    <div style="margin-top:24px;">
      <a href="${args.onboardingUrl}" style="display:inline-block;background:${ACCENT};color:#0a0a0a;font-weight:600;padding:14px 24px;border-radius:9999px;text-decoration:none;">Finish onboarding &rarr;</a>
    </div>
  `;
  return send({
    to: args.to,
    subject: "You're in. Welcome to the Vyrek Partner Programme.",
    html: shell(inner),
  });
}

// ─── Magic link sign-in ─────────────────────────────────

export async function sendMagicLinkEmail(args: {
  to: string;
  magicUrl: string;
}) {
  const inner = `
    <h1 style="font-size:28px;font-weight:900;letter-spacing:-0.03em;line-height:1.1;margin:16px 0 8px;color:${TEXT};">Sign in.</h1>
    <p style="font-size:16px;line-height:1.6;color:${DIM};margin:0;">One tap to open your Vyrek partner dashboard. The link expires in 15 minutes.</p>
    <div style="margin-top:24px;">
      <a href="${args.magicUrl}" style="display:inline-block;background:${ACCENT};color:#0a0a0a;font-weight:600;padding:14px 24px;border-radius:9999px;text-decoration:none;">Open dashboard &rarr;</a>
    </div>
    <p style="font-size:13px;line-height:1.6;color:${DIM};margin:24px 0 0;">If you didn&rsquo;t request this, ignore the email. Your dashboard stays locked.</p>
  `;
  return send({
    to: args.to,
    subject: "Your Vyrek partner dashboard link",
    html: shell(inner),
  });
}

// ─── Helpers ────────────────────────────────────────────

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function partnerOnboardingUrl(token: string): string {
  return `${siteUrl()}/partners/onboard?token=${encodeURIComponent(token)}`;
}

export function partnerMagicLinkUrl(token: string): string {
  return `${siteUrl()}/api/partners/dashboard/verify?t=${encodeURIComponent(token)}`;
}
