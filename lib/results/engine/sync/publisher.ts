/**
 * Realtime fan-out.
 *
 * The shape of the whole live system: **one** server-side poller per live event
 * publishes to a channel, and every browser watching that event subscribes to
 * the channel. Load on the source is one request per event per interval whether
 * three people are watching or thirty thousand — which is the entire reason the
 * fan-out exists, and the thing the fan-out test asserts (brief §8).
 *
 * Browsers never poll the source. Not "should not": there is no code path from
 * a component to the source, because the only fetcher is server-only and gated.
 */

export type LiveUpdate = {
  eventSlug: string;
  divisionKey: string;
  /** Only rows that actually changed. An unchanged poll publishes nothing. */
  changed: {
    sourceResultId: string;
    rankOverall: number | null;
    finishTimeMs: number | null;
    athleteName: string;
  }[];
  updatedAt: string;
  /** Set when the source went away and we froze on last-good data. */
  updatesPaused?: boolean;
};

export interface RealtimePublisher {
  publish(channel: string, update: LiveUpdate): Promise<void>;
  /** Current subscriber count, for the saturation fallback. */
  subscriberCount(channel: string): Promise<number>;
}

export function channelForEvent(eventSlug: string): string {
  return `results:event:${eventSlug}`;
}

/** In-memory publisher: the test double, and the local-dev implementation. */
export class MemoryPublisher implements RealtimePublisher {
  published: { channel: string; update: LiveUpdate }[] = [];
  private subscribers = new Map<string, number>();

  async publish(channel: string, update: LiveUpdate) {
    this.published.push({ channel, update });
  }

  async subscriberCount(channel: string) {
    return this.subscribers.get(channel) ?? 0;
  }

  setSubscribers(channel: string, count: number) {
    this.subscribers.set(channel, count);
  }

  reset() {
    this.published = [];
    this.subscribers.clear();
  }
}

/**
 * Supabase Realtime ceiling for the plan. Past this, overflow clients fall back
 * to polling *our* cached API — never the source — so the board keeps updating
 * for everyone instead of the last N connections being dropped (brief §13).
 */
export const REALTIME_CONNECTION_CEILING = Number(
  process.env.RESULTS_REALTIME_CEILING ?? 200,
);

export type DeliveryMode = "realtime" | "polling";

export function deliveryModeFor(subscribers: number): DeliveryMode {
  return subscribers >= REALTIME_CONNECTION_CEILING ? "polling" : "realtime";
}
