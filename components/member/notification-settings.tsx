"use client";

import { useHydrated } from "@/hooks/use-hydrated";
import { useRecord } from "@/lib/control/store";

/**
 * NOTIFICATION PREFERENCES THAT CAN ACTUALLY BE CHANGED.
 *
 * These were four rows of static text reading "On", "On", "On", "Off" — a
 * settings screen that displayed settings and let you change none of them.
 * Worse than a missing feature, because it looks like one that works.
 *
 * WHY THE LAST ONE IS DIFFERENT
 * -----------------------------
 * The first three are service messages about training somebody is paying for.
 * The last is marketing, and under PECR that needs consent rather than an
 * opt-out — so it starts off, and it is the only one that does. Grouping it
 * with the others under one heading would imply they are the same kind of
 * thing, and legally they are not.
 *
 * Saved on the device for now, like the rest of the account. The switches are
 * real; where they are stored changes when there is a database.
 */

export type NotificationPrefs = {
  sessionReminders: boolean;
  planReady: boolean;
  weeklyEmail: boolean;
  marketing: boolean;
};

export const NOTIFICATIONS_KEY = "member.notifications.v1";

const DEFAULTS: NotificationPrefs = {
  sessionReminders: true,
  planReady: true,
  weeklyEmail: true,
  // Opt-in, deliberately. See the note above.
  marketing: false,
};

type Row = {
  key: keyof NotificationPrefs;
  label: string;
  hint: string;
};

const SERVICE: Row[] = [
  {
    key: "sessionReminders",
    label: "Session reminders",
    hint: "A nudge on the morning of a session you have not ticked off.",
  },
  {
    key: "planReady",
    label: "Plan ready each Sunday",
    hint: "When Ben publishes the week ahead.",
  },
  {
    key: "weeklyEmail",
    label: "Ben's weekly email",
    hint: "What he noticed across everyone's training that week.",
  },
];

const MARKETING: Row = {
  key: "marketing",
  label: "Offers and news",
  hint: "Occasional emails about what else Suth Performance is doing.",
};

export function NotificationSettings() {
  const { value, save } = useRecord<NotificationPrefs>(NOTIFICATIONS_KEY, DEFAULTS);
  const mounted = useHydrated();
  const prefs = { ...DEFAULTS, ...value };

  const toggle = (key: keyof NotificationPrefs) =>
    save({ ...prefs, [key]: !prefs[key] });

  return (
    <div className="notif">
      <div className="notif__group">
        {SERVICE.map((row) => (
          <Switch
            key={row.key}
            row={row}
            on={prefs[row.key]}
            ready={mounted}
            onToggle={() => toggle(row.key)}
          />
        ))}
      </div>

      <div className="notif__group">
        <Switch
          row={MARKETING}
          on={prefs.marketing}
          ready={mounted}
          onToggle={() => toggle("marketing")}
        />
      </div>

      <p className="notif__note">
        Reminders start sending once email and SMS are connected. Your choices
        are saved on this device until then.
      </p>
    </div>
  );
}

function Switch({
  row,
  on,
  ready,
  onToggle,
}: {
  row: Row;
  on: boolean;
  ready: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="notif__row">
      <span className="notif__text">
        <span className="notif__label">{row.label}</span>
        <span className="notif__hint">{row.hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={row.label}
        className="notif__switch"
        /* Inert until hydrated: a switch that visibly moves and saves nothing
           is worse than one that is briefly not ready. */
        disabled={!ready}
        onClick={onToggle}
      >
        {/*
          The button is the tap target and the track is what you see.
          globals.css sets a 48px minimum on every button — deliberately, and
          the visual suite enforces it — so styling the button itself as a
          28px pill produced a 48x48 circle with a knob sliding across it.
          The hit area stays 48px; the switch looks like a switch.
        */}
        <span className="notif__track">
          <span className="notif__knob" />
        </span>
      </button>
    </div>
  );
}
