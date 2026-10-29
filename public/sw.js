/* Stay Focused service worker — offline shell, cached model, no user data. */
const VERSION = "stay-focused-v2";
const SHELL = [
  "/",
  "/dashboard",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

function isCacheableAsset(url) {
  if (url.origin !== self.location.origin) return false;

  if (url.pathname.startsWith("/_next/static/")) {
    // Production chunks are immutable by URL, so caching them is free speed.
    // Dev chunks keep the same name across rebuilds, so caching them would
    // hand back stale code after every change — never cache them locally.
    const host = self.location.hostname;
    const local = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
    return !local;
  }

  return (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/mediapipe/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (isCacheableAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const dashboard = await caches.match("/dashboard");
          if (dashboard) return dashboard;
          return (await caches.match("/offline")) || Response.error();
        }),
    );
  }
});
