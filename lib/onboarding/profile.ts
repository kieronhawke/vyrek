import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Answers } from "@/lib/onboarding/model";

/**
 * The onboarding questionnaire, persisted so Ben actually has it. Keyed by
 * email to line up with the customer created at activation.
 *
 * Everything here is written server-side from a valid invite; the values still
 * get capped and shaped on the way in, because they came from a browser.
 */

export type StoredAnswers = Partial<
  Pick<
    Answers,
    | "dateOfBirth"
    | "goal"
    | "nextRace"
    | "raceDate"
    | "experience"
    | "trainingDays"
    | "currentTraining"
    | "injuries"
    | "injuryAreas"
    | "injuryDetails"
    | "conditions"
    | "availableDays"
    | "preferredTime"
    | "coachingStyle"
    | "accountability"
    | "checkIn"
    | "contactPreference"
    | "phone"
    | "plan"
  >
>;

export type OnboardingProfile = {
  email: string;
  name: string | null;
  answers: StoredAnswers;
  photoDataUrl: string | null;
  healthConsent: boolean;
  healthConsentAt: string | null;
  updatedAt: string;
};

/** A phone JPEG data URL is fine; multi-MB is abuse or a bug. */
const MAX_PHOTO_CHARS = 2_500_000; // ~1.8MB of base64

function str(v: unknown, max = 2000): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function strArr(v: unknown, maxItems = 40, maxLen = 80): string[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, maxItems).map((x) => str(x, maxLen)).filter(Boolean);
}

/** Keep the fields Ben reads, capped; drop anything unexpected. */
export function shapeAnswers(a: unknown): StoredAnswers {
  const o = (a ?? {}) as Record<string, unknown>;
  const days = typeof o.trainingDays === "number" ? o.trainingDays : null;
  // injuryDetails is a small per-area record; cap it hard.
  const injuryDetails: Answers["injuryDetails"] = {};
  if (o.injuryDetails && typeof o.injuryDetails === "object") {
    const entries = Object.entries(o.injuryDetails as Record<string, unknown>).slice(0, 12);
    for (const [k, v] of entries) {
      const d = (v ?? {}) as Record<string, unknown>;
      injuryDetails[str(k, 40)] = {
        recency: str(d.recency, 60),
        care: str(d.care, 60),
        triggers: strArr(d.triggers, 12, 80),
        note: str(d.note, 500),
      };
    }
  }
  return {
    dateOfBirth: str(o.dateOfBirth, 20),
    goal: str(o.goal, 500),
    nextRace: str(o.nextRace, 200),
    raceDate: str(o.raceDate, 20),
    experience: (["first", "some", "experienced", ""].includes(o.experience as string)
      ? o.experience
      : "") as Answers["experience"],
    trainingDays: days !== null && days >= 1 && days <= 7 ? days : null,
    currentTraining: str(o.currentTraining, 1000),
    injuries: str(o.injuries, 1000),
    injuryAreas: strArr(o.injuryAreas),
    injuryDetails,
    conditions: str(o.conditions, 1000),
    availableDays: strArr(o.availableDays, 7, 12),
    preferredTime: (["morning", "lunch", "evening", "varies", ""].includes(
      o.preferredTime as string,
    )
      ? o.preferredTime
      : "") as Answers["preferredTime"],
    coachingStyle: str(o.coachingStyle, 1000),
    accountability: str(o.accountability, 1000),
    checkIn: str(o.checkIn, 1000),
    contactPreference: str(o.contactPreference, 200),
    phone: str(o.phone, 32),
    plan: (o.plan ?? "") as Answers["plan"],
  };
}

/** Any health data present means the Article 9 notice applied. */
function hasHealthData(a: StoredAnswers): boolean {
  return Boolean(
    (a.injuryAreas && a.injuryAreas.length) ||
      (a.injuries && a.injuries.length) ||
      (a.conditions && a.conditions.length),
  );
}

export async function saveOnboardingProfile(input: {
  email: string;
  name?: string | null;
  inviteToken?: string | null;
  answers: unknown;
  photoDataUrl?: string | null;
  /** The client saw the "only Ben sees this" notice and proceeded. */
  healthConsent?: boolean;
}): Promise<boolean> {
  const email = input.email.trim().toLowerCase();
  if (!email) return false;
  const answers = shapeAnswers(input.answers);

  const photo =
    typeof input.photoDataUrl === "string" &&
    input.photoDataUrl.startsWith("data:image/") &&
    input.photoDataUrl.length <= MAX_PHOTO_CHARS
      ? input.photoDataUrl
      : null;

  const consent = Boolean(input.healthConsent) && hasHealthData(answers);

  try {
    const { error } = await supabaseAdmin()
      .from("onboarding_profiles")
      .upsert(
        {
          email,
          name: input.name?.trim() || null,
          invite_token: input.inviteToken ?? null,
          answers,
          photo_data_url: photo,
          health_consent: consent,
          health_consent_at: consent ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      );
    return !error;
  } catch {
    return false;
  }
}

export async function getOnboardingProfileByEmail(
  email: string,
): Promise<OnboardingProfile | null> {
  const key = email.trim().toLowerCase();
  if (!key) return null;
  try {
    const { data, error } = await supabaseAdmin()
      .from("onboarding_profiles")
      .select("email, name, answers, photo_data_url, health_consent, health_consent_at, updated_at")
      .eq("email", key)
      .maybeSingle();
    if (error || !data) return null;
    return {
      email: data.email as string,
      name: (data.name as string) ?? null,
      answers: (data.answers ?? {}) as StoredAnswers,
      photoDataUrl: (data.photo_data_url as string) ?? null,
      healthConsent: Boolean(data.health_consent),
      healthConsentAt: (data.health_consent_at as string) ?? null,
      updatedAt: data.updated_at as string,
    };
  } catch {
    return null;
  }
}
