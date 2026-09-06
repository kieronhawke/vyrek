"use client";

import { useId, useRef, useState } from "react";
import { MIN_PASSWORD_LENGTH, scorePassword } from "@/lib/password-strength";
import { useAdoptTypedValue } from "@/lib/adopt-typed-value";

/**
 * The bar and the sentence, without the input.
 *
 * Exported because the quiz account screen already has its own field and
 * show/hide control in a different visual language; it needs the meter, not
 * a second opinion about how a text input should look. One implementation
 * either way, so the two screens can never disagree about what "Strong"
 * means.
 */
export function PasswordMeter({
  value,
  personal = [],
  id,
  className = "",
}: {
  value: string;
  personal?: (string | null | undefined)[];
  /** Ties the live region to the input via aria-describedby. */
  id?: string;
  className?: string;
}) {
  const strength = scorePassword(value, personal);
  return (
    <>
      <div
        className="pw-meter"
        data-score={value.length === 0 ? 0 : strength.score}
        aria-hidden
      >
        <span /><span /><span /><span />
      </div>
      <p id={id} className={`pw-say ${className}`} aria-live="polite">
        {value.length === 0 ? (
          <span className="pw-quiet">
            At least {MIN_PASSWORD_LENGTH} characters. A few words you will
            remember beats something complicated.
          </span>
        ) : (
          <>
            <span className="pw-label" data-score={strength.score}>
              {strength.label}
            </span>
            {/* A separator, because "Good" running straight into "Length is
                what counts most" reads as one broken phrase. */}
            <span className="pw-quiet" aria-hidden> · </span>
            <span className="pw-quiet">
              {strength.hint ?? "That will do nicely."}
            </span>
          </>
        )}
      </p>
    </>
  );
}

/**
 * A PASSWORD BOX THAT HELPS RATHER THAN JUDGES.
 *
 * Four segments that fill as it gets stronger, a word for where they are, and
 * one line saying what would improve it. Plus a Show control, because the
 * commonest reason somebody abandons a password field on a phone is that they
 * cannot see what the autocorrect did to it.
 *
 * ── WHY THE METER IS ADVISORY ─────────────────────────────────────────────
 * Only the eight-character minimum blocks the button, and that is the rule
 * the server already enforces. Everything else encourages. A form that
 * demands a symbol at the moment somebody is about to hand over a card loses
 * more clients than it saves accounts, and the score it forces is not even
 * the strongest one available — length beats punctuation. See
 * lib/password-strength.ts.
 *
 * ── IT ANNOUNCES ITSELF PROPERLY ──────────────────────────────────────────
 * The meter is `aria-hidden` and the same information is in a live region as
 * words, so a screen reader hears "Fair. Length is what counts most" rather
 * than four unlabelled divs. The bar is never the only carrier of meaning:
 * every state has text beside it, which is also what makes it work for the
 * one in twelve men who cannot tell the red segment from the green one.
 */
export function PasswordField({
  value,
  onChange,
  label = "Choose a password",
  /** Their name and email, so the meter can object to a password made of them. */
  personal = [],
  /** The host's own input styling — `ob-input` in onboarding, Tailwind elsewhere. */
  inputClassName = "",
  labelClassName = "",
  hintClassName = "",
  fieldClassName = "",
  autoFocus = false,
  name = "password",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  personal?: (string | null | undefined)[];
  inputClassName?: string;
  labelClassName?: string;
  hintClassName?: string;
  fieldClassName?: string;
  autoFocus?: boolean;
  name?: string;
}) {
  const [shown, setShown] = useState(false);
  const id = useId();
  /* Somebody who starts typing before the page finishes waking up keeps what
     they typed, and the meter reads it. Without this the box visibly holds a
     password while the meter insists there is none. */
  const inputRef = useRef<HTMLInputElement>(null);
  useAdoptTypedValue(inputRef, value, onChange);

  return (
    <div className={fieldClassName}>
      <div className="pw-head">
        <label htmlFor={id} className={labelClassName}>
          {label}
        </label>
        {/* Only once there is something to look at. An empty field with a
            Show button beside it is a control that does nothing. */}
        {value.length > 0 ? (
          <button
            type="button"
            className="pw-toggle"
            onClick={() => setShown((s) => !s)}
            aria-pressed={shown}
          >
            {shown ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>

      <div className="pw-wrap">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={shown ? "text" : "password"}
          /* new-password, not current-password: this tells a password manager
             to OFFER a generated one rather than trying to fill an old one. */
          autoComplete="new-password"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClassName}
          aria-describedby={`${id}-say`}
        />
      </div>

      <PasswordMeter
        value={value}
        personal={personal}
        id={`${id}-say`}
        className={hintClassName}
      />
    </div>
  );
}
