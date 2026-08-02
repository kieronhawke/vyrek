/**
 * The two things standing between this engine and getting our IP blocked:
 * a global outbound budget and a circuit breaker.
 *
 * Both are deliberately *global* rather than per-event. A busy weekend can have
 * five events live at once; five pollers each politely doing one request per
 * 20 seconds is fifteen requests a minute from one IP, which is not what any of
 * them thought they were doing. The budget is the only place that knows the
 * total, so it is the only place that can hold the line (brief §13).
 *
 * Clock, sleep and jitter are injected so the tests are deterministic — a
 * rate-limiter tested with real timers is a flaky test, and a flaky test on a
 * safety mechanism gets deleted eventually.
 */

export type GuardDeps = {
  now: () => number;
  /** 0..1. Injected so jitter is reproducible in tests. */
  random: () => number;
};

export const defaultDeps: GuardDeps = {
  now: () => Date.now(),
  random: () => Math.random(),
};

/* ── Global outbound budget ─────────────────────────────────────────── */

export type BudgetOptions = {
  /** Hard ceiling on requests to the source in any rolling window. */
  maxRequests: number;
  windowMs: number;
};

export const DEFAULT_BUDGET: BudgetOptions = {
  maxRequests: Number(process.env.HYROX_MAX_REQUESTS_PER_MINUTE ?? 20),
  windowMs: 60_000,
};

export class OutboundBudget {
  private stamps: number[] = [];

  constructor(
    private opts: BudgetOptions = DEFAULT_BUDGET,
    private deps: GuardDeps = defaultDeps,
  ) {}

  private prune() {
    const cutoff = this.deps.now() - this.opts.windowMs;
    this.stamps = this.stamps.filter((t) => t > cutoff);
  }

  /** Requests still available in the current window. */
  remaining(): number {
    this.prune();
    return Math.max(0, this.opts.maxRequests - this.stamps.length);
  }

  /** Consumes one slot. False means the caller must not fetch. */
  tryConsume(): boolean {
    this.prune();
    if (this.stamps.length >= this.opts.maxRequests) return false;
    this.stamps.push(this.deps.now());
    return true;
  }

  /**
   * How long to wait for the next slot, with jitter so several pollers
   * releasing at once do not all fire on the same millisecond.
   */
  msUntilSlot(): number {
    this.prune();
    if (this.stamps.length < this.opts.maxRequests) return 0;
    const oldest = Math.min(...this.stamps);
    const base = oldest + this.opts.windowMs - this.deps.now();
    return Math.max(0, base) + Math.floor(this.deps.random() * 1000);
  }

  reset() {
    this.stamps = [];
  }
}

/* ── Circuit breaker ────────────────────────────────────────────────── */

export type BreakerState = "closed" | "open" | "half-open";

export type BreakerOptions = {
  /** Failures within the window before the breaker trips. */
  failureThreshold: number;
  windowMs: number;
  /** How long to stay open before allowing one probe through. */
  cooldownMs: number;
};

export const DEFAULT_BREAKER: BreakerOptions = {
  failureThreshold: Number(process.env.HYROX_BREAKER_THRESHOLD ?? 5),
  windowMs: 120_000,
  cooldownMs: Number(process.env.HYROX_BREAKER_COOLDOWN_MS ?? 300_000),
};

export class CircuitBreaker {
  private failures: number[] = [];
  private openedAt: number | null = null;
  private halfOpenInFlight = false;

  constructor(
    private opts: BreakerOptions = DEFAULT_BREAKER,
    private deps: GuardDeps = defaultDeps,
  ) {}

  state(): BreakerState {
    if (this.openedAt === null) return "closed";
    if (this.deps.now() - this.openedAt >= this.opts.cooldownMs) return "half-open";
    return "open";
  }

  /** False means do not fetch: the breaker is open. */
  canRequest(): boolean {
    const state = this.state();
    if (state === "closed") return true;
    if (state === "open") return false;
    // Half-open lets exactly one probe through; a second concurrent caller
    // still waits, or a stampede would hit the source the moment it recovers.
    if (this.halfOpenInFlight) return false;
    this.halfOpenInFlight = true;
    return true;
  }

  recordSuccess() {
    this.failures = [];
    this.openedAt = null;
    this.halfOpenInFlight = false;
  }

  recordFailure() {
    const now = this.deps.now();
    this.halfOpenInFlight = false;
    if (this.openedAt !== null) {
      // A failed half-open probe re-opens for a fresh cooldown.
      this.openedAt = now;
      return;
    }
    this.failures = this.failures.filter((t) => t > now - this.opts.windowMs);
    this.failures.push(now);
    if (this.failures.length >= this.opts.failureThreshold) {
      this.openedAt = now;
    }
  }

  reset() {
    this.failures = [];
    this.openedAt = null;
    this.halfOpenInFlight = false;
  }
}

/* ── Backoff ────────────────────────────────────────────────────────── */

/**
 * Exponential with full jitter. `Retry-After` always wins when the source
 * sends one, because an explicit instruction beats our guess.
 */
export function backoffDelayMs(
  attempt: number,
  retryAfterSeconds: number | null,
  deps: GuardDeps = defaultDeps,
  baseMs = 1000,
  capMs = 60_000,
): number {
  if (retryAfterSeconds !== null && Number.isFinite(retryAfterSeconds)) {
    return Math.max(0, retryAfterSeconds * 1000);
  }
  const exponential = Math.min(capMs, baseMs * 2 ** Math.max(0, attempt));
  return Math.floor(deps.random() * exponential);
}

/** `Retry-After` is either seconds or an HTTP date. Both appear in the wild. */
export function parseRetryAfter(header: string | null, now = Date.now()): number | null {
  if (!header) return null;
  const asNumber = Number(header);
  if (Number.isFinite(asNumber)) return Math.max(0, asNumber);
  const asDate = Date.parse(header);
  if (Number.isNaN(asDate)) return null;
  return Math.max(0, Math.round((asDate - now) / 1000));
}
