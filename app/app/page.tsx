import { redirect } from "next/navigation";
import { assertMember } from "@/lib/member/auth";

/**
 * /app has no screen of its own — it routes to the right home for the
 * account: training clients land on Today, billing-only clients (existing
 * clients moved onto Stripe by a payment link) land on their subscription
 * page, because Today would show them a training space the admin hasn't
 * switched on.
 */
export const dynamic = "force-dynamic";

export default async function MemberIndex() {
  const ctx = await assertMember("/app");
  redirect(ctx.memberMode === "billing" ? "/app/account" : "/app/today");
}
