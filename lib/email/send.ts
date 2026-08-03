import { Resend } from "resend";
import { render } from "@react-email/components";
import { addDays } from "date-fns";
import { WelcomeEmail } from "@/lib/email/templates/welcome";
import { Day1Email } from "@/lib/email/templates/day-1";
import { Day3Email } from "@/lib/email/templates/day-3";
import { Day5Email } from "@/lib/email/templates/day-5";
import { Day6Email } from "@/lib/email/templates/day-6";
import { PaymentFailedEmail } from "@/lib/email/templates/payment-failed";
import { CancellationEmail } from "@/lib/email/templates/cancellation";
import { CLUB } from "@/lib/pricing";
import {
  OnboardingInviteEmail,
  onboardingInviteSubject,
} from "@/lib/email/templates/onboarding-invite";
import {
  LeadConfirmationEmail,
  leadConfirmationSubject,
  CallBookedEmail,
  callBookedSubject,
  CallReminderEmail,
  callReminderSubject,
  NoShowEmail,
  noShowSubject,
  ClientWelcomeEmail,
  clientWelcomeSubject,
} from "@/lib/email/templates/funnel-lead";
import {
  AbandonHourEmail,
  abandon1hSubject,
  AbandonDayTwoEmail,
  abandon2dSubject,
  AbandonDayFiveEmail,
  abandon5dSubject,
  PlanDeliveredEmail,
  planDeliveredSubject,
  NudgeDayTwoEmail,
  nudgeDay2Subject,
  NudgeDayFiveEmail,
  nudgeDay5Subject,
  NudgeDayTenEmail,
  nudgeDay10Subject,
} from "@/lib/email/templates/funnel-nurture";
import {
  ClubWelcomeEmail,
  clubWelcomeSubject,
  ClubDayThreeEmail,
  clubDay3Subject,
  ClubTrialEndingEmail,
  clubDay5Subject,
  ClubLapsedEmail,
  clubLapsedSubject,
  ClubUpgradeOfferEmail,
  clubUpgradeSubject,
  ClubWinbackEmail,
  clubWinbackSubject,
} from "@/lib/email/templates/funnel-club";
import {
  InternalLeadEmail,
  internalLeadSubject,
} from "@/lib/email/templates/internal-lead";

/**
 * Resend send helpers. All sends no-op (log + return ok=false) when
 * RESEND_API_KEY is not set, so callers (Stripe webhook, account/create)
 * don't have to special-case the unconfigured-Resend case.
 *
 * `from` address uses Resend's default verified sender (onboarding@resend.dev)
 * until we verify our own domain. Switch to hello@suthperformance.com once suthperformance.com
 * is verified in the Resend dashboard.
 */

