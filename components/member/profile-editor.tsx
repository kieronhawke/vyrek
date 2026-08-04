"use client";

import { useRef, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { useRecord } from "@/lib/control/store";
import { PhoneField } from "@/components/member/phone-field";
import { PhotoCropper } from "@/components/member/photo-cropper";

/**
 * THE BITS OF AN ACCOUNT AN ATHLETE CAN ACTUALLY CHANGE.
 *
 * Account was read-only. Name, photo, phone, the emergency contact — all of
 * it fixed, with no way to correct a typo made during onboarding. On the page
 * whose entire job is "this is your account".
 *
 * WHERE IT SAVES, AND WHY THE SCREEN SAYS SO
 * ------------------------------------------
 * This browser. There is no profile table yet, and a form that appears to
 * save and then loses everything on the athlete's other device is worse than
 * one that says where it is keeping things. The note under the form is not
 * an apology, it is the honest state — and it disappears on its own the day
 * the driver in lib/control/store.ts points at a database.
 *
 * THE PHOTO IS DOWNSCALED BEFORE IT IS STORED. A modern phone camera produces
 * four megabytes a shot and browser storage is measured in single-digit
 * megabytes; storing one raw would evict the food log to make room for it.
 */

export type MemberProfile = {
  displayName: string;
  phone: string;
  /** Data URL. Small, square, and never sent anywhere yet. */
  avatar: string | null;
  emergencyName: string;
  emergencyPhone: string;
};

export const PROFILE_KEY = "member.profile.v1";

const EMPTY: MemberProfile = {
  displayName: "",
  phone: "",
  avatar: null,
  emergencyName: "",
  emergencyPhone: "",
};

const AVATAR_EDGE = 256;

export function ProfileEditor({ firstName, email }: { firstName: string; email: string }) {
  const { value: stored, save } = useRecord<MemberProfile>(PROFILE_KEY, EMPTY);
  const mounted = useHydrated();
  const [draft, setDraft] = useState<MemberProfile | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement | null>(null);
  /* Held until the crop is confirmed. Centre-cropping whatever was picked is
     what this replaces: a phone photo is portrait and the face is rarely in
     the middle, so the usual result was a square of somebody's chest. */
  const [cropping, setCropping] = useState<File | null>(null);

  /* The form edits a copy. Writing every keystroke to the store would make an
     abandoned edit permanent, and there would be no way to cancel out of it. */
  const value = draft ?? { ...EMPTY, ...stored, displayName: stored.displayName || firstName };
  const dirty = draft !== null;

  function set<K extends keyof MemberProfile>(key: K, v: MemberProfile[K]) {
    setDraft({ ...value, [key]: v });
    setSaved(false);
  }

  function pickAvatar(f: File) {
    setError(null);
    setCropping(f);
  }

  if (!mounted) {
    return <p className="pe__note">Loading your details…</p>;
  }

  return (
    <div className="pe">
      <div className="pe__identity">
        <div className="pe__avatar">
          {value.avatar ? (
            /* A data URL that exists only in this browser: nothing for the
               image optimiser to do, and next/image would refuse the src. */
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={value.avatar} alt="" />
          ) : (
            <span className="pe__initials">{initials(value.displayName || firstName)}</span>
          )}
        </div>
        <div className="pe__identityActions">
          <button type="button" className="pe__btn" onClick={() => file.current?.click()}>
            {value.avatar ? "Change photo" : "Add a photo"}
          </button>
          {value.avatar ? (
            <button type="button" className="pe__btn" onClick={() => set("avatar", null)}>
              Remove
            </button>
          ) : null}
          <input
            ref={file}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickAvatar(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {error ? <p className="pe__error">{error}</p> : null}

      <div className="pe__fields">
        <label className="pe__field">
          <span>Name</span>
          <input
            className="pe__input"
            value={value.displayName}
            onChange={(e) => set("displayName", e.target.value)}
            autoComplete="name"
          />
        </label>

        <label className="pe__field">
          <span>Email</span>
          {/* Not editable here on purpose: it is the login. Changing it has to
              go through a verification the app cannot do yet, and a box that
              silently fails to change your login is worse than no box. */}
          <input className="pe__input" value={email} readOnly disabled />
          <small>This is your login. Message Ben to change it.</small>
        </label>

        <PhoneField
          id="pe-phone"
          label="Mobile"
          hint="Used for session reminders and to confirm a booked call."
          value={value.phone}
          onChange={(next) => set("phone", next)}
        />

        <label className="pe__field">
          <span>Emergency contact</span>
          <input
            className="pe__input"
            placeholder="Name"
            value={value.emergencyName}
            onChange={(e) => set("emergencyName", e.target.value)}
          />
        </label>

        <PhoneField
          id="pe-emergency"
          label="Their number"
          value={value.emergencyPhone}
          onChange={(next) => set("emergencyPhone", next)}
        />
      </div>

      <div className="pe__actions">
        <button
          type="button"
          className="pe__save"
          disabled={!dirty}
          onClick={() => {
            save(value);
            setDraft(null);
            setSaved(true);
          }}
        >
          {saved && !dirty ? "Saved" : "Save changes"}
        </button>
        {dirty ? (
          <button type="button" className="pe__btn" onClick={() => setDraft(null)}>
            Discard
          </button>
        ) : null}
      </div>

      {cropping ? (
        <PhotoCropper
          file={cropping}
          onCancel={() => setCropping(null)}
          onDone={(dataUrl) => {
            set("avatar", dataUrl);
            setCropping(null);
          }}
        />
      ) : null}

      <p className="pe__note">
        Saved on this device. It will move to your account, and follow you
        between devices, once the database is connected.
      </p>
    </div>
  );
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase() || "?"
  );
}

