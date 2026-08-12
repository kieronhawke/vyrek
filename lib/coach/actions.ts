"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/admin/events";
import type { TrainingPlanDay } from "@/lib/coach/data";

/**
 * The write half of Coach Mode. Same discipline as every admin action:
 * re-check admin on entry, plain { ok, error? } out, and the client only
 * ever hears from us when Ben explicitly presses Send.
 */

type Result = { ok: true; id?: string } | { ok: false; error: string };

export type PlanInput = {
  id?: string;
  customerId: string;
  title: string;
  weekStart: string; // yyyy-mm-dd
  note: string;
  content: TrainingPlanDay[];
};

function cleanContent(content: TrainingPlanDay[]): TrainingPlanDay[] {
  return content
    .map((d) => ({
      day: String(d.day ?? "").slice(0, 20),
      focus: String(d.focus ?? "").slice(0, 200),
      detail: String(d.detail ?? "").slice(0, 4000),
    }))
    .slice(0, 14);
}

export async function saveTrainingPlan(input: PlanInput): Promise<Result> {
  try {
    await assertAdmin();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.weekStart)) {
      return { ok: false, error: "Pick the Monday the week starts." };
    }
    const content = cleanContent(input.content);
    if (!content.some((d) => d.detail.trim() || d.focus.trim())) {
      return { ok: false, error: "The plan is empty. Write at least one session." };
    }
    const sb = supabaseAdmin();
    const row = {
      customer_id: input.customerId,
      title: input.title.trim().slice(0, 200) || "This week's training",
      week_start: input.weekStart,
      days: 7,
      content,
      note: input.note.trim().slice(0, 2000) || null,
      updated_at: new Date().toISOString(),
    };
    if (input.id) {
      // Never edit a sent plan in place: what the client received must
      // stay what the record says they received.
      const { data: existing } = await sb
        .from("training_plans")
        .select("status")
        .eq("id", input.id)
        .maybeSingle();
      if (existing?.status === "sent") {
        return { ok: false, error: "That plan has already been sent. Write a new one." };
      }
      const { error } = await sb
        .from("training_plans")
        .update(row)
        .eq("id", input.id);
      if (error) return { ok: false, error: error.message };
      revalidateCoach(input.customerId);
      return { ok: true, id: input.id };
    }
    const { data, error } = await sb
      .from("training_plans")
      .insert(row)
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    revalidateCoach(input.customerId);
    return { ok: true, id: (data as { id: string }).id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown error" };
  }
}

export async function sendTrainingPlan(planId: string): Promise<Result> {
  try {
    const { user } = await assertAdmin();
    const sb = supabaseAdmin();
    const { data: plan } = await sb
      .from("training_plans")
      .select("*")
      .eq("id", planId)
      .maybeSingle();
    if (!plan) return { ok: false, error: "No plan with that id." };
    if (plan.status === "sent") return { ok: false, error: "Already sent." };

    const { data: customer } = await sb
      .from("customers")
      .select("id, email, full_name")
      .eq("id", plan.customer_id)
      .maybeSingle();
    if (!customer?.email) return { ok: false, error: "This client has no email on file." };

    // Mark sent FIRST: if the email hiccups the plan still shows in the
    // member app, which is the copy that matters. The email is a courier.
    const { error: updErr } = await sb
      .from("training_plans")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", planId);
    if (updErr) return { ok: false, error: updErr.message };

    const firstName =
      (customer.full_name as string | null)?.split(/\s+/)[0] ||
      customer.email.split("@")[0];
    try {
      const { send } = await import("@/lib/email/send");
      const { TrainingPlanEmail } = await import(
        "@/lib/email/templates/training-plan"
      );
      await send({
        to: customer.email,
        subject: plan.title?.trim() || "Your training for this week",
        react: TrainingPlanEmail({
          firstName,
          title: plan.title || "This week's training",
          note: plan.note ?? null,
          weekStart: plan.week_start,
          content: Array.isArray(plan.content) ? plan.content : [],
        }),
        replyTo: process.env.BEN_EMAIL ?? "ben@suthperformance.com",
      });
    } catch (e) {
      console.error("[coach] plan email failed", e);
    }

    await logEvent({
      actor: user.email ?? "coach",
      action: "customer.signed_up",
      targetKind: "customer",
      targetId: customer.id,
      metadata: { event: "training_plan_sent", planId, title: plan.title },
    }).catch(() => {});

    revalidateCoach(plan.customer_id);
    return { ok: true, id: planId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown error" };
  }
}

export async function sendClientMessage(input: {
  customerId: string;
  channel: "email" | "sms";
  subject?: string;
  body: string;
}): Promise<Result> {
  try {
    const { user } = await assertAdmin();
    const body = input.body.trim();
    if (!body) return { ok: false, error: "Write the message first." };
    const sb = supabaseAdmin();
    const { data: customer } = await sb
      .from("customers")
      .select("id, email, full_name")
      .eq("id", input.customerId)
      .maybeSingle();
    if (!customer) return { ok: false, error: "No client with that id." };

    if (input.channel === "email") {
      const { send } = await import("@/lib/email/send");
      const { CoachNoteEmail } = await import(
        "@/lib/email/templates/coach-note"
      );
      const firstName =
        (customer.full_name as string | null)?.split(/\s+/)[0] ||
        customer.email.split("@")[0];
      await send({
        to: customer.email,
        subject: input.subject?.trim() || `A note from Ben`,
        react: CoachNoteEmail({ firstName, body }),
        replyTo: process.env.BEN_EMAIL ?? "ben@suthperformance.com",
      });
    } else {
      return {
        ok: false,
        error: "Texts need the client's mobile on file — coming with phone numbers on customers.",
      };
    }

    await sb.from("client_messages").insert({
      customer_id: customer.id,
      channel: input.channel,
      subject: input.subject?.trim() || null,
      body,
      sent_by: user.email ?? "coach",
    });

    revalidatePath("/coach/messages");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown error" };
  }
}

function revalidateCoach(customerId: string) {
  revalidatePath("/coach");
  revalidatePath("/coach/plans");
  revalidatePath(`/coach/plans/${customerId}`);
  revalidatePath("/app/plan");
}
