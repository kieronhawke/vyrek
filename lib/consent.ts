/**
 * UK GDPR cookie consent state.
 *
 * Defaults to all non-necessary categories OFF — the regulator requires
 * explicit opt-in, not opt-out. Persisted in localStorage under a versioned
 * key so we can invalidate consent when the categories change.
 */

export const CONSENT_STORAGE_KEY = "vyrek:consent:v1";

export type ConsentCategories = {
  necessary: true; // always true — cookies required for the site to function
  analytics: boolean;
  marketing: boolean;
};

export type ConsentState = {
  decided: boolean;
  categories: ConsentCategories;
  decidedAt?: string;
};

export const DEFAULT_CONSENT: ConsentState = {
  decided: false,
  categories: { necessary: true, analytics: false, marketing: false },
};

export function readConsent(): ConsentState {
  if (typeof window === "undefined") return DEFAULT_CONSENT;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return DEFAULT_CONSENT;
    const parsed = JSON.parse(raw) as ConsentState;
    return {
      ...DEFAULT_CONSENT,
      ...parsed,
      categories: { ...DEFAULT_CONSENT.categories, ...parsed.categories },
    };
  } catch {
    return DEFAULT_CONSENT;
  }
}

export function writeConsent(state: ConsentState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("vyrek:consent-changed"));
}
