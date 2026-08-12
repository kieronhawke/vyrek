import "server-only";

/**
 * PERSISTENT PER-PLAN PRODUCTS.
 *
 * Checkout's inline `product_data` mints a new Stripe product per session
 * and Stripe archives it immediately — which surfaced as a real failure:
 * changing a client's rate reuses the subscription item's product, and an
 * archived product refuses new prices ("marked as inactive"). Stripe's
 * auto-created products can't be reactivated either.
 *
 * So each plan gets ONE durable product, found by metadata and created on
 * first use. Checkout and rate changes both price against it, so nothing
 * downstream ever meets an archived product — and Ben's Stripe dashboard
 * shows three products, not one per sale.
 */

const cache = new Map<string, string>();

export async function ensurePlanProduct(
  planKey: string,
  name: string,
  description?: string,
): Promise<string> {
  const hit = cache.get(planKey);
  if (hit) return hit;

  const { stripe } = await import("@/lib/stripe");
  const s = stripe();

  const found = await s.products.search({
    query: `active:'true' AND metadata['suth_plan']:'${planKey}'`,
    limit: 1,
  });
  if (found.data[0]) {
    cache.set(planKey, found.data[0].id);
    return found.data[0].id;
  }

  const created = await s.products.create({
    name: `Suth Performance — ${name}`,
    ...(description ? { description } : {}),
    metadata: { suth_plan: planKey },
  });
  cache.set(planKey, created.id);
  return created.id;
}
