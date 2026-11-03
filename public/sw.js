/* NCSR service worker (hand-written, no build step).
 *
 *  - App shell and Next.js assets: cache-first, so the app opens with no connection.
 *  - Pages (HTML): network-first with a short timeout, falling back to the cached copy.
 *  - Reference data only (facility lists): network-first, falling back to the last copy.
 *    Patient records are deliberately never stored in these caches.
 *  - Everything that writes (POST/PUT/PATCH/DELETE) goes straight to the network.
 */
const VERSION = "ncsr-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGES_CACHE = `${VERSION}-pages`;
const API_CACHE = `${VERSION}-api`;

const PRECACHE = ["/offline.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

// GET endpoints that hold reference data only. Add more here if needed.
const API_REFERENCE = [/\/facilities\/?$/, /\/services\/[^/]+\/facilities\/?$/];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("ncsr-") && !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  const type = event.data && event.data.type;
  if (type === "SKIP_WAITING") self.skipWaiting();
  if (type === "CLEAR_DATA") {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("ncsr-")).map((k) => caches.delete(k)))));
  }
});

function fetchWithTimeout(request, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    fetch(request).then(
      (res) => { clearTimeout(timer); resolve(res); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((res) => { if (res && res.ok) cache.put(request, res.clone()); return res; })
    .catch(() => undefined);
  return hit || (await network) || Response.error();
}

async function networkFirst(request, cacheName, timeoutMs, cacheKey) {
  const cache = await caches.open(cacheName);
  const key = cacheKey || request;
  try {
    const res = await fetchWithTimeout(request, timeoutMs);
    if (res && res.ok) cache.put(key, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(key, { ignoreVary: true });
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const accept = request.headers.get("accept") || "";

  // Pages. The cache key ignores the query string so /page?search=x falls back to /page.
  if (sameOrigin && (request.mode === "navigate" || accept.includes("text/html"))) {
    const key = new Request(url.origin + url.pathname);
    event.respondWith(
      networkFirst(request, PAGES_CACHE, 4000, key).catch(async () => {
        const offline = await caches.match("/offline.html");
        return offline || Response.error();
      })
    );
    return;
  }

  // Next.js build assets are content-hashed, so cache-first is safe.
  if (sameOrigin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Page data requests used by client-side navigation.
  if (sameOrigin && url.pathname.startsWith("/_next/data/")) {
    event.respondWith(networkFirst(request, PAGES_CACHE, 4000));
    return;
  }

  // Own icons, images and fonts.
  if (sameOrigin && ["image", "font", "style", "script"].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // Reference data from the API (any origin).
  if (API_REFERENCE.some((re) => re.test(url.pathname))) {
    event.respondWith(networkFirst(request, API_CACHE, 5000));
    return;
  }
});
