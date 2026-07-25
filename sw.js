const CACHE = "cc-v2";
const ASSETS = ["./", "./index.html", "./manifest.json",
                "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Navigations: network-first with a short timeout so a new deploy lands without a
// cache-name bump, but a flaky connection can never hang app launch.
// Everything else stays cache-first.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.mode === "navigate") {
    e.respondWith(
      Promise.race([
        fetch(req).then(r => {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copy)).catch(() => {});
          return r;
        }),
        new Promise(res => setTimeout(() => res(null), 2000))
      ])
        .then(r => r || caches.match("./index.html").then(c => c || fetch(req)))
        .catch(() => caches.match("./index.html").then(c => c || Response.error()))
    );
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
