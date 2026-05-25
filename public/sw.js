const CACHE = 'matrix-v2';
const PRECACHE = ['/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(
        PRECACHE.map((url) =>
          fetch(url, { cache: 'no-cache' })
            .then((r) => (r.ok ? c.put(url, r.clone()) : null))
            .catch(() => null),
        ),
      ),
    ),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
    ]),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (!url.protocol.startsWith('http')) return;
  if (req.mode === 'navigate') return;

  e.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).catch(() => cached || Response.error()),
    ),
  );
});
