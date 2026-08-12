import type { ReactNode } from "react";
import {
  LOCATION_LABEL,
  PARTNER_LABEL,
  INJURY_LABEL,
  INJURY_RECENCY_LABEL,
  INJURY_CARE_LABEL,
  INJURY_TRIGGER_OPTIONS,
} from "@/lib/quiz-flow";
import {
  COACHING_STYLES,
  ACCOUNTABILITY_OPTIONS,
  CHECKIN_OPTIONS,
  CONTACT_OPTIONS,
  INJURY_AREAS,
} from "@/lib/onboarding/model";

/**
 * READS THE QUIZ / ONBOARDING ANSWERS BACK IN PLAIN ENGLISH.
 *
 * The answers blob comes from one of two funnels — the V3 quiz
 * (lib/quiz-flow.ts QuizAnswers) or the full onboarding flow
 * (lib/onboarding/model.ts Answers) — so every field here is looked up
 * defensively under both names and only rendered when present. Nothing is
 * invented: a missing field is simply left out.
 */

type Row = { label: string; value: ReactNode };

/* Value maps for the fields the shared libraries don't already label. */
const GOAL_LABEL: Record<string, string> = {
  "lose-weight": "Lose weight",
  "get-stronger": "Get stronger",
  "more-energy": "More energy",
  confidence: "Confidence back",
  "family-health": "Health for the family",
};

const EXPERIENCE_LABEL: Record<string, string> = {
  // Quiz V3
  never: "Never raced",
  "signed-up": "Signed up, not raced",
  "raced-few": "Raced a few",
  "raced-many": "Raced many",
  // Onboarding
  first: "First timer",
  some: "Some experience",
  experienced: "Experienced",
};

const STARTING_POINT_LABEL: Record<string, string> = {
  "years-off": "Years off training",
  "bit-active": "A bit active",
  "no-structure": "Training with no structure",
  "was-fit-once": "Was fit once",
};

const ACTIVITY_LABEL: Record<string, string> = {
  athletic: "Athletic",
  regular: "Trains regularly",
  occasional: "Occasionally active",
  returning: "Returning to training",
  beginner: "Beginner",
};

const SUPPORT_LABEL: Record<string, string> = {
  coached: "Wants coaching",
  self: "Prefers to self-guide",
  unsure: "Not sure yet",
};

const READINESS_LABEL: Record<string, string> = {
  "this-week": "Ready this week",
  "this-month": "Ready this month",
  "just-looking": "Just looking",
};

const SESSION_LENGTH_LABEL: Record<string, string> = {
  "30": "30 min",
  "45": "45 min",
  "60": "60 min",
  "90": "90 min or more",
};

