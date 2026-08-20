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
/** Where this worker is registered, e.g. '/swaranjali/'. */
const scopePath = new URL(sw.registration.scope).pathname;

sw.addEventListener('install', (event) => {
  // Take over as soon as the new build is cached, but *without* claiming the
  // pages already open. That combination is what doc 12 actually asks for:
  // a session in progress is never swapped out underneath the player, and the
  // next time the app is launched it is simply the new version.
  //
  // Waiting instead — for a restart the user taps in settings — sounds more
  // careful and is worse. It left a device pinned to an old build with no
  // visible sign anything was stale, which is how a feature that had shipped
  // days earlier could be reported as missing.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => sw.skipWaiting()),
  );
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
    // A navigation to a real precached page gets that page; everything else
    // falls back to the app shell. Serving index.html for *every* navigation
    // means no other page on this origin can ever be reached, including the
    // ones that exist to diagnose a broken shell.
    const path = `.${new URL(request.url).pathname.slice(scopePath.length - 1)}`;
    const target = PRECACHE.includes(path) ? path : './index.html';
    event.respondWith(caches.match(target).then((hit) => hit ?? fetch(request)));
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
