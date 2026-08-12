import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * COACH MODE'S VIEW OF THE WORLD, FROM THE REAL TABLES.
 *
 * The spec's constraint holds: Ben sees people and plain English, never a
 * Stripe object or an MRR figure. So this layer boils the business tables
 * down to the two things he actually asks (spec/10 §5): how long is each
 * person programmed for, and is their money okay — plus enough contact
 * detail to message them in one tap.
 *
 * Everything is one round of queries, no per-client fan-out. Payment
 * state comes from the mirrored subscription status rather than live
 * Stripe: the coach list must load in gym wifi time, and past_due in the
 * mirror is exactly the same fact Stripe would report.
 */

export type CoachTone = "ok" | "warn" | "danger";

export type RealCoachClient = {
  customerId: string;
  name: string;
  email: string;
  phone: null;
  /** Subscription in plain words: "Paying" | "On trial" | "Payment failed" | "Ended" | "No subscription". */
  paymentLabel: string;
  paymentTone: CoachTone;
  subscriptionStatus: string | null;
  /** Days of programming left; negative = ran out; null = never sent a plan. */
  programmedDaysLeft: number | null;
  planLabel: string;
  planTone: CoachTone;
  latestPlanId: string | null;
  latestPlanStatus: "draft" | "sent" | null;
};

function paymentWords(status: string | null): { label: string; tone: CoachTone } {
  switch (status) {
    case "active":
      return { label: "Paying", tone: "ok" };
    case "trialing":
      return { label: "On trial", tone: "ok" };
    case "past_due":
      return { label: "Payment failed", tone: "danger" };
    case "paused":
      return { label: "Payments paused", tone: "warn" };
    case "canceled":
      return { label: "Ended", tone: "warn" };
    default:
      return { label: "No subscription", tone: "warn" };
  }
}

function planWords(daysLeft: number | null, latestStatus: "draft" | "sent" | null): {
  label: string;
  tone: CoachTone;
} {
  if (daysLeft === null) {
    return latestStatus === "draft"
      ? { label: "Draft not sent yet", tone: "warn" }
      : { label: "No plan sent yet", tone: "danger" };
  }
  if (daysLeft < 0) {
    return {
      label: `Ran out ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} ago`,
      tone: "danger",
    };
  }
  if (daysLeft === 0) return { label: "Runs out today", tone: "danger" };
  if (daysLeft <= 2) return { label: `${daysLeft} days left`, tone: "warn" };
  return { label: `${daysLeft} days left`, tone: "ok" };
}

