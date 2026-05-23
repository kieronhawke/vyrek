"use client";

import { readConsent } from "@/lib/consent";

/**
 * Lazy, consent-gated PostHog wrapper. `posthog-js` is ~124KB minified,
 * we don't want it blocking the initial quiz bundle. Init happens the first
 * time capture()/identify() fires AND analytics consent is granted; earlier
 * calls are queued. If consent is denied, calls are silently dropped.
 *
 * Falls back to no-op when env vars are missing (dev without keys, preview
 * deploys without secrets).
 */

type PostHog = typeof import("posthog-js").default;
let posthog: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;
let initFailed = false;

type QueuedCall =
  | { type: "capture"; event: string; properties?: Record<string, unknown> }
  | { type: "identify"; distinctId: string; properties?: Record<string, unknown> }
  | { type: "reset" };

const queue: QueuedCall[] = [];

function consented(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const c = readConsent();
    return c.decided && c.categories.analytics === true;
  } catch {
    return false;
  }
}

// Listen for consent changes, flush the queue if the user just opted in,
// or wipe state if they opted out.
if (typeof window !== "undefined") {
  window.addEventListener("vyrek:consent-changed", () => {
    if (consented() && !posthog) {
      void loadPostHog();
    } else if (!consented() && posthog) {
      try {
        posthog.opt_out_capturing();
      } catch {
        /* noop */
      }
    } else if (consented() && posthog) {
      try {
        posthog.opt_in_capturing();
      } catch {
        /* noop */
      }
    }
  });
}

async function loadPostHog(): Promise<PostHog | null> {
  if (posthog) return posthog;
  if (initFailed) return null;
  if (loading) return loading;
  if (typeof window === "undefined") return null;
  if (!consented()) return null;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.posthog.com";

  if (!key) {
    initFailed = true;
    if (process.env.NODE_ENV !== "production") {
       
      console.info(
        "[posthog] NEXT_PUBLIC_POSTHOG_KEY not set, analytics disabled",
      );
    }
    return null;
  }

  loading = (async () => {
    try {
      const mod = await import("posthog-js");
      const ph = mod.default;
      ph.init(key, {
        api_host: host,
        capture_pageview: true,
        capture_pageleave: true,
        persistence: "localStorage+cookie",

        // Session replay (consent-gated by loadPostHog, only fires after
        // analytics consent). Inputs masked by default; email/password
        // selectors explicitly masked. Cross-origin iframes excluded.
        disable_session_recording: false,
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: "[data-mask], input[type='email'], input[type='password']",
          recordCrossOriginIframes: false,
        },

        // Autocapture on. Vyrek's UI is link-and-button heavy and we want
        // heatmaps + element-level drop-off without instrumenting every CTA.
        // `data-mask` on a node opts that subtree out.
        autocapture: {
          dom_event_allowlist: ["click", "change", "submit"],
          element_attribute_ignorelist: ["data-mask"],
        },

        // Privacy: respect Do Not Track.
        respect_dnt: true,
      });
      posthog = ph;
      // Drain queue
      while (queue.length) {
        const call = queue.shift();
        if (!call) break;
        try {
          if (call.type === "capture") ph.capture(call.event, call.properties);
          else if (call.type === "identify")
            ph.identify(call.distinctId, call.properties);
          else if (call.type === "reset") ph.reset();
        } catch {
          /* swallow */
        }
      }
      return ph;
    } catch (err) {
      initFailed = true;
       
      console.warn("[posthog] dynamic import failed", err);
      return null;
    } finally {
      loading = null;
    }
  })();

  return loading;
}

export type CaptureProperties = Record<string, unknown>;

export function capture(event: string, properties?: CaptureProperties) {
  if (typeof window === "undefined") return;
  if (posthog) {
    try {
      posthog.capture(event, properties);
    } catch (err) {
       
      console.warn("[posthog] capture failed", err);
    }
    return;
  }
  if (initFailed) return;
  // Without consent, drop the event, we don't queue it, since the user
  // hasn't opted in yet. Once they consent, we start capturing forward only.
  if (!consented()) return;
  queue.push({ type: "capture", event, properties });
  void loadPostHog();
}

export function identify(distinctId: string, properties?: CaptureProperties) {
  if (typeof window === "undefined") return;
  if (posthog) {
    try {
      posthog.identify(distinctId, properties);
    } catch (err) {
       
      console.warn("[posthog] identify failed", err);
    }
    return;
  }
  if (initFailed) return;
  if (!consented()) return;
  queue.push({ type: "identify", distinctId, properties });
  void loadPostHog();
}

export function reset() {
  if (typeof window === "undefined") return;
  if (posthog) {
    try {
      posthog.reset();
    } catch {
      /* noop */
    }
    return;
  }
  queue.push({ type: "reset" });
}
