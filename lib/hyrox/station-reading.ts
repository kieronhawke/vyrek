/**
 * Blog posts that belong to each station page.
 *
 * Written 2026-08-03 after an internal-link audit found the eight station
 * pages linked to no blog post at all, leaving 23 posts with zero inbound
 * links from anywhere on the site. The station pages are the natural parent
 * for the per-station writing, so the links belong here rather than being
 * sprinkled through prose.
 *
 * Slugs are resolved against listPostMeta() by the caller and any that are
 * not live are dropped, so an entry here for a post that does not exist yet
 * is harmless. It is a placeholder, not a broken link.
 */
export const STATION_READING: Record<string, string[]> = {
  "ski-erg": [
    "hyrox-ski-erg-technique",
    "skierg-mistakes-whats-costing-you-60-seconds",
    "5-workouts-that-build-a-faster-hyrox-skierg",
  ],
  "sled-push": [
    "hyrox-sled-push-technique",
    "sled-push-mistakes-whats-costing-you-60-seconds",
    "hyrox-sled-push-weight-standards-by-division-and-how-it-feels",
    "5-workouts-that-build-a-faster-hyrox-sled-push",
  ],
  "sled-pull": [
    "hyrox-sled-pull-technique",
    "sled-pull-mistakes-whats-costing-you-60-seconds",
    "5-workouts-that-build-a-faster-hyrox-sled-pull",
  ],
  "burpee-broad-jumps": [
    "hyrox-burpee-broad-jump-technique",
    "burpee-broad-jump-mistakes-whats-costing-you-60-seconds",
    "5-workouts-that-build-a-faster-hyrox-burpee-broad-jump",
  ],
  rowing: [
    "hyrox-rowing-strategy",
    "rowing-mistakes-whats-costing-you-60-seconds",
    "5-workouts-that-build-a-faster-hyrox-rowing",
  ],
  "farmers-carry": [
    "hyrox-farmers-carry-strategy",
    "farmers-carry-mistakes-whats-costing-you-60-seconds",
    "5-workouts-that-build-a-faster-hyrox-farmers-carry",
  ],
  "sandbag-lunges": [
    "hyrox-sandbag-lunges-technique",
    "sandbag-lunges-mistakes-whats-costing-you-60-seconds",
    "5-workouts-that-build-a-faster-hyrox-sandbag-lunges",
  ],
  "wall-balls": [
    "wall-balls-scaling-technique",
    "wall-balls-mistakes-whats-costing-you-60-seconds",
    "5-workouts-that-build-a-faster-hyrox-wall-balls",
  ],
};
