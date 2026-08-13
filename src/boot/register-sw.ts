/**
 * Service worker registration and the update flow.
 *
 * Cache-first means an installed app will happily run an old build forever, so
 * we watch for a waiting worker and surface it as a quiet line in settings.
 * Nothing here ever reloads the page on its own — swapping the app out
 * mid-phrase is unacceptable in an instrument (doc 12).
 */

import { Value } from '../state/store.ts';

/** True once a new build has installed and is waiting to take over. */
export const updateReady = new Value<boolean>(false);

let waiting: ServiceWorker | null = null;

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  // Dev runs unregistered: a cache-first worker in front of the dev server
  // makes every edit look like it did not happen.
  if (!import.meta.env.PROD) return;

  window.addEventListener('load', () => {
    const url = new URL('sw.js', location.href);
    void navigator.serviceWorker.register(url, { scope: './' }).then((registration) => {
      const check = (): void => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          waiting = registration.waiting;
          updateReady.set(true);
        }
      };

      check();
      registration.addEventListener('updatefound', () => {
        registration.installing?.addEventListener('statechange', check);
      });
    });
  });
}

/** Called from settings when the user chooses to restart into the new build. */
export function applyUpdate(): void {
  if (!waiting) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
  waiting.postMessage('skip-waiting');
}
