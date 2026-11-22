// Retire the cached game shell at the former project address. Existing tabs
// keep access to their original assets until their next navigation.
const OLD = "/ai/";
const CURRENT = "/gomoku-studio/";

self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("message", event => {
  if (event.data?.type === "offline-status") {
    event.source?.postMessage({ type: "app-status", version: "2026.11.22.5", shell: true, offline: false });
  }
});
self.addEventListener("fetch", event => {
  const { request } = event;
  const target = new URL(request.url);
  if (request.method !== "GET" || target.origin !== self.location.origin || !target.pathname.startsWith(OLD)) return;
  if (target.pathname === OLD + "backup.html" || target.pathname === OLD + "backup.js") return;

  if (request.mode === "navigate" || target.pathname === OLD + "content/feed.json") {
    target.pathname = CURRENT + target.pathname.slice(OLD.length);
    event.respondWith(Response.redirect(target.href, 302));
    return;
  }

  event.respondWith((async () => {
    for (const cacheName of await caches.keys()) {
      if (!cacheName.startsWith("gomoku-shell:/ai/:") && !cacheName.startsWith("gomoku-rapfi:/ai/:")) continue;
      const cached = await (await caches.open(cacheName)).match(request);
      if (cached) return cached;
    }
    return fetch(request);
  })());
});
