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
const ACCENT = "#a3e635";
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

// ─── Rejection ──────────────────────────────────────────

export async function sendRejectionEmail(args: {
  to: string;
  name: string;
  reason?: string;
}) {
  const reasonBlock = args.reason
    ? `<div style="background:${SURFACE};border:1px solid #262626;border-radius:10px;padding:14px;margin-top:24px;">
        <p style="font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${DIM};margin:0;">Why</p>
        <p style="font-size:14px;line-height:1.6;color:${TEXT};margin:8px 0 0;">${escape(args.reason)}</p>
      </div>`
    : "";
  const inner = `
    <h1 style="font-size:28px;font-weight:900;letter-spacing:-0.03em;line-height:1.1;margin:16px 0 8px;color:${TEXT};">Not this round, ${escape(args.name)}.</h1>
    <p style="font-size:16px;line-height:1.6;color:${DIM};margin:0;">Thanks for applying to the Vyrek Partner Programme. We are not able to take your application forward at this time.</p>
    ${reasonBlock}
    <p style="font-size:16px;line-height:1.6;color:${DIM};margin:24px 0 0;">We review the partner roster every quarter. If your audience grows or your content shifts, please apply again. We genuinely consider every new application.</p>
    <p style="font-size:14px;line-height:1.6;color:${DIM};margin:16px 0 0;">If you have a question about this decision, reply directly to this email and we will respond within 4 hours, Monday to Friday.</p>
  `;
  return send({
    to: args.to,
    subject: "Update on your Vyrek Partner Programme application",
    html: shell(inner),
  });
}

// ─── Payout sent ────────────────────────────────────────

export async function sendPayoutSentEmail(args: {
  to: string;
  name: string;
  amountGbp: number;
  periodLabel: string;
  bacsReference: string;
  dashboardUrl: string;
}) {
  const amountStr = `£${args.amountGbp.toFixed(2)}`;
  const inner = `
    <h1 style="font-size:28px;font-weight:900;letter-spacing:-0.03em;line-height:1.1;margin:16px 0 8px;color:${TEXT};">Payout sent: ${amountStr}.</h1>
    <p style="font-size:16px;line-height:1.6;color:${DIM};margin:0;">Hi ${escape(args.name)}, your ${escape(args.periodLabel)} commission has been released by BACS today. It should land in your account within 1-3 business days.</p>
    <div style="background:${SURFACE};border:1px solid #262626;border-radius:10px;padding:14px;margin-top:24px;">
      <p style="font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${DIM};margin:0;">BACS reference</p>
      <p style="margin:8px 0 0;font-size:14px;font-family:'Geist Mono',ui-monospace,monospace;color:${ACCENT};word-break:break-all;">${escape(args.bacsReference)}</p>
    </div>
    <div style="margin-top:24px;">
      <a href="${args.dashboardUrl}" style="display:inline-block;background:${ACCENT};color:#0a0a0a;font-weight:600;padding:14px 24px;border-radius:9999px;text-decoration:none;">Open dashboard &rarr;</a>
    </div>
    <p style="font-size:13px;line-height:1.6;color:${DIM};margin:24px 0 0;">If the payment hasn't arrived by the end of the third business day, reply to this email and we will trace it with our bank.</p>
  `;
  return send({
    to: args.to,
    subject: `Vyrek partner payout: ${amountStr} sent today`,
    html: shell(inner),
  });
}

// ─── Monthly statement ──────────────────────────────────

