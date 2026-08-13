import { Card } from "@/components/admin/ui";
import type { OnboardingProfile } from "@/lib/onboarding/profile";

/**
 * What the client told us during onboarding, so Ben opens week one knowing
 * their injuries, availability and how they want to be coached — instead of
 * writing blind. Renders nothing until they've onboarded.
 */

const DAY_LABEL: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const TIME_LABEL: Record<string, string> = {
  morning: "Mornings",
  lunch: "Lunchtimes",
  evening: "Evenings",
  varies: "Varies",
};

const EXPERIENCE_LABEL: Record<string, string> = {
  first: "First HYROX",
  some: "Some experience",
  experienced: "Experienced",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-suth-text">{children}</dd>
    </div>
  );
}

export function OnboardingProfileCard({
  profile,
}: {
  profile: OnboardingProfile;
}) {
  const a = profile.answers;
  const days = (a.availableDays ?? [])
    .map((d) => DAY_LABEL[d] ?? d)
    .join(", ");
  const injuryAreas = a.injuryAreas ?? [];
  const details = a.injuryDetails ?? {};

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
          Onboarding answers
        </p>
        {profile.updatedAt ? (
          <span className="font-mono text-[10px] text-suth-text-tertiary">
            {new Date(profile.updatedAt).toLocaleDateString("en-GB")}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-5 sm:flex-row">
        {profile.photoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.photoDataUrl}
            alt={`${profile.name ?? "Client"} onboarding photo`}
            className="h-28 w-28 flex-none rounded-xl object-cover"
          />
        ) : null}

        <dl className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
          {a.goal ? <Field label="Goal">{a.goal}</Field> : null}
          {a.experience && EXPERIENCE_LABEL[a.experience] ? (
            <Field label="Experience">{EXPERIENCE_LABEL[a.experience]}</Field>
          ) : null}
          {a.trainingDays ? (
            <Field label="Days a week">{a.trainingDays}</Field>
          ) : null}
          {days ? <Field label="Available days">{days}</Field> : null}
          {a.preferredTime && TIME_LABEL[a.preferredTime] ? (
            <Field label="Preferred time">{TIME_LABEL[a.preferredTime]}</Field>
          ) : null}
          {a.nextRace ? <Field label="Next race">{a.nextRace}</Field> : null}
          {a.currentTraining ? (
            <Field label="Current training">{a.currentTraining}</Field>
          ) : null}
          {a.coachingStyle ? (
            <Field label="Coaching style">{a.coachingStyle}</Field>
          ) : null}
          {a.accountability ? (
            <Field label="Accountability">{a.accountability}</Field>
          ) : null}
          {a.checkIn ? <Field label="Check-ins">{a.checkIn}</Field> : null}
          {a.contactPreference ? (
            <Field label="Best contact">{a.contactPreference}</Field>
          ) : null}
        </dl>
      </div>

      {(injuryAreas.length > 0 || a.injuries || a.conditions) ? (
        <div className="mt-5 border-t border-suth-border-subtle pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
            Health {profile.healthConsent ? "· consented" : ""}
          </p>
          {injuryAreas.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2">
              {injuryAreas.map((area) => {
                const d = details[area];
                const triggers = (d?.triggers ?? []).join(", ");
                const bits = [d?.recency, d?.care, triggers, d?.note]
                  .map((x) => (x ?? "").trim())
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={area} className="text-sm text-suth-text">
                    <span className="font-semibold">{area}</span>
                    {bits ? (
                      <span className="text-suth-text-secondary"> — {bits}</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
          {a.injuries ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-suth-text-secondary">
              {a.injuries}
            </p>
          ) : null}
          {a.conditions ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-suth-text-secondary">
              {a.conditions}
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
