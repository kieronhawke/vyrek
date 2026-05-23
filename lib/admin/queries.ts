import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Read queries used by the admin dashboard. Each function returns either
 * `{ ok: true, data }` or `{ ok: false, reason }` so the UI can render a
 * friendly notice instead of crashing when the underlying table or
 * column is missing (e.g. before migration 0002 has been applied).
 */

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; reason: string };
type Result<T> = Ok<T> | Err;

function fail(e: unknown): Err {
  // Supabase errors are PostgrestError-shaped plain objects, not Error
  // instances — read `.message` defensively rather than instanceof-gating.
  let msg = "unknown error";
  if (typeof e === "string") msg = e;
  else if (e && typeof e === "object") {
    const anyE = e as { message?: unknown; details?: unknown; hint?: unknown };
    if (typeof anyE.message === "string" && anyE.message.length > 0) {
      msg = anyE.message;
    } else if (typeof anyE.details === "string" && anyE.details.length > 0) {
      msg = anyE.details;
    } else if (typeof anyE.hint === "string" && anyE.hint.length > 0) {
      msg = anyE.hint;
    }
  }
  return { ok: false, reason: msg };
}

// ─── Overview ───────────────────────────────────────────

export async function overviewStats(): Promise<{
  customers: Result<number>;
  trials: Result<number>;
  paid: Result<number>;
  cancelled: Result<number>;
  signupsToday: Result<number>;
  partnerPending: Result<number>;
  waitlist: Result<number>;
  mrr_pence: Result<number>;
}> {
  const sb = supabaseAdmin();
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function count(
    table: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filter?: (q: any) => any,
  ): Promise<Result<number>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = sb.from(table).select("*", { count: "exact", head: true });
      if (filter) q = filter(q);
      const { count: c, error } = await q;
      if (error) return fail(error);
      return { ok: true, data: c ?? 0 };
    } catch (e) {
      return fail(e);
    }
  }

  const [
    customers,
    trials,
    paid,
    cancelled,
    signupsToday,
    partnerPending,
    waitlist,
  ] = await Promise.all([
    count("customers"),
    count("subscriptions", (q) => q.eq("status", "trialing")),
    count("subscriptions", (q) => q.eq("status", "active")),
    count("subscriptions", (q) => q.eq("status", "canceled")),
    count("customers", (q) => q.gte("created_at", startOfToday.toISOString())),
    count("partner_applications", (q) => q.eq("status", "pending")),
    count("waitlist"),
  ]);

  // MRR = paid subscriptions × £8.99 (Phase 1 single price)
  const mrr_pence: Result<number> = paid.ok
    ? { ok: true, data: paid.data * 899 }
    : { ok: false, reason: paid.reason };

  return {
    customers,
    trials,
    paid,
    cancelled,
    signupsToday,
    partnerPending,
    waitlist,
    mrr_pence,
  };
}

export async function recentSignups(limit = 8): Promise<
  Result<
    Array<{
      id: string;
      email: string;
      created_at: string | null;
    }>
  >
> {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("customers")
      .select("id, email, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return fail(error);
    return { ok: true, data: data ?? [] };
  } catch (e) {
    return fail(e);
  }
}

// ─── Customers ──────────────────────────────────────────

export type AdminCustomer = {
  id: string;
  email: string;
  created_at: string | null;
  stripe_customer_id: string | null;
  referral_code: string | null;
};

export async function listCustomers(opts: {
  search?: string;
  limit?: number;
}): Promise<Result<AdminCustomer[]>> {
  try {
    const sb = supabaseAdmin();
    let q = sb
      .from("customers")
      .select("id, email, created_at, stripe_customer_id, referral_code")
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 50);
    if (opts.search) q = q.ilike("email", `%${opts.search}%`);
    const { data, error } = await q;
    if (error) return fail(error);
    return { ok: true, data: (data as AdminCustomer[]) ?? [] };
  } catch (e) {
    return fail(e);
  }
}

export async function getCustomer(id: string): Promise<
  Result<{
    customer: AdminCustomer;
    subscriptions: Array<{
      id: string;
      stripe_subscription_id: string | null;
      status: string;
      trial_end: string | null;
      current_period_end: string | null;
      cancelled_at: string | null;
      created_at: string | null;
    }>;
    quizResponses: Array<{
      id: string;
      program: string | null;
      created_at: string | null;
      answers: unknown;
    }>;
  }>