export async function sendMonthlyStatementEmail(args: {
  to: string;
  name: string;
  monthLabel: string;
  newReferrals: number;
  activeReferrals: number;
  earnedGbp: number;
  pendingGbp: number;
  dashboardUrl: string;
}) {
  const inner = `
    <h1 style="font-size:28px;font-weight:900;letter-spacing:-0.03em;line-height:1.1;margin:16px 0 8px;color:${TEXT};">${escape(args.monthLabel)} statement.</h1>
    <p style="font-size:16px;line-height:1.6;color:${DIM};margin:0;">Hi ${escape(args.name)}, here is how the partner account performed last month.</p>
    <div style="background:${SURFACE};border:1px solid #262626;border-radius:10px;padding:18px;margin-top:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;color:${DIM};font-size:13px;">New referrals</td>
          <td style="padding:6px 0;text-align:right;color:${TEXT};font-weight:700;font-size:14px;font-family:'Geist Mono',ui-monospace,monospace;">${args.newReferrals}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:${DIM};font-size:13px;">Active referrals</td>
          <td style="padding:6px 0;text-align:right;color:${TEXT};font-weight:700;font-size:14px;font-family:'Geist Mono',ui-monospace,monospace;">${args.activeReferrals}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:${DIM};font-size:13px;">Earned this month</td>
          <td style="padding:6px 0;text-align:right;color:${ACCENT};font-weight:700;font-size:14px;font-family:'Geist Mono',ui-monospace,monospace;">£${args.earnedGbp.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:${DIM};font-size:13px;">Pending clearance</td>
          <td style="padding:6px 0;text-align:right;color:${TEXT};font-weight:700;font-size:14px;font-family:'Geist Mono',ui-monospace,monospace;">£${args.pendingGbp.toFixed(2)}</td>
        </tr>
      </table>
    </div>
    <div style="margin-top:24px;">
      <a href="${args.dashboardUrl}" style="display:inline-block;background:${ACCENT};color:#0a0a0a;font-weight:600;padding:14px 24px;border-radius:9999px;text-decoration:none;">View full breakdown &rarr;</a>
    </div>
    <p style="font-size:13px;line-height:1.6;color:${DIM};margin:24px 0 0;">Payouts land on the last working day of the month if your pending balance is at least £50.</p>
  `;
  return send({
    to: args.to,
    subject: `Vyrek partner statement: ${args.monthLabel}`,
    html: shell(inner),
  });
}

// ─── Tier upgrade ───────────────────────────────────────

export async function sendTierUpgradeEmail(args: {
  to: string;
  name: string;
  newTier: "Gold" | "Platinum";
  newCommissionPct: number;
  dashboardUrl: string;
}) {
  const inner = `
    <h1 style="font-size:28px;font-weight:900;letter-spacing:-0.03em;line-height:1.1;margin:16px 0 8px;color:${TEXT};">${escape(args.name)}, you&rsquo;ve hit ${args.newTier}.</h1>
    <p style="font-size:16px;line-height:1.6;color:${DIM};margin:0;">Your commission rate has stepped up to <strong style="color:${ACCENT}">${args.newCommissionPct}%</strong> on all new and renewing referrals from today.</p>
    <p style="font-size:16px;line-height:1.6;color:${DIM};margin:16px 0 0;">Existing pending referrals continue at the rate they were earned at; the new rate applies to anything that converts from now on.</p>
    <div style="margin-top:24px;">
      <a href="${args.dashboardUrl}" style="display:inline-block;background:${ACCENT};color:#0a0a0a;font-weight:600;padding:14px 24px;border-radius:9999px;text-decoration:none;">See the new rates &rarr;</a>
    </div>
  `;
  return send({
    to: args.to,
    subject: `Tier upgrade: you&rsquo;re now ${args.newTier}.`,
    html: shell(inner),
  });
}

// ─── Cancellation alert (early cancel within 7 days) ────

export async function sendCancellationAlertEmail(args: {
  to: string;
  name: string;
  referreeEmailMasked: string;
  daysSinceSignup: number;
  dashboardUrl: string;
}) {
  const inner = `
    <h1 style="font-size:28px;font-weight:900;letter-spacing:-0.03em;line-height:1.1;margin:16px 0 8px;color:${TEXT};">Heads up: a referral cancelled.</h1>
    <p style="font-size:16px;line-height:1.6;color:${DIM};margin:0;">Hi ${escape(args.name)}, ${escape(args.referreeEmailMasked)} cancelled after ${args.daysSinceSignup} day${args.daysSinceSignup === 1 ? "" : "s"}.</p>
    <p style="font-size:14px;line-height:1.6;color:${DIM};margin:16px 0 0;">Because the cancellation falls inside the 30-day clawback window, this referral has been moved to the &quot;clawed back&quot; state and will not contribute to your next payout. If the same referee returns and re-subscribes, the original attribution still applies and the commission resumes.</p>
    <p style="font-size:14px;line-height:1.6;color:${DIM};margin:16px 0 0;">This is informational. You don&rsquo;t need to do anything.</p>
    <div style="margin-top:24px;">
      <a href="${args.dashboardUrl}" style="display:inline-block;background:${ACCENT};color:#0a0a0a;font-weight:600;padding:14px 24px;border-radius:9999px;text-decoration:none;">Open dashboard &rarr;</a>
    </div>
  `;
  return send({
    to: args.to,
    subject: "A referral cancelled inside the clawback window",
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
