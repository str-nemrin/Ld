/* LD Tracker offline shell: keeps the app page on the phone so it opens without internet.
   Data itself is kept by the app (IndexedDB) and synced when the connection is back. */
const CACHE = "ld-shell-v1";
const SHELL = ["./", "./index.html"];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {}))); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.hostname === "script.google.com" || u.hostname.endsWith("googleusercontent.com")) return;   // data API: never cached here
  // the app page: network first (always the newest when online), cached copy when offline
  if (r.mode === "navigate" || (u.origin === location.origin && /\/(index\.html)?$/.test(u.pathname))) {
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", cp)).catch(() => {}); return res; })
      .catch(() => caches.match("./index.html").then(m => m || caches.match("./"))));
    return;
  }
  // fonts / libraries / other files: cached copy first, refreshed in the background
  e.respondWith(caches.match(r).then(m => { const net = fetch(r).then(res => { if (res && (res.ok || res.type === "opaque")) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)).catch(() => {}); } return res; }).catch(() => m); return m || net; }));
});
