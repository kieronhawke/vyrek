"use client";

import { useMemo } from "react";
import {
  DIAL_CODES,
  dialByIso,
  flagFor,
  joinNumber,
  looksLikeNumber,
  splitNumber,
} from "@/lib/member/dial-codes";

/**
 * A phone number for somebody who might not be in Britain.
 *
 * The field was a text box with a "07…" placeholder. Ben coaches remotely, so
 * an athlete in Dublin or Bangalore typed their own number, it was stored with
 * no country code, and the first thing that tried to text them either failed
 * or — worse — reached whoever holds the UK number those digits happen to
 * match.
 *
 * The country is a select rather than a guess. We do not know where somebody
 * is: an IP lookup is wrong often enough to be annoying, and the browser's
 * locale tells you which language they read, not which network their handset
 * is on. So it defaults to the code already stored, or to the UK for a new
 * member, and it is one tap to change.
 *
 * Value in and out is a single E.164 string — `+447398790378`. The split into
 * country and digits happens for display only, so nothing downstream has to
 * care how it was typed.
 */
export function PhoneField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  /** E.164, or empty. */
  value: string;
  onChange: (next: string) => void;
}) {
  const { iso, rest } = useMemo(() => splitNumber(value), [value]);
  const valid = !rest || looksLikeNumber(iso, rest);

  return (
    <div className="phone">
      <label className="phone__label" htmlFor={id}>
        {label}
      </label>

      <div className="phone__row">
        <label className="sr-only" htmlFor={`${id}-country`}>
          Country code
        </label>
        <div className="phone__country">
          <span className="phone__flag" aria-hidden>
            {flagFor(iso)}
          </span>
          <select
            id={`${id}-country`}
            className="phone__select"
            value={iso}
            onChange={(e) => onChange(joinNumber(e.target.value, rest))}
          >
            {DIAL_CODES.map((d) => (
              <option key={d.iso} value={d.iso}>
                {d.name} {d.dial}
              </option>
            ))}
          </select>
          <span className="phone__dial" aria-hidden>
            {dialByIso(iso)?.dial}
          </span>
        </div>

        <input
          id={id}
          className="phone__input"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          /* No placeholder digits. "07…" is the assumption this component
             exists to remove, and a format hint for the wrong country is
             worse than none. */
          placeholder="Your number"
          value={rest}
          aria-invalid={!valid}
          onChange={(e) => onChange(joinNumber(iso, e.target.value))}
        />
      </div>

      {hint ? <p className="phone__hint">{hint}</p> : null}
      {!valid ? (
        <p className="phone__error">
          That does not look like a full number for {dialByIso(iso)?.name}.
        </p>
      ) : null}
    </div>
  );
}
