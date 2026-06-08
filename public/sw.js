const CACHE_VERSION = 'moneda-pwa-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  '/offline.html',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/moico-192.png',
  '/moico-512.png',
  '/moico-maskable-512.png',
  '/moico-monochrome-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('moneda-pwa-') && !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (
    url.pathname.startsWith('/api/') ||
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    request.destination === '' ||
    url.pathname.startsWith('/_next/data/')
  ) {
    if (request.mode === 'navigate') {
      event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
    }
    return;
  }

  if (
    url.pathname.startsWith('/_next/static/') ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'manifest'
  ) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const fresh = fetch(request)
    .then((response) => {
      if (response.ok && isPublicStaticResponse(request, response)) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fresh;
}

function isPublicStaticResponse(request, response) {
  const url = new URL(request.url);
  const contentType = response.headers.get('content-type') || '';
  return (
    url.pathname.startsWith('/_next/static/') ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'manifest' ||
    contentType.startsWith('image/') ||
    contentType.includes('font') ||
    contentType.includes('javascript') ||
    contentType.includes('css')
  );
}
