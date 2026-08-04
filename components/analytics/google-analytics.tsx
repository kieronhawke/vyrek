"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gaPageView, loadGoogleAnalytics } from "@/lib/analytics/google";

/**
 * Mounts GA4 once consent is granted, and reports client-side navigations.
 *
 * Next's App Router does not do full page loads between routes, so gtag's
 * automatic page_view fires once and then never again. Without the pathname
 * effect below, GA would report every visitor as a one-page session, which
 * is exactly the number the Activity screen is trying to get right.
 *
 * Renders nothing. Safe to mount when NEXT_PUBLIC_GA_MEASUREMENT_ID is unset:
 * loadGoogleAnalytics returns immediately and no script is injected.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    loadGoogleAnalytics();
    // The banner dispatches this when somebody accepts, so a visitor who
    // opts in mid-session starts being counted without a reload.
    const onConsent = () => loadGoogleAnalytics();
    window.addEventListener("suth:consent-changed", onConsent);
    return () => window.removeEventListener("suth:consent-changed", onConsent);
  }, []);

  useEffect(() => {
    if (pathname) gaPageView(pathname);
  }, [pathname]);

  return null;
}