const DEFAULT_FROM = "Suth Performance <onboarding@resend.dev>";

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
       
      console.info(
        "[email] RESEND_API_KEY not set, skipping send to",
        args.to,
        "·",
        args.subject,
      );
    }
    return { ok: false, reason: "RESEND_NOT_CONFIGURED" };
  }
  // Every email needs a text/plain alternative. Without one, spam filters
  // score the message worse, screen readers and watch previews have
  // nothing to fall back on, and a few clients show a blank message.
  // Generated from the same element so the two can never drift.
  let text: string | undefined;
  try {
    text = await render(args.react as React.ReactElement, { plainText: true });
  } catch {
    text = undefined;
  }

  try {
    const { data, error } = await c.emails.send({
      from: process.env.RESEND_FROM ?? DEFAULT_FROM,
      to: args.to,
      subject: args.subject,
      react: args.react,
      text,
      scheduledAt: args.scheduledAt
        ? args.scheduledAt.toISOString(): undefined,
    });
    if (error) {
       
      console.error("[email] resend send failed", error);
      return { ok: false, reason: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
     
    console.error("[email] resend send threw", err);
    return {
      ok: false,
      reason: err instanceof Error ? err.message: "unknown",
    };
  }
}

/**
 * The invite Ben sends when he adds a client.
 *
 * Goes through the same `send` as everything else, so it inherits the
 * plain-text alternative and the not-configured behaviour rather than
 * reimplementing them.
 */
export async function sendOnboardingInvite(args: {
  to: string;
  firstName: string;
  link: string;
  kind: "full" | "payment";
  planName?: string;
}): Promise<Result> {
  return send({
    to: args.to,
    subject: onboardingInviteSubject(args.firstName, args.kind),
    react: OnboardingInviteEmail({
      firstName: args.firstName,
      link: args.link,
      kind: args.kind,
      planName: args.planName,
    }),
  });
}

export async function sendWelcomeEmail(args: {
  to: string;
  trialEndsAt: Date | null;
  programmeName: string;
}): Promise<Result> {
  const firstWorkoutDate = addDays(new Date(), 0); // first session = today / next training day
  const immediate = send({
    to: args.to,
    subject: "You're in.",
    react: WelcomeEmail({
      trialEndsAt: args.trialEndsAt,
      firstWorkoutDate,
      programmeName: args.programmeName,
    }),
  });

  // Schedule the trial drip. Resend supports scheduledAt natively.
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
      subject: `Tomorrow: ${CLUB.monthlyDisplay}.`,
      react: Day6Email(),
      scheduledAt: new Date(now + 6 * 24 * 60 * 60 * 1000),
    },
  ];

  await Promise.all(
    drip.map((d) =>
      send({ to: args.to, ...d }).catch((err) => {
         
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
    subject: "Your Suth Performance membership is cancelled",
    react: CancellationEmail(),
  });
}


/* ─── Onboarding funnel ─────────────────────────────────────────────────
 *
 * One helper per scenario. Each is a thin wrapper so callers never have to
 * know a subject line or a template name, and so the whole lifecycle can be
 * re-pointed at a different provider in one file.
 *
 * All of these no-op safely without RESEND_API_KEY, and none of them throw:
 * a failed lifecycle email must never break the thing that triggered it.
 */

const DAY = 24 * 60 * 60 * 1000;

export function sendLeadConfirmation(args: {
  to: string;
  firstName: string;
  programme: string;
  hasPhone: boolean;
}): Promise<Result> {
  return send({
    to: args.to,
    subject: leadConfirmationSubject,
    react: LeadConfirmationEmail(args),
  });
}

export function sendInternalLeadBrief(args: {
  to: string;
  name: string;
  email: string;
  phone?: string | null;
  rail: string;
  wants: string;
  readiness?: string;
  goal?: string;
  programme?: string;
  injury?: string;
  sourcePath?: string | null;
  brief: string;
}): Promise<Result> {
  const { to, ...rest } = args;
  return send({
    to,
    subject: internalLeadSubject({
      name: rest.name,
      rail: rest.rail,
      readiness: rest.readiness,
    }),
    react: InternalLeadEmail(rest),
  });
}

export function sendCallBooked(args: {
  to: string;
  firstName: string;
  when: string;
  joinUrl?: string;
}): Promise<Result> {
  const { to, ...rest } = args;
  return send({
    to,
    subject: callBookedSubject(rest.when),
    react: CallBookedEmail(rest),
  });
}

/** Both reminders, scheduled up front so a cron isn't required. */
export async function scheduleCallReminders(args: {
  to: string;
  firstName: string;
  when: string;
  callAt: Date;
  joinUrl?: string;
}): Promise<Result[]> {
  const { to, callAt, ...rest } = args;
  return Promise.all(
    ([24, 1] as const).map((hoursBefore) =>
      send({
        to,
        subject: callReminderSubject(rest.when),
        react: CallReminderEmail({ ...rest, hoursBefore }),
        scheduledAt: new Date(callAt.getTime() - hoursBefore * 60 * 60 * 1000),
      }),
    ),
  );
}

export function sendNoShow(args: {
  to: string;
  firstName: string;
  rebookUrl: string;
}): Promise<Result> {
  const { to, ...rest } = args;
  return send({
    to,
    subject: noShowSubject,
    react: NoShowEmail(rest),
  });
}

export function sendClientWelcome(args: {
  to: string;
  firstName: string;
  startDate: string;
  programme: string;
}): Promise<Result> {
  const { to, ...rest } = args;
  return send({
    to,
    subject: clientWelcomeSubject,
    react: ClientWelcomeEmail(rest),
  });
}

/**
 * The abandonment sequence. Scheduled the moment the mid-quiz email is
 * captured, and the caller cancels it if they go on to finish.
 */
export async function scheduleAbandonSequence(args: {
  to: string;
  firstName?: string;
}): Promise<Result[]> {
  const now = Date.now();
  return Promise.all([
    send({
      to: args.to,
      subject: abandon1hSubject,
      react: AbandonHourEmail({ firstName: args.firstName }),
      scheduledAt: new Date(now + 60 * 60 * 1000),
    }),
    send({
      to: args.to,
      subject: abandon2dSubject,
      react: AbandonDayTwoEmail(),
      scheduledAt: new Date(now + 2 * DAY),
    }),
    send({
      to: args.to,
      subject: abandon5dSubject,
      react: AbandonDayFiveEmail(),
      scheduledAt: new Date(now + 5 * DAY),
    }),
  ]);
}

/** Plan delivery plus the day 2 / 5 / 10 nurture, scheduled up front. */
export async function sendPlanAndNurture(args: {
  to: string;
  firstName: string;
  programme: string;
  startDate: string;
  daysPerWeek: string;
  sessionLength: string;
}): Promise<Result[]> {
  const { to, ...rest } = args;
  const now = Date.now();
  return Promise.all([
    send({
      to,
      subject: planDeliveredSubject,
      react: PlanDeliveredEmail(rest),
    }),
    send({
      to,
      subject: nudgeDay2Subject,
      react: NudgeDayTwoEmail({ firstName: rest.firstName }),
      scheduledAt: new Date(now + 2 * DAY),
    }),
    send({
      to,
      subject: nudgeDay5Subject,
      react: NudgeDayFiveEmail({ firstName: rest.firstName }),
      scheduledAt: new Date(now + 5 * DAY),
    }),
    send({
      to,
      subject: nudgeDay10Subject,
      react: NudgeDayTenEmail(),
      scheduledAt: new Date(now + 10 * DAY),
    }),
  ]);
}

/** Club trial: welcome now, activation at day 3, the card ask at day 5. */
export async function sendClubTrialSequence(args: {
  to: string;
  firstName: string;
  programme: string;
  startDate: string;
  endsOn: string;
}): Promise<Result[]> {
  const { to, endsOn, ...rest } = args;
  const now = Date.now();
  return Promise.all([
    send({
      to,
      subject: clubWelcomeSubject,
      react: ClubWelcomeEmail(rest),
    }),
    send({
      to,
      subject: clubDay3Subject,
      react: ClubDayThreeEmail({ firstName: rest.firstName }),
      scheduledAt: new Date(now + 3 * DAY),
    }),
    send({
      to,
      subject: clubDay5Subject,
      react: ClubTrialEndingEmail({
        firstName: rest.firstName,
        monthlyDisplay: CLUB.monthlyDisplay,
        annualDisplay: CLUB.annualDisplay,
        endsOn,
      }),
      scheduledAt: new Date(now + 5 * DAY),
    }),
  ]);
}

export function sendClubLapsed(args: {
  to: string;
  firstName: string;
}): Promise<Result> {
  return send({
    to: args.to,
    subject: clubLapsedSubject,
    react: ClubLapsedEmail({ firstName: args.firstName }),
  });
}

export function sendClubUpgradeOffer(args: {
  to: string;
  firstName: string;
}): Promise<Result> {
  return send({
    to: args.to,
    subject: clubUpgradeSubject,
    react: ClubUpgradeOfferEmail({ firstName: args.firstName }),
  });
}

export function sendClubWinback(args: {
  to: string;
  firstName: string;
}): Promise<Result> {
  return send({
    to: args.to,
    subject: clubWinbackSubject,
    react: ClubWinbackEmail({ firstName: args.firstName }),
  });
}


/**
 * Escape hatch for the dev-only preview route: sends an already-built
 * element without a dedicated helper. Not exported anywhere user-facing.
 */
export function sendRawTest(args: {
  to: string;
  subject: string;
  react: React.ReactNode;
}): Promise<Result> {
  return send(args);
}
