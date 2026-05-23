import Stripe from "stripe";
import { siteUrl } from "@/lib/site-url";

/**
 * Lazy server-side Stripe client. Throws if STRIPE_SECRET_KEY is missing,
 * which lets routes return a meaningful error rather than crashing on import.
 */

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set, add it to.env.local (test mode: starts with sk_test_)",
    );
  }
  cached = new Stripe(key, {
    // Pin to the SDK's bundled API version. Stripe rolls these forward
    // safely; we can move to a newer version explicitly when we're ready.
    appInfo: { name: "Vyrek", url: siteUrl() },
  });
  return cached;
}

export function getStripePriceId(): string {
  const id = process.env.STRIPE_PRICE_ID_MONTHLY;
  if (!id) {
    throw new Error(
      "STRIPE_PRICE_ID_MONTHLY is not set, create a £8.99/mo Price in Stripe and add the price_... id",
    );
  }
  return id;
}

export function getStripeWebhookSecret(): string {
  const s = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is not set, copy the whsec_... from your Stripe webhook endpoint",
    );
  }
  return s;
}

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://vyrek.vercel.app";
}
