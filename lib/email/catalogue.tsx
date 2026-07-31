import type { ReactElement } from "react";
import {
  LeadConfirmationEmail,
  leadConfirmationSubject,
  CallBookedEmail,
  callBookedSubject,
  CallReminderEmail,
  callReminderSubject,
  NoShowEmail,
  noShowSubject,
  PostCallEmail,
  postCallSubject,
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
import {
  MagicLinkEmail,
  magicLinkSubject,
  PasswordResetEmail,
  passwordResetSubject,
  ReceiptEmail,
  receiptSubject,
  RenewalReminderEmail,
  renewalSubject,
  RefundEmail,
  refundSubject,
  ContactAckEmail,
  contactAckSubject,
} from "@/lib/email/templates/funnel-account";
import {
  PlanRebuiltEmail,
  planRebuiltSubject,
  MissedWeekEmail,
  missedWeekSubject,
  MilestoneEmail,
  milestoneSubject,
  RaceWeekEmail,
  raceWeekSubject,
  WeeklyEmail,
  ReferralEmail,
  referralSubject,
} from "@/lib/email/templates/funnel-engagement";
import { CLUB } from "@/lib/pricing";

/**
 * Every funnel email with realistic sample data, in the order a real person
 * would receive them.
 *
 * Drives the preview screen at /studio/emails and the render tests. Adding
 * a template without adding it here means nobody ever looks at it, so this
 * is deliberately the single registry.
 */

export type EmailSample = {
  id: string;
  audience: "Lead" | "Ben" | "Club member" | "Client" | "Any account";
  when: string;
  subject: string;
  element: ReactElement;
};

const NAME = "Jamie";
const BRIEF = `--- FROM THE QUIZ (beginner path) ---
Wants: COACHING WITH BEN
Readiness: Could start THIS WEEK
Plan: Weight loss

Goal: Lose weight
Starting from: Hasn't trained in years
History: Started and stopped several times
Gets in the way: doing it alone, time

Days a week: 3
Session length: 45 min
Trains at: Standard commercial gym
INJURY: Knee (bothering me now)`;

export const EMAIL_SAMPLES: EmailSample[] = [
  {
    id: "lead-confirmation",
    audience: "Lead",
    when: "Instantly, on finishing the quiz",
    subject: leadConfirmationSubject,
    element: (
      <LeadConfirmationEmail
        firstName={NAME}
        programme="Weight loss, 12 weeks"
        hasPhone
      />
    ),
  },
  {
    id: "internal-lead",
    audience: "Ben",
    when: "Instantly, same trigger",
    subject: internalLeadSubject({
      name: NAME,
      rail: "beginner",
      readiness: "this week",
    }),
    element: (
      <InternalLeadEmail
        name={NAME}
        email="jamie@example.com"
        phone="07700 900123"
        rail="Beginner"
        wants="COACHING WITH BEN"
        readiness="Could start this week"
        goal="Lose weight"
        programme="Weight loss, 12 weeks"
        injury="Knee, bothering them now"
        sourcePath="/personal-trainer/leeds"
        brief={BRIEF}
      />
    ),
  },
  {
    id: "call-booked",
    audience: "Lead",
    when: "A slot is agreed",
    subject: callBookedSubject("Thursday 6:30pm"),
    element: (
      <CallBookedEmail firstName={NAME} when="Thursday 6:30pm" joinUrl="#" />
    ),
  },
  {
    id: "call-reminder-24h",
    audience: "Lead",
    when: "24 hours before",
    subject: callReminderSubject("6:30pm"),
    element: (
      <CallReminderEmail
        firstName={NAME}
        when="tomorrow at 6:30pm"
        hoursBefore={24}
        joinUrl="#"
      />
    ),
  },
  {
    id: "call-reminder-1h",
    audience: "Lead",
    when: "1 hour before",
    subject: "Our call is in an hour",
    element: (
      <CallReminderEmail
        firstName={NAME}
        when="6:30pm"
        hoursBefore={1}
        joinUrl="#"
      />
    ),
  },
  {
    id: "no-show",
    audience: "Lead",
    when: "Same day as a missed call",
    subject: noShowSubject,
    element: <NoShowEmail firstName={NAME} rebookUrl="#" />,
  },
  {
    id: "post-call",
    audience: "Lead",
    when: "After a call that didn't close",
    subject: postCallSubject,
    element: (
      <PostCallEmail
        firstName={NAME}
        note="As we said, the knee is the thing to work around first, not train through. I'd start you at three days and build from there."
      />
    ),
  },
  {
    id: "client-welcome",
    audience: "Client",
    when: "They sign up for coaching",
    subject: clientWelcomeSubject,
    element: (
      <ClientWelcomeEmail
        firstName={NAME}
        startDate="Tuesday 4 August"
        programme="Weight loss, 12 weeks"
      />
    ),
  },
  {
    id: "abandon-1h",
    audience: "Lead",
    when: "1 hour after leaving the quiz",
    subject: abandon1hSubject,
    element: <AbandonHourEmail firstName={NAME} />,
  },
  {
    id: "abandon-2d",
    audience: "Lead",
    when: "Day 2 after leaving",
    subject: abandon2dSubject,
    element: <AbandonDayTwoEmail />,
  },
  {
    id: "abandon-5d",
    audience: "Lead",
    when: "Day 5, last touch",
    subject: abandon5dSubject,
    element: <AbandonDayFiveEmail />,
  },
  {
    id: "plan-delivered",
    audience: "Lead",
    when: "Finished the quiz, chose the club or nothing",
    subject: planDeliveredSubject,
    element: (
      <PlanDeliveredEmail
        firstName={NAME}
        programme="Weight loss, 12 weeks"
        startDate="Tuesday 4 August"
        daysPerWeek="3 days a week"
        sessionLength="45 minutes"
      />
    ),
  },
  {
    id: "nudge-d2",
    audience: "Lead",
    when: "Day 2, no action",
    subject: nudgeDay2Subject,
    element: <NudgeDayTwoEmail firstName={NAME} />,
  },
  {
    id: "nudge-d5",
    audience: "Lead",
    when: "Day 5, the call offer",
    subject: nudgeDay5Subject,
    element: <NudgeDayFiveEmail firstName={NAME} />,
  },
  {
    id: "nudge-d10",
    audience: "Lead",
    when: "Day 10, final",
    subject: nudgeDay10Subject,
    element: <NudgeDayTenEmail />,
  },
  {
    id: "club-welcome",
    audience: "Club member",
    when: "Trial starts",
    subject: clubWelcomeSubject,
    element: (
      <ClubWelcomeEmail
        firstName={NAME}
        programme="Weight loss, 12 weeks"
        startDate="Tuesday 4 August"
      />
    ),
  },
  {
    id: "club-d3",
    audience: "Club member",
    when: "Day 3 of the trial",
    subject: clubDay3Subject,
    element: <ClubDayThreeEmail firstName={NAME} />,
  },
  {
    id: "club-d5",
    audience: "Club member",
    when: "Day 5, the card ask",
    subject: clubDay5Subject,
    element: (
      <ClubTrialEndingEmail
        firstName={NAME}
        monthlyDisplay={CLUB.monthlyDisplay}
        annualDisplay={CLUB.annualDisplay}
        endsOn="Tuesday"
      />
    ),
  },
  {
    id: "club-lapsed",
    audience: "Club member",
    when: "Trial ended, no card added",
    subject: clubLapsedSubject,
    element: <ClubLapsedEmail firstName={NAME} />,
  },
  {
    id: "club-upgrade",
    audience: "Club member",
    when: "Day 30, the one coaching offer",
    subject: clubUpgradeSubject,
    element: <ClubUpgradeOfferEmail firstName={NAME} />,
  },
  {
    id: "club-winback",
    audience: "Club member",
    when: "90 days after cancelling",
    subject: clubWinbackSubject,
    element: <ClubWinbackEmail firstName={NAME} />,
  },
  {
    id: "plan-rebuilt",
    audience: "Client",
    when: "Every Sunday",
    subject: planRebuiltSubject,
    element: (
      <PlanRebuiltEmail
        firstName={NAME}
        weekNumber={4}
        sessionsLogged={2}
        sessionsPlanned={3}
        changeNote="Backed off the running, kept the strength"
      />
    ),
  },
  {
    id: "missed-week",
    audience: "Client",
    when: "Nothing logged for 7 days",
    subject: missedWeekSubject,
    element: <MissedWeekEmail firstName={NAME} />,
  },
  {
    id: "milestone",
    audience: "Client",
    when: "Every 25 logged sessions",
    subject: milestoneSubject(25),
    element: <MilestoneEmail firstName={NAME} sessions={25} />,
  },
  {
    id: "race-week",
    audience: "Client",
    when: "Monday of race week",
    subject: raceWeekSubject,
    element: (
      <RaceWeekEmail
        firstName={NAME}
        raceName="HYROX Manchester"
        raceDate="Saturday 18 October"
      />
    ),
  },
  {
    id: "weekly",
    audience: "Any account",
    when: "Weekly, written by Ben",
    subject: "Never miss twice",
    element: (
      <WeeklyEmail
        headline="Never miss twice"
        idea="The people who last are not the ones who never miss a session. They are the ones who never miss two in a row. One missed session is weather. Two is a forecast."
        session="30 min easy run, then 3 rounds: 10 wall balls, 20 lunges, 200m row"
        nudge="If you missed one this week, the only thing that matters is the next one."
      />
    ),
  },
  {
    id: "referral",
    audience: "Club member",
    when: "Month 2, and after a milestone",
    subject: referralSubject,
    element: <ReferralEmail firstName={NAME} code="JAMIE-7K2P" />,
  },
  {
    id: "magic-link",
    audience: "Any account",
    when: "Signing in",
    subject: magicLinkSubject,
    element: <MagicLinkEmail linkUrl="https://suthperformance.com/auth#token" />,
  },
  {
    id: "password-reset",
    audience: "Any account",
    when: "Forgot password",
    subject: passwordResetSubject,
    element: (
      <PasswordResetEmail linkUrl="https://suthperformance.com/auth#reset" />
    ),
  },
  {
    id: "receipt",
    audience: "Club member",
    when: "Every successful payment",
    subject: receiptSubject,
    element: (
      <ReceiptEmail
        firstName={NAME}
        amount={`${CLUB.monthlyDisplay}`}
        period="August 2026"
        paidOn="1 August 2026"
        last4="4242"
        invoiceUrl="https://suthperformance.com/account"
      />
    ),
  },
  {
    id: "renewal",
    audience: "Club member",
    when: "7 days before an annual renewal",
    subject: renewalSubject,
    element: (
      <RenewalReminderEmail
        firstName={NAME}
        amount={CLUB.annualDisplay}
        renewsOn="1 September"
      />
    ),
  },
  {
    id: "refund",
    audience: "Club member",
    when: "A refund is issued",
    subject: refundSubject,
    element: <RefundEmail firstName={NAME} amount={CLUB.monthlyDisplay} />,
  },
  {
    id: "contact-ack",
    audience: "Any account",
    when: "Contact form submitted",
    subject: contactAckSubject,
    element: <ContactAckEmail firstName={NAME} />,
  },
];
