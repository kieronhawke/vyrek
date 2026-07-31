/**
 * Service worker for the Train tab — docs/build-pack/spec/11 §9.
 *
 * "Full offline capability for plan viewing and workout logging."
 *
 * Without this, reopening the app offline cannot work at all: the navigation
 * request itself needs the network, so a session that survived in IndexedDB
 * is unreachable behind a browser error page. The offline test in spec/16 §2
 * step 5 — "reopen the app, still offline" — is what caught it.
 *
 * Deliberately scoped to /train only. The marketing site is server-rendered
 * and SEO-critical, and a stale cached shell there would be a far worse
 * problem than the one this solves.
 */

const CACHE = "suth-train-v2";
const SHELL = "/train";

/**
 * Caching the shell HTML alone is not enough, and the offline test proved it.
 *
 * A service worker only sees requests made *after* it controls the page. On
 * the very first visit the browser has already fetched the JS and CSS by the
 * time this worker installs, so the runtime cache-first handler below never
 * sees them and never stores them. Reopen offline and the HTML comes back
 * from cache, references chunks that were never cached, React never hydrates,
 * and the screen sits on "Loading your session…" with the workout stranded in
 * IndexedDB behind it.
 *
 * So at install we fetch the shell ourselves and precache every script and
 * stylesheet it references. Next.js hashes those filenames, which is exactly
 * why they cannot be hard-coded here — they have to be read out of the built
 * HTML at install time.
 *
 * The upshot is that one online visit to /train is enough. Previously it
 * silently took two.
 */
async function precacheShell(cache) {
  const res = await fetch(SHELL, { cache: "reload" });
  await cache.put(SHELL, res.clone());

  const html = await res.text();
  const assets = new Set();
  for (const [, url] of html.matchAll(/<script[^>]+src="([^"]+)"/g)) assets.add(url);
  for (const [, url] of html.matchAll(
    /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g,
  )) {
    assets.add(url);
  }

  // Same-origin only, and one failure must not abandon the rest: a missing
  // preload hint should not cost the user their offline app.
  await Promise.all(
    [...assets]
      .filter((u) => u.startsWith("/"))
      .map((u) => cache.add(u).catch(() => undefined)),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(precacheShell)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache the sync endpoint: a cached 200 would tell the device its
  // sets were accepted when they were not, which is the one failure mode
  // this whole subsystem exists to prevent.
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network first so the app updates, cache as the fallback
  // that makes offline reopen possible.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          void caches.open(CACHE).then((c) => c.put(SHELL, copy));
          return res;
        })
        .catch(() =>
          caches.match(SHELL).then((hit) => hit ?? Response.error()),
        ),
    );
    return;
  }

  // Static assets: cache first, since a hashed build asset never changes.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            void caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        }),
    ),
  );
});
