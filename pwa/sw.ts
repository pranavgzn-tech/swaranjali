/// <reference lib="webworker" />

/**
 * Precache everything, cache-first, no network fallback. This is an
 * instrument, not a site — there is no such thing as fresh content, and it
 * must work in aeroplane mode with every feature intact (doc 12).
 *
 * Compiled straight to dist/sw.js by tsc, with no bundler and no imports, so
 * it stays a classic script. The two placeholders below are replaced by
 * scripts/gen-precache.ts after the build.
 */

const sw = self as unknown as ServiceWorkerGlobalScope;

const BUILD_HASH = '__BUILD_HASH__';
const PRECACHE: string[] = ['__PRECACHE__'];
const CACHE = `swaranjali-${BUILD_HASH}`;

sw.addEventListener('install', (event) => {
  // No skipWaiting here. Doc 12 is explicit that the app must never swap
  // itself out mid-phrase: the new worker waits until the user taps restart
  // in settings, which posts the message handled at the bottom of this file.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => sw.clients.claim()),
  );
});

sw.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== location.origin) return; // there should be none

  if (request.mode === 'navigate') {
    event.respondWith(caches.match('./index.html').then((hit) => hit ?? fetch(request)));
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});

sw.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') void sw.skipWaiting();
});
