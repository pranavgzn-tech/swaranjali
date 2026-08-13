/**
 * Cached key rectangles and the hit test.
 *
 * Deliberately tiny and free of the DOM, because this is where the project's
 * likeliest bug lives: a stale rectangle after a rotate. There is exactly one
 * way to change the geometry — `rebuild()` — and it is called from the same
 * viewport signal that re-mounts the layout.
 */

import type { KeyId } from '../audio/voice-pool.ts';
import type { KeyLayout } from '../ui/keyboard-model.ts';

export interface KeyboardGeometry {
  /** Keyboard band origin within the stage, in points. */
  x: number;
  y: number;
  w: number;
  h: number;
  whiteW: number;
  blackW: number;
  blackH: number;
}

interface Rect {
  id: KeyId;
  x: number;
  w: number;
}

export class HitRegions {
  #geometry: KeyboardGeometry | null = null;
  #black: Rect[] = [];
  #whiteIds: KeyId[] = [];

  /** Rebuild from scratch. Called on boot and on every viewport change. */
  rebuild(geometry: KeyboardGeometry, layout: KeyLayout): void {
    this.#geometry = geometry;
    this.#whiteIds = layout.white.map((key) => key.id);
    this.#black = layout.black.map((key) => ({
      id: key.id,
      x: (key.afterWhiteIndex + 1) * geometry.whiteW - geometry.blackW / 2 + key.offset,
      w: geometry.blackW,
    }));
  }

  get geometry(): KeyboardGeometry | null {
    return this.#geometry;
  }

  /** Where a black key sits, for drawing. Same maths as the hit test. */
  blackX(index: number): number {
    return this.#black[index]?.x ?? 0;
  }

  /**
   * Which key is under a point, in stage coordinates.
   *
   * Black keys are tested first because they overlap the white keys visually.
   * No `getBoundingClientRect`, no `elementFromPoint` — both force layout and
   * cost milliseconds inside a pointer handler.
   */
  keyAt(x: number, y: number): KeyId | null {
    const g = this.#geometry;
    if (!g) return null;

    const localX = x - g.x;
    const localY = y - g.y;
    if (localY < 0 || localY > g.h || localX < 0 || localX > g.w) return null;

    if (localY <= g.blackH) {
      for (const rect of this.#black) {
        if (localX >= rect.x && localX < rect.x + rect.w) return rect.id;
      }
    }

    const index = Math.floor(localX / g.whiteW);
    return this.#whiteIds[index] ?? null;
  }
}