export async function listRealCoachClients(): Promise<RealCoachClient[]> {
  const sb = supabaseAdmin();

  const [{ data: customers }, { data: subs }, { data: plans }] =
    await Promise.all([
      sb
        .from("customers")
        .select("id, email, full_name, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      sb
        .from("subscriptions")
        .select("customer_id, status, created_at")
        .order("created_at", { ascending: false })
        .limit(400),
      sb
        .from("training_plans")
        .select("id, customer_id, week_start, days, status, created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

  // Newest subscription per customer wins.
  const subByCustomer = new Map<string, string>();
  for (const s of (subs ?? []) as Array<{ customer_id: string; status: string }>) {
    if (!subByCustomer.has(s.customer_id)) subByCustomer.set(s.customer_id, s.status);
  }

  // Latest SENT plan drives days-left; the newest row of any status drives
  // "there's a draft waiting".
  const sentPlanEnd = new Map<string, number>();
  const latestPlan = new Map<string, { id: string; status: "draft" | "sent" }>();
  const todayMs = new Date().setHours(0, 0, 0, 0);
  for (const p of (plans ?? []) as Array<{
    id: string;
    customer_id: string;
    week_start: string;
    days: number;
    status: "draft" | "sent";
  }>) {
    if (!latestPlan.has(p.customer_id)) {
      latestPlan.set(p.customer_id, { id: p.id, status: p.status });
    }
    if (p.status === "sent") {
      const end =
        new Date(`${p.week_start}T00:00:00`).getTime() + p.days * 86400_000;
      const prev = sentPlanEnd.get(p.customer_id) ?? -Infinity;
      if (end > prev) sentPlanEnd.set(p.customer_id, end);
    }
  }

  return ((customers ?? []) as Array<{
    id: string;
    email: string;
    full_name: string | null;
  }>).map((c) => {
    const status = subByCustomer.get(c.id) ?? null;
    const pay = paymentWords(status);
    const endMs = sentPlanEnd.get(c.id);
    const daysLeft =
      endMs === undefined ? null : Math.floor((endMs - todayMs) / 86400_000);
    const latest = latestPlan.get(c.id) ?? null;
    const plan = planWords(daysLeft, latest?.status ?? null);
    return {
      customerId: c.id,
      name: c.full_name?.trim() || c.email.split("@")[0],
      email: c.email,
      phone: null,
      paymentLabel: pay.label,
      paymentTone: pay.tone,
      subscriptionStatus: status,
      programmedDaysLeft: daysLeft,
      planLabel: plan.label,
      planTone: plan.tone,
      latestPlanId: latest?.id ?? null,
      latestPlanStatus: latest?.status ?? null,
    };
  });
}

/** Who needs Ben first: no plan, then overdue, then soonest to run out. */
export function sortForCoachToday(clients: RealCoachClient[]): RealCoachClient[] {
  const rank = (c: RealCoachClient) =>
    c.programmedDaysLeft === null && c.latestPlanStatus !== "draft"
      ? -1000
      : (c.programmedDaysLeft ?? 999);
  return [...clients].sort((a, b) => rank(a) - rank(b));
}

export type TrainingPlanDay = { day: string; focus: string; detail: string };

export type TrainingPlan = {
  id: string;
  customerId: string;
  title: string;
  weekStart: string;
  days: number;
  content: TrainingPlanDay[];
  note: string | null;
  status: "draft" | "sent";
  sentAtISO: string | null;
};

function toPlan(r: {
  id: string;
  customer_id: string;
  title: string;
  week_start: string;
  days: number;
  content: unknown;
  note: string | null;
  status: string;
  sent_at: string | null;
}): TrainingPlan {
  return {
    id: r.id,
    customerId: r.customer_id,
    title: r.title,
    weekStart: r.week_start,
    days: r.days,
    content: Array.isArray(r.content)
      ? (r.content as TrainingPlanDay[]).map((d) => ({
          day: String(d.day ?? ""),
          focus: String(d.focus ?? ""),
          detail: String(d.detail ?? ""),
        }))
      : [],
    note: r.note,
    status: r.status === "sent" ? "sent" : "draft",
    sentAtISO: r.sent_at,
  };
}

export async function plansForCustomer(customerId: string): Promise<TrainingPlan[]> {
  const { data } = await supabaseAdmin()
    .from("training_plans")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(20);
  return ((data ?? []) as Parameters<typeof toPlan>[0][]).map(toPlan);
}

export async function getTrainingPlan(id: string): Promise<TrainingPlan | null> {
  const { data } = await supabaseAdmin()
    .from("training_plans")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ? toPlan(data as Parameters<typeof toPlan>[0]) : null;
}

/** The client's own view: their most recently sent plan, or nothing. */
export async function latestSentPlanFor(customerId: string): Promise<TrainingPlan | null> {
  const { data } = await supabaseAdmin()
    .from("training_plans")
    .select("*")
    .eq("customer_id", customerId)
    .eq("status", "sent")
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? toPlan(data as Parameters<typeof toPlan>[0]) : null;
}

export type ClientMessage = {
  id: string;
  customerId: string;
  channel: "email" | "sms";
  subject: string | null;
  body: string;
  createdISO: string;
};

export async function recentMessages(limit = 30): Promise<ClientMessage[]> {
  const { data } = await supabaseAdmin()
    .from("client_messages")
    .select("id, customer_id, channel, subject, body, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Array<{
    id: string;
    customer_id: string;
    channel: "email" | "sms";
    subject: string | null;
    body: string;
    created_at: string;
  }>).map((m) => ({
    id: m.id,
    customerId: m.customer_id,
    channel: m.channel,
    subject: m.subject,
    body: m.body,
    createdISO: m.created_at,
  }));
}
