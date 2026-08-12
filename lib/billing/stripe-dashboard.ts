/**
 * Deep links into the Stripe Dashboard, mode-aware: a test-mode key means
 * every object lives under /test/, and a link that drops that prefix
 * 404s. One helper so no page hand-builds these.
 */
export function stripeDashboardUrl(
  kind: "customer" | "subscription" | "invoice" | "home",
  id?: string | null,
): string {
  const test = (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test")
    ? "/test"
    : "";
  const base = `https://dashboard.stripe.com${test}`;
  if (kind === "home" || !id) return base;
  const path =
    kind === "customer"
      ? "customers"
      : kind === "subscription"
        ? "subscriptions"
        : "invoices";
  return `${base}/${path}/${id}`;
}