function titleCase(v: string): string {
  return v
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** First present, non-empty value across a list of candidate keys. */
function pick(a: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    const v = a[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function asString(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number") return String(v);
  return null;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function label(map: Record<string, string>, v: unknown): string | null {
  const s = asString(v);
  if (!s) return null;
  return map[s] ?? titleCase(s);
}

function optionLabel(
  options: ReadonlyArray<{ key: string; label: string }>,
  v: unknown,
): string | null {
  const s = asString(v);
  if (!s) return null;
  return options.find((o) => o.key === s)?.label ?? titleCase(s);
}

function buildRows(a: Record<string, unknown>): Row[] {
  const rows: Row[] = [];
  const push = (rowLabel: string, value: string | null) => {
    if (value) rows.push({ label: rowLabel, value });
  };

  // Goal — quiz V3 stores a key, onboarding stores free text.
  const goal = pick(a, "goal");
  const goalStr = asString(goal);
  if (goalStr) push("Goal", GOAL_LABEL[goalStr] ?? goalStr);

  // Training days a week.
  push("Training days a week", asString(pick(a, "days", "trainingDays")));

  // Experience / where they are starting from.
  push("Experience", label(EXPERIENCE_LABEL, pick(a, "experience")));
  push("Starting point", label(STARTING_POINT_LABEL, pick(a, "startingPoint")));
  push("Current activity", label(ACTIVITY_LABEL, pick(a, "activity")));

  // Session length.
  push("Session length", label(SESSION_LENGTH_LABEL, pick(a, "sessionLength")));

  // Where they train + kit.
  push("Trains at", label(LOCATION_LABEL as Record<string, string>, pick(a, "location")));
  const equipment = asStringArray(pick(a, "equipment"));
  if (equipment.length > 0) {
    push("Equipment", equipment.map(titleCase).join(", "));
  }
  push("Partner", label(PARTNER_LABEL as Record<string, string>, pick(a, "partner")));

  // Injuries. Quiz V3 uses a single `injuries` key plus follow-up detail;
  // onboarding uses injuryAreas[] + injuryDetails{}.
  const injuriesSingle = asString(pick(a, "injuries"));
  const injuryAreas = asStringArray(pick(a, "injuryAreas"));
  if (injuriesSingle && injuriesSingle !== "none") {
    push("Injury", INJURY_LABEL[injuriesSingle as keyof typeof INJURY_LABEL] ?? titleCase(injuriesSingle));
    push("How it is now", label(INJURY_RECENCY_LABEL as Record<string, string>, pick(a, "injuryRecency")));
    push("Care", label(INJURY_CARE_LABEL as Record<string, string>, pick(a, "injuryCare")));
    const triggers = asStringArray(pick(a, "injuryTriggers"));
    if (triggers.length > 0) {
      const opts = INJURY_TRIGGER_OPTIONS[injuriesSingle as keyof typeof INJURY_TRIGGER_OPTIONS];
      push(
        "Sets it off",
        triggers
          .map((t) => opts?.find((o) => o.value === t)?.label ?? titleCase(t))
          .join(", "),
      );
    }
  } else if (injuryAreas.filter((k) => k !== "none").length > 0) {
    const flagged = injuryAreas.filter((k) => k !== "none");
    push(
      "Injuries",
      flagged
        .map((k) => INJURY_AREAS.find((i) => i.key === k)?.label ?? titleCase(k))
        .join(", "),
    );
    const details = a.injuryDetails;
    if (details && typeof details === "object") {
      const parts: string[] = [];
      for (const area of flagged) {
        const d = (details as Record<string, unknown>)[area];
        if (d && typeof d === "object") {
          const dd = d as Record<string, unknown>;
          const bits = [
            label(INJURY_RECENCY_LABEL as Record<string, string>, dd.recency),
            label(INJURY_CARE_LABEL as Record<string, string>, dd.care),
          ].filter(Boolean);
          if (bits.length > 0) {
            const areaLabel = INJURY_AREAS.find((i) => i.key === area)?.label ?? titleCase(area);
            parts.push(`${areaLabel}: ${bits.join(", ")}`);
          }
        }
      }
      if (parts.length > 0) push("Injury detail", parts.join(" · "));
    }
  } else if (injuriesSingle === "none" || injuryAreas.includes("none")) {
    push("Injuries", "None flagged");
  }

  // How they want to be coached.
  push("Support preference", label(SUPPORT_LABEL, pick(a, "supportPreference")));
  push("Readiness", label(READINESS_LABEL, pick(a, "readiness")));
  push("Coaching style", optionLabel(COACHING_STYLES, pick(a, "coachingStyle")));
  push("Accountability", optionLabel(ACCOUNTABILITY_OPTIONS, pick(a, "accountability")));
  push("Check-ins", optionLabel(CHECKIN_OPTIONS, pick(a, "checkIn")));
  push(
    "Contact preference",
    optionLabel(CONTACT_OPTIONS, pick(a, "contactPreference", "contactPreferred")),
  );

  return rows;
}

export function FitnessProfile({ answers }: { answers: unknown }) {
  const a =
    answers && typeof answers === "object" && !Array.isArray(answers)
      ? (answers as Record<string, unknown>)
      : {};
  const rows = buildRows(a);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-suth-text-tertiary">
        Nothing readable in this response yet. The raw answers are below.
      </p>
    );
  }

  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex justify-between gap-4 border-b border-suth-border-subtle pb-2 last:border-b-0"
        >
          <dt className="text-suth-text-tertiary">{r.label}</dt>
          <dd className="text-right font-medium text-suth-text">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
