/**
 * The "Tap to begin" overlay.
 *
 * Two jobs: it is the user gesture that lets iOS start the AudioContext, and
 * it is the cover behind which the expensive setup happens — wavetables, the
 * reverb impulse and the voice pool are built here, never on the first key
 * press (doc 05).
 */

import { createContext, isRunning } from '../audio/context.ts';

/** Work to run behind the overlay, once the context exists. */
export type WarmupTask = (ctx: AudioContext) => void | Promise<void>;

export function showTapToBegin(root: HTMLElement, warmup?: WarmupTask): Promise<AudioContext> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'begin';
    overlay.innerHTML = `
      <div class="begin__inner">
        <div class="begin__mark" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="64" height="64">
            <path
              d="M32 8c-6 9-10 15-10 21a10 10 0 0 0 20 0c0-6-4-12-10-21z"
              fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" />
            <path
              d="M14 38c0 11 8 18 18 18s18-7 18-18"
              fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
          </svg>
        </div>
        <h1 class="begin__title">Swaranjali</h1>
        <p class="begin__hint">Tap to begin</p>
      </div>`;
    root.appendChild(overlay);

    const start = (event: PointerEvent): void => {
      event.preventDefault();
      overlay.removeEventListener('pointerdown', start);

      // Synchronous, inside the gesture. Anything awaited before this loses it.
      const ctx = createContext();

      const finish = (): void => {
        overlay.classList.add('begin--done');
        const remove = (): void => overlay.remove();
        overlay.addEventListener('transitionend', remove, { once: true });
        setTimeout(remove, 400); // in case the transition never fires
        resolve(ctx);
      };

      const result = warmup?.(ctx);
      if (result instanceof Promise) {
        void result.then(finish);
      } else {
        finish();
      }
    };

    overlay.addEventListener('pointerdown', start);

    // If the context somehow starts on its own, do not sit in the way.
    if (isRunning()) overlay.classList.add('begin--ready');
  });
}
