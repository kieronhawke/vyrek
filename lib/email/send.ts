import { Resend } from "resend";
import { addDays } from "date-fns";
import { WelcomeEmail } from "@/lib/email/templates/welcome";
import { Day1Email } from "@/lib/email/templates/day-1";
import { Day3Email } from "@/lib/email/templates/day-3";
import { Day5Email } from "@/lib/email/templates/day-5";
import { Day6Email } from "@/lib/email/templates/day-6";
import { PaymentFailedEmail } from "@/lib/email/templates/payment-failed";
import { CancellationEmail } from "@/lib/email/templates/cancellation";

/**
 * Resend send helpers. All sends no-op (log + return ok=false) when
 * RESEND_API_KEY is not set, so callers (Stripe webhook, account/create)
 * don't have to special-case the unconfigured-Resend case.
 *
 * `from` address uses Resend's default verified sender (onboarding@resend.dev)
 * until we verify our own domain. Switch to hello@vyrek.com once vyrek.com
 * is verified in the Resend dashboard.
 */

const DEFAULT_FROM = "Vyrek <onboarding@resend.dev>";

let cachedClient: Resend | null = null;

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (cachedClient) return cachedClient;
  cachedClient = new Resend(key);
  return cachedClient;
}

type Result = { ok: true; id?: string } | { ok: false; reason: string };

async function send(args: {
  to: string;
  subject: string;
  react: React.ReactNode;
  scheduledAt?: Date;
}): Promise<Result> {
  const c = client();
  if (!c) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.info(
        "[email] RESEND_API_KEY not set — skipping send to",
        args.to,
        "·",
        args.subject,
      );
    }
    return { ok: false, reason: "RESEND_NOT_CONFIGURED" };
  }
  try {
    const { data, error } = await c.emails.send({
      from: process.env.RESEND_FROM ?? DEFAULT_FROM,
      to: args.to,
      subject: args.subject,
      react: args.react,
      scheduledAt: args.scheduledAt
        ? args.scheduledAt.toISOString()
        : undefined,
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[email] resend send failed", error);
      return { ok: false, reason: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[email] resend send threw", err);
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "unknown",
    };
  }
}

export async function sendWelcomeEmail(args: {
  to: string;
  trialEndsAt: Date | null;
  programmeName: string;
}): Promise<Result> {
  const firstWorkoutDate = addDays(new Date(), 0); // first session = today / next training day
  const immediate = send({
    to: args.to,
    subject: "You're in. Day 1 is ready.",
    react: WelcomeEmail({
      trialEndsAt: args.trialEndsAt,
      firstWorkoutDate,
      programmeName: args.programmeName,
    }),
  });

  // Schedule the trial drip — Resend supports scheduledAt natively.
  const now = Date.now();
  const drip = [
    {
      subject: "Day 1.",
      react: Day1Email({
        workoutTitle: "Your first session",
        durationMin: 60,
        intensity: "Race-specific",
      }),
      scheduledAt: new Date(now + 24 * 60 * 60 * 1000),
    },
    {
      subject: "Three days in.",
      react: Day3Email(),
      scheduledAt: new Date(now + 3 * 24 * 60 * 60 * 1000),
    },
    {
      subject: "Two days left.",
      react: Day5Email(),
      scheduledAt: new Date(now + 5 * 24 * 60 * 60 * 1000),
    },
    {
      subject: "Tomorrow: £4.99.",
      react: Day6Email(),
      scheduledAt: new Date(now + 6 * 24 * 60 * 60 * 1000),
    },
  ];

  await Promise.all(
    drip.map((d) =>
      send({ to: args.to, ...d }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[email] scheduled drip failed", d.subject, err);
      }),
    ),
  );

  return immediate;
}

export async function sendPaymentFailedEmail(args: {
  to: string;
  updatePaymentUrl?: string;
}): Promise<Result> {
  return send({
    to: args.to,
    subject: "Couldn't take this month's payment",
    react: PaymentFailedEmail({ updatePaymentUrl: args.updatePaymentUrl }),
  });
}

export async function sendCancellationEmail(args: {
  to: string;
}): Promise<Result> {
  return send({
    to: args.to,
    subject: "Your Vyrek membership is cancelled",
    react: CancellationEmail(),
  });
}