> {
  try {
    const sb = supabaseAdmin();
    const { data: customer, error: cErr } = await sb
      .from("customers")
      .select("id, email, created_at, stripe_customer_id, referral_code")
      .eq("id", id)
      .maybeSingle();
    if (cErr) return fail(cErr);
    if (!customer) return { ok: false, reason: "customer not found" };

    const { data: subs } = await sb
      .from("subscriptions")
      .select(
        "id, stripe_subscription_id, status, trial_end, current_period_end, cancelled_at, created_at",
      )
      .eq("customer_id", id)
      .order("created_at", { ascending: false });

    const { data: qr } = await sb
      .from("quiz_responses")
      .select("id, program, created_at, answers")
      .eq("customer_id", id)
      .order("created_at", { ascending: false });

    return {
      ok: true,
      data: {
        customer: customer as AdminCustomer,
        subscriptions: (subs ?? []) as Array<{
          id: string;
          stripe_subscription_id: string | null;
          status: string;
          trial_end: string | null;
          current_period_end: string | null;
          cancelled_at: string | null;
          created_at: string | null;
        }>,
        quizResponses: (qr ?? []) as Array<{
          id: string;
          program: string | null;
          created_at: string | null;
          answers: unknown;
        }>,
      },
    };
  } catch (e) {
    return fail(e);
  }
}

// ─── Subscriptions ──────────────────────────────────────

export type AdminSubscription = {
  id: string;
  stripe_subscription_id: string | null;
  customer_id: string | null;
  customer_email: string | null;
  status: string;
  trial_end: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string | null;
};

