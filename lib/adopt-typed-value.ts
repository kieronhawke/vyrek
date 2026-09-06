"use client";

import { useEffect } from "react";

/**
 * KEEP WHAT THEY TYPED BEFORE REACT WOKE UP.
 *
 * A controlled input starts with React state of "". The markup is
 * server-rendered and a person can type into it the moment it paints — but
 * state does not attach until hydration, so anything typed in between is
 * thrown away the instant React takes over, and the field goes blank on its
 * own. Worse for anything that reads the value: a password strength meter
 * sits at "no password" while the box visibly has one in it.
 *
 * On a fast connection the window is invisible. On a phone on mobile data it
 * is comfortably long enough to type an email address into, and the symptom
 * is a form that clears itself and then complains the field is empty.
 *
 * So on mount, whatever the DOM actually holds wins.
 *
 * ── WHY IT LIVES HERE ─────────────────────────────────────────────────────
 * This was written twice, independently, in the admin login and the member
 * login, each time after the same bug was found the hard way. The third
 * place it was needed — the onboarding flow, where a client types their name,
 * email and a new password seconds before paying — did not have it, and the
 * gap showed up as a strength meter that stayed empty under load. One copy,
 * so the next form to need it can import it rather than rediscover it.
 */
export function useAdoptTypedValue(
  ref: React.RefObject<HTMLInputElement | null>,
  value: string,
  set: (v: string) => void,
) {
  useEffect(() => {
    const typed = ref.current?.value ?? "";
    if (typed && typed !== value) set(typed);
    // Mount only: after hydration React is the source of truth again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
