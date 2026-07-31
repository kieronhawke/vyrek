"use client";

import { useState } from "react";
import { capture } from "@/lib/posthog";
import { consultationGoal, leadBrief } from "@/lib/lead-brief";
import { sift } from "@/lib/quiz-sift";
import {
  INJURY_LABEL,
  isBeginnerRail,
  programmeLabel,
  type QuizAnswers,
} from "@/lib/quiz-flow";

const READINESS_LABEL: Record<string, string> = {
  "this-week": "Could start this week",
  "this-month": "Could start this month",
  "just-looking": "Just looking for now",
};

/**
 * Inline lead capture on the reveal, for the coached route.
 *
 * Replaces a plain link to /free-consultation, which asked the user to
 * retype their name, email and goal and threw away every quiz answer on
 * the way. Here the email is already known from the mid-flow capture, so
 * we ask for the two things we genuinely still need: what to call them,
 * and a number to ring.
 *
 * The whole quiz brief travels in the `message` field, so Ben opens the
 * email already knowing their goal, their history, their injuries and
 * which way they sifted.
 *
 * Delivery is the existing /api/consultation endpoint: Supabase insert
 * plus a Resend email, succeeding if either works. Today that email lands
 * in Kieron's inbox (CONSULTATION_INBOX), which is what he asked for while
 * the domain is unverified and Ben's number isn't wired up.
 */
export function ConsultationCapture({ answers }: { answers: QuizAnswers }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const email = answers.email ?? "";
  const canSend = name.trim().length >= 2 && state !== "sending";

  async function submit() {
    if (!canSend) return;
    setState("sending");
    setError(null);

    const result = sift(answers);
    try {
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email,
          phone: phone.trim() || undefined,
          goal: consultationGoal(answers),
          message: leadBrief(answers, result),
          // Structured context so Ben's brief leads with the useful bits
          // instead of making him parse the plain-text dump.
          rail: isBeginnerRail(answers) ? "Beginner" : "HYROX",
          wants:
            result.route === "coached"
              ? "COACHING WITH BEN"
              : "Self-serve, but asked for a call",
          readiness: answers.readiness
            ? READINESS_LABEL[answers.readiness]
            : undefined,
          programme: programmeLabel(answers) ?? undefined,
          injury:
            answers.injuries && answers.injuries !== "none"
              ? INJURY_LABEL[answers.injuries]
              : undefined,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(
          json.error ??
            "We couldn't send that just now. Email hello@suthperformance.com and Ben will come back to you.",
        );
        setState("error");
        return;
      }
      capture("quiz_lead_submitted", {
        route: result.route,
        explicit: result.explicit,
        has_phone: Boolean(phone.trim()),
      });
      setState("done");
    } catch {
      setError(
        "We couldn't send that just now. Email hello@suthperformance.com and Ben will come back to you.",
      );
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border border-suth-accent/40 bg-suth-accent/[0.06] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
          [ Sent ]
        </p>
        <p className="mt-2 text-base font-medium leading-snug text-suth-text">
          Thanks {name.trim().split(" ")[0]}. Ben has your plan and your
          answers, and he&apos;ll be in touch.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-suth-text-tertiary">
          Nothing else to do. Your plan is saved against {email}.
        </p>
      </div>
    );
  }

  return (
    <div
      id="lead-capture"
      className="scroll-mt-6 rounded-lg border border-suth-accent/40 bg-suth-accent/[0.06] p-5"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
        [ Your next step ]
      </p>
      <p className="mt-2 text-base font-medium leading-snug text-suth-text">
        Ben reads every plan personally before the call. Leave your number
        and he&apos;ll take you through yours.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-suth-text-tertiary">
            First name
          </span>
          <input
            id="lead-capture-name"
            type="text"
            autoComplete="given-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What should Ben call you?"
            className="h-12 w-full rounded-md border border-suth-border bg-suth-base px-4 text-base text-suth-text outline-none transition-colors placeholder:text-suth-text-tertiary/60 focus:border-suth-accent"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-suth-text-tertiary">
            Phone <span className="normal-case tracking-normal">(optional)</span>
          </span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="For the call itself"
            className="h-12 w-full rounded-md border border-suth-border bg-suth-base px-4 text-base text-suth-text outline-none transition-colors placeholder:text-suth-text-tertiary/60 focus:border-suth-accent"
          />
        </label>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-suth-accent">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={!canSend}
        className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-pill bg-suth-accent px-5 text-base font-semibold text-[#0A0A0A] transition-colors hover:bg-suth-accent-hover disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.99]"
      >
        {state === "sending" ? "Sending…" : "Send my plan to Ben →"}
      </button>

      <p className="mt-3 text-xs leading-relaxed text-suth-text-tertiary">
        Fifteen minutes, video or phone. No pitch. If coaching isn&apos;t
        right for you, Ben will say so.
      </p>
    </div>
  );
}
