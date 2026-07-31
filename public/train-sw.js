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

const CACHE = "suth-train-v1";
const SHELL = "/train";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(SHELL)).then(() => self.skipWaiting()),
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