export async function listSubscriptions(opts: {
  status?: string;
  limit?: number;
}): Promise<Result<AdminSubscription[]>> {
  try {
    const sb = supabaseAdmin();
    let q = sb
      .from("subscriptions")
      .select(
        "id, stripe_subscription_id, customer_id, status, trial_end, current_period_end, cancelled_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 100);
    if (opts.status) q = q.eq("status", opts.status);
    const { data, error } = await q;
    if (error) return fail(error);
    const subs = (data ?? []) as AdminSubscription[];

    // Join customer emails in one extra round trip (Supabase doesn't
    // support .select() joins without FK metadata).
    const ids = Array.from(new Set(subs.map((s) => s.customer_id).filter(Boolean)));
    let emailMap = new Map<string, string>();
    if (ids.length) {
      const { data: customers } = await sb
        .from("customers")
        .select("id, email")
        .in("id", ids as string[]);
      for (const c of (customers ?? []) as Array<{ id: string; email: string }>) {
        emailMap.set(c.id, c.email);
      }
    }
    for (const s of subs) {
      s.customer_email = s.customer_id ? emailMap.get(s.customer_id) ?? null : null;
    }

    return { ok: true, data: subs };
  } catch (e) {
    return fail(e);
  }
}

// ─── Partner applications ───────────────────────────────

export type AdminApplication = {
  id: string;
  email: string;
  name: string;
  country: string;
  platform: string;
  follower_count: string;
  content_description: string;
  why_vyrek: string;
  primary_url: string;
  past_affiliate: string | null;
  promotion_methods: string[];
  status: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string | null;
};

export async function listApplications(opts: {
  status?: string;
  limit?: number;
}): Promise<Result<AdminApplication[]>> {
  try {
    const sb = supabaseAdmin();
    let q = sb
      .from("partner_applications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 100);
    if (opts.status) q = q.eq("status", opts.status);
    const { data, error } = await q;
    if (error) return fail(error);
    return { ok: true, data: (data ?? []) as AdminApplication[] };
  } catch (e) {
    return fail(e);
  }
}

export async function getApplication(
  id: string,
): Promise<Result<AdminApplication>> {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("partner_applications")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return fail(error);
    if (!data) return { ok: false, reason: "not found" };
    return { ok: true, data: data as AdminApplication };
  } catch (e) {
    return fail(e);
  }
}

// ─── Partners ───────────────────────────────────────────

export type AdminPartner = {
  id: string;
  email: string;
  name: string;
  partner_code: string;
  tier: string;
  total_referrals: number;
  active_subscribers: number;
  lifetime_earnings_pence: number;
  pending_payout_pence: number;
  suspended_at: string | null;
  created_at: string | null;
};

export async function listPartners(opts: {
  limit?: number;
}): Promise<Result<AdminPartner[]>> {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("partners")
      .select(
        "id, email, name, partner_code, tier, total_referrals, active_subscribers, lifetime_earnings_pence, pending_payout_pence, suspended_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 100);
    if (error) return fail(error);
    return { ok: true, data: (data ?? []) as AdminPartner[] };
  } catch (e) {
    return fail(e);
  }
}

export async function getPartner(id: string): Promise<
  Result<{
    partner: AdminPartner;
    referrals: Array<{
      id: string;
      customer_id: string;
      status: string;
      signed_up_at: string | null;
      first_paid_at: string | null;
      recurring_earnings_pence: number | null;
    }>;
    payouts: Array<{
      id: string;
      amount_pence: number;
      period_start: string;
      period_end: string;
      bacs_reference: string | null;
      status: string;
      paid_at: string | null;
    }>;
  }>
> {
  try {
    const sb = supabaseAdmin();
    const { data: partner, error: pErr } = await sb
      .from("partners")
      .select(
        "id, email, name, partner_code, tier, total_referrals, active_subscribers, lifetime_earnings_pence, pending_payout_pence, suspended_at, created_at",
      )
      .eq("id", id)
      .maybeSingle();
    if (pErr) return fail(pErr);
    if (!partner) return { ok: false, reason: "partner not found" };

    const { data: referrals } = await sb
      .from("partner_referrals")
      .select(
        "id, customer_id, status, signed_up_at, first_paid_at, recurring_earnings_pence",
      )
      .eq("partner_id", id)
      .order("signed_up_at", { ascending: false });

    const { data: payouts } = await sb
      .from("partner_payouts")
      .select(
        "id, amount_pence, period_start, period_end, bacs_reference, status, paid_at",
      )
      .eq("partner_id", id)
      .order("created_at", { ascending: false });

    return {
      ok: true,
      data: {
        partner: partner as AdminPartner,
        referrals: (referrals ?? []) as Array<{
          id: string;
          customer_id: string;
          status: string;
          signed_up_at: string | null;
          first_paid_at: string | null;
          recurring_earnings_pence: number | null;
        }>,
        payouts: (payouts ?? []) as Array<{
          id: string;
          amount_pence: number;
          period_start: string;
          period_end: string;
          bacs_reference: string | null;
          status: string;
          paid_at: string | null;
        }>,
      },
    };
  } catch (e) {
    return fail(e);
  }
}

// ─── Payouts ────────────────────────────────────────────

export type AdminPayout = {
  id: string;
  partner_id: string;
  amount_pence: number;
  period_start: string;
  period_end: string;
  bacs_reference: string | null;
  status: string;
  paid_at: string | null;
  created_at: string | null;
};

export async function listPayouts(opts: {
  status?: string;
}): Promise<
  Result<
    Array<AdminPayout & { partner_email: string | null; partner_name: string | null }>
  >
> {
  try {
    const sb = supabaseAdmin();
    let q = sb
      .from("partner_payouts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (opts.status) q = q.eq("status", opts.status);
    const { data, error } = await q;
    if (error) return fail(error);
    const rows = (data ?? []) as AdminPayout[];

    const ids = Array.from(new Set(rows.map((r) => r.partner_id)));
    let map = new Map<string, { email: string; name: string }>();
    if (ids.length) {
      const { data: partners } = await sb
        .from("partners")
        .select("id, email, name")
        .in("id", ids);
      for (const p of (partners ?? []) as Array<{
        id: string;
        email: string;
        name: string;
      }>) {
        map.set(p.id, { email: p.email, name: p.name });
      }
    }

    return {
      ok: true,
      data: rows.map((r) => ({
        ...r,
        partner_email: map.get(r.partner_id)?.email ?? null,
        partner_name: map.get(r.partner_id)?.name ?? null,
      })),
    };
  } catch (e) {
    return fail(e);
  }
}

// ─── Waitlist ───────────────────────────────────────────

export async function listWaitlist(opts: {
  limit?: number;
}): Promise<
  Result<
    Array<{ id: string; email: string; source: string | null; created_at: string }>
  >
> {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("waitlist")
      .select("id, email, source, created_at")
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 500);
    if (error) return fail(error);
    return {
      ok: true,
      data: (data ?? []) as Array<{
        id: string;
        email: string;
        source: string | null;
        created_at: string;
      }>,
    };
  } catch (e) {
    return fail(e);
  }
}

// ─── Quiz responses analytics ───────────────────────────

export async function quizAnalytics(): Promise<
  Result<{
    total: number;
    byProgram: Record<string, number>;
    recent: Array<{
      id: string;
      email: string;
      program: string;
      created_at: string;
    }>;
  }>
> {
  try {
    const sb = supabaseAdmin();
    const [{ count: total, error: cErr }, { data: rows, error: rErr }] =
      await Promise.all([
        sb.from("quiz_responses").select("*", { count: "exact", head: true }),
        sb
          .from("quiz_responses")
          .select("id, email, program, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
    if (cErr) return fail(cErr);
    if (rErr) return fail(rErr);

    const byProgram: Record<string, number> = {};
    for (const r of (rows ?? []) as Array<{ program: string }>) {
      const key = r.program ?? "unknown";
      byProgram[key] = (byProgram[key] ?? 0) + 1;
    }

    return {
      ok: true,
      data: {
        total: total ?? 0,
        byProgram,
        recent: ((rows ?? []) as Array<{
          id: string;
          email: string;
          program: string;
          created_at: string;
        }>).slice(0, 12),
      },
    };
  } catch (e) {
    return fail(e);
  }
}
