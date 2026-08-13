/**
 * One set of pointer listeners for the whole keyboard.
 *
 * Pointer Events only, tracked by `pointerId`, hit-tested by maths. No
 * `setPointerCapture`: capture would send every move back to the element that
 * received the down event, which breaks glissando — the slide across keys that
 * makes meend-like phrases possible.
 *
 * A stuck droning note is the worst bug this app can have, so every path that
 * can end a touch — up, cancel, leaving the keyboard, backgrounding, rotation
 * — releases.
 */

import type { KeyId } from '../audio/voice-pool.ts';
import type { HitRegions } from './hit-regions.ts';

export interface PointerRouterCallbacks {
  noteOn(key: KeyId): void;
  noteOff(key: KeyId): void;
  /** Visual feedback only — never anything that costs layout. */
  setPressed(key: KeyId, pressed: boolean): void;
}

export class PointerRouter {
  readonly #active = new Map<number, KeyId>();
  readonly #regions: HitRegions;
  readonly #callbacks: PointerRouterCallbacks;
  /** Stage origin in client coordinates — the safe-area insets, cached. */
  #originX = 0;
  #originY = 0;

  /** Rolling average of pointerdown -> schedule, for the diagnostics panel. */
  #latencySum = 0;
  #latencyCount = 0;

  constructor(regions: HitRegions, callbacks: PointerRouterCallbacks) {
    this.#regions = regions;
    this.#callbacks = callbacks;
  }

  get averageLatencyMs(): number {
    return this.#latencyCount === 0 ? 0 : this.#latencySum / this.#latencyCount;
  }

  /**
   * @param origin where the stage's content box starts in client coordinates.
   *   It is the safe-area inset, already known from the viewport measurement,
   *   so no element has to be measured inside a pointer handler.
   */
  attach(element: HTMLElement, origin: { x: number; y: number }): () => void {
    this.#originX = origin.x;
    this.#originY = origin.y;
    const down = (event: PointerEvent): void => this.#down(event);
    const move = (event: PointerEvent): void => this.#move(event);
    const up = (event: PointerEvent): void => this.#up(event);

    element.addEventListener('pointerdown', down);
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', up);
    element.addEventListener('pointerleave', up);

    return () => {
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', up);
      element.removeEventListener('pointerleave', up);
      this.releaseAll();
    };
  }

  /** Release everything — panic, interruption, rotation. */
  releaseAll(): void {
    for (const key of this.#active.values()) {
      this.#callbacks.noteOff(key);
      this.#callbacks.setPressed(key, false);
    }
    this.#active.clear();
  }

  #down(event: PointerEvent): void {
    const started = performance.now();
    const key = this.#regions.keyAt(event.clientX - this.#originX, event.clientY - this.#originY);
    if (key === null) return;

    event.preventDefault();
    this.#active.set(event.pointerId, key);
    this.#callbacks.noteOn(key);
    this.#callbacks.setPressed(key, true);

    this.#latencySum += performance.now() - started;
    this.#latencyCount++;
  }

  #move(event: PointerEvent): void {
    const current = this.#active.get(event.pointerId);
    if (current === undefined) return;

    const key = this.#regions.keyAt(event.clientX - this.#originX, event.clientY - this.#originY);

    if (key === null) {
      // Slid off the keyboard: release rather than hold a note the finger has
      // left behind.
      this.#callbacks.noteOff(current);
      this.#callbacks.setPressed(current, false);
      this.#active.delete(event.pointerId);
      return;
    }

    if (key === current) return;

    // Glissando: off the old key and on to the new one in the same tick.
    this.#callbacks.noteOff(current);
    this.#callbacks.setPressed(current, false);
    this.#callbacks.noteOn(key);
    this.#callbacks.setPressed(key, true);
    this.#active.set(event.pointerId, key);
  }

  #up(event: PointerEvent): void {
    const key = this.#active.get(event.pointerId);
    if (key === undefined) return;
    this.#callbacks.noteOff(key);
    this.#callbacks.setPressed(key, false);
    this.#active.delete(event.pointerId);
  }
}
